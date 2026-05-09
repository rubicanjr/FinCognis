import { createHash } from "node:crypto";
import {
  CALENDAR_TTL_SECONDS,
  apiEventToCacheEvent,
  buildCalendarCacheKey,
  cacheEventToApiEvent,
  createWorkerState,
  getCalendarCachePort,
  type CachePayload,
  type CachePort,
} from "@/lib/economic-calendar/cache-port";
import {
  type EconomicEvent,
  EconomicEventSchema,
  type EconomicMirrorStatus,
  type EconomicRange,
  type EconomicTab,
} from "@/lib/economic-calendar/schema";
import { fetchCalendarEvents as fetchLegacyCalendarEvents } from "@/lib/economic-calendar/mirror";
import { FinnhubError, logFinnhubError, mapHttpToFinnhubError } from "@/lib/api/finnhub-errors";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const ISTANBUL_TZ = "Europe/Istanbul";
const LIVE_TTL_SECONDS = 15 * 60;
const LKG_TTL_SECONDS = 24 * 60 * 60;

type CalendarSource = "finnhub" | "legacy_adapter" | "cache";

export interface CalendarPayloadMetadata {
  stale_age_seconds: number;
  next_sync_permitted_at: string;
  reason_code?: string;
  is_lkg?: boolean;
}

export interface CalendarFetchResult {
  status: EconomicMirrorStatus;
  tab: EconomicTab;
  range: EconomicRange;
  updatedAt: string | null;
  events: EconomicEvent[];
  message: string | null;
  source: CalendarSource;
  reason: string | null;
  metadata: CalendarPayloadMetadata;
}

interface CalendarClientDependencies {
  fetchImpl?: typeof fetch;
  cachePort?: CachePort | null;
  now?: () => Date;
  symbol?: string | null;
}

interface DateRange {
  from: string;
  to: string;
}

function createId(values: string[]): string {
  return createHash("sha1").update(values.join("|")).digest("hex").slice(0, 16);
}

function toYmd(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function resolveRange(range: EconomicRange, now: Date): DateRange {
  const today = toYmd(now);
  if (range === "yesterday") {
    const day = toYmd(addDays(now, -1));
    return { from: day, to: day };
  }
  if (range === "tomorrow") {
    const day = toYmd(addDays(now, 1));
    return { from: day, to: day };
  }
  if (range === "week") {
    return { from: today, to: toYmd(addDays(now, 6)) };
  }
  return { from: today, to: today };
}

function readFinnhubApiKey(): string | null {
  const key = process.env.FINNHUB_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

function readCachePort(deps: CalendarClientDependencies): CachePort | null {
  if (deps.cachePort !== undefined) return deps.cachePort;
  try {
    return getCalendarCachePort();
  } catch {
    return null;
  }
}

function fromCacheEvents(cached: Awaited<ReturnType<CachePort["get"]>>): EconomicEvent[] {
  if (!cached || cached.data.length === 0) return [];
  return cached.data.map(cacheEventToApiEvent);
}

function toCachePayload(events: EconomicEvent[], workerStatus: CachePayload["workerStatus"]["status"] = "SUCCESS"): CachePayload {
  return {
    lastUpdated: Date.now(),
    data: events.map(apiEventToCacheEvent),
    workerStatus: createWorkerState(workerStatus),
    isFallbackData: workerStatus !== "SUCCESS",
  };
}

function staleAgeSeconds(lastUpdated: number | null): number {
  if (!lastUpdated) return -1;
  return Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000));
}

function metadata(lastUpdated: number | null, reasonCode?: string, isLkg?: boolean, retryAfterSeconds = 60): CalendarPayloadMetadata {
  return {
    stale_age_seconds: staleAgeSeconds(lastUpdated),
    next_sync_permitted_at: new Date(Date.now() + retryAfterSeconds * 1000).toISOString(),
    ...(reasonCode ? { reason_code: reasonCode } : {}),
    ...(typeof isLkg === "boolean" ? { is_lkg: isLkg } : {}),
  };
}

function toImpactScore(value: unknown): 1 | 2 | 3 {
  if (typeof value === "number") {
    if (value >= 3) return 3;
    if (value === 2) return 2;
    return 1;
  }
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("high")) return 3;
  if (normalized.includes("medium")) return 2;
  return 1;
}

function toImpactLevel(score: 1 | 2 | 3): "High" | "Medium" | "Low" {
  if (score === 3) return "High";
  if (score === 2) return "Medium";
  return "Low";
}

function apiUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${FINNHUB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function fetchJson(fetchImpl: typeof fetch, url: string): Promise<unknown> {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    const bodyPreview = await response.text().catch(() => "");
    throw mapHttpToFinnhubError({ endpoint: url, status: response.status, bodyPreview: bodyPreview.slice(0, 500) });
  }

  return response.json().catch(() => {
    throw new FinnhubError({ code: "FINNHUB_PARSE_ERROR", message: "Finnhub response is not valid JSON.", endpoint: url });
  });
}

function mapEconomicRows(rows: unknown[], range: DateRange): EconomicEvent[] {
  return rows
    .map((row, index) => {
      const item = row as Record<string, unknown>;
      const eventTitle = String(item.event ?? item.indicator ?? "").trim();
      if (!eventTitle) return null;
      const score = toImpactScore(item.impact ?? item.importance);
      const timeRaw = String(item.time ?? item.date ?? `${range.from}T00:00:00Z`);
      return EconomicEventSchema.parse({
        id: createId(["economic", eventTitle, timeRaw, String(index)]),
        time: new Date(timeRaw).toISOString(),
        currency: String(item.country ?? "-"),
        importance: score,
        eventTitle,
        actual: item.actual == null ? null : String(item.actual),
        forecast: item.estimate == null ? null : String(item.estimate),
        previous: item.prev == null ? null : String(item.prev),
        impactLevel: toImpactLevel(score),
      });
    })
    .filter((x): x is EconomicEvent => x !== null);
}

function mapIpoRows(rows: unknown[]): EconomicEvent[] {
  return rows
    .map((row, index) => {
      const item = row as Record<string, unknown>;
      const name = String(item.name ?? item.symbol ?? "").trim();
      if (!name) return null;
      const date = String(item.date ?? new Date().toISOString());
      return EconomicEventSchema.parse({
        id: createId(["ipo", name, date, String(index)]),
        time: new Date(date).toISOString(),
        currency: "-",
        importance: 2,
        eventTitle: `IPO: ${name}`,
        actual: item.price == null ? null : String(item.price),
        forecast: null,
        previous: null,
        impactLevel: "Medium",
      });
    })
    .filter((x): x is EconomicEvent => x !== null);
}

function mapDividendRows(rows: unknown[]): EconomicEvent[] {
  return rows
    .map((row, index) => {
      const item = row as Record<string, unknown>;
      const symbol = String(item.symbol ?? "").trim();
      if (!symbol) return null;
      const exDate = String(item.exDate ?? item.paymentDate ?? new Date().toISOString());
      return EconomicEventSchema.parse({
        id: createId(["dividend", symbol, exDate, String(index)]),
        time: new Date(exDate).toISOString(),
        currency: symbol,
        importance: 2,
        eventTitle: `${symbol} Temettü`,
        actual: item.amount == null ? null : String(item.amount),
        forecast: null,
        previous: null,
        impactLevel: "Medium",
      });
    })
    .filter((x): x is EconomicEvent => x !== null);
}

function mapSplitRows(rows: unknown[]): EconomicEvent[] {
  return rows
    .map((row, index) => {
      const item = row as Record<string, unknown>;
      const symbol = String(item.symbol ?? "").trim();
      if (!symbol) return null;
      const date = String(item.date ?? new Date().toISOString());
      const ratio = item.ratio == null ? "-" : String(item.ratio);
      return EconomicEventSchema.parse({
        id: createId(["split", symbol, date, String(index)]),
        time: new Date(date).toISOString(),
        currency: symbol,
        importance: 2,
        eventTitle: `${symbol} Bölünme`,
        actual: ratio,
        forecast: null,
        previous: null,
        impactLevel: "Medium",
      });
    })
    .filter((x): x is EconomicEvent => x !== null);
}

async function fetchFinnhubTab(args: {
  fetchImpl: typeof fetch;
  apiKey: string;
  tab: EconomicTab;
  range: DateRange;
  symbol: string | null;
}): Promise<EconomicEvent[]> {
  const { fetchImpl, apiKey, tab, range, symbol } = args;

  if ((tab === "dividends" || tab === "splits") && !symbol) {
    throw new FinnhubError({
      code: "FINNHUB_SYMBOL_REQUIRED",
      message: `Finnhub endpoint for ${tab} requires symbol query parameter.`,
      endpoint: tab === "dividends" ? "/stock/dividend" : "/stock/split",
    });
  }

  if (tab === "economic") {
    const url = apiUrl("/calendar/economic", { from: range.from, to: range.to, token: apiKey });
    const payload = (await fetchJson(fetchImpl, url)) as Record<string, unknown>;
    const rows = Array.isArray(payload.economicCalendar) ? payload.economicCalendar : Array.isArray(payload.data) ? payload.data : [];
    return mapEconomicRows(rows, range);
  }

  if (tab === "ipo") {
    const url = apiUrl("/calendar/ipo", { from: range.from, to: range.to, token: apiKey });
    const payload = (await fetchJson(fetchImpl, url)) as Record<string, unknown>;
    const rows = Array.isArray(payload.ipoCalendar) ? payload.ipoCalendar : Array.isArray(payload.data) ? payload.data : [];
    return mapIpoRows(rows);
  }

  if (tab === "holidays") {
    const url = apiUrl("/stock/market-holiday", { exchange: "US", token: apiKey });
    const payload = (await fetchJson(fetchImpl, url)) as Record<string, unknown>;
    const rows = Array.isArray(payload.data) ? payload.data : [];
    return mapEconomicRows(rows, range);
  }

  if (tab === "dividends") {
    const url = apiUrl("/stock/dividend", { symbol: symbol!, from: range.from, to: range.to, token: apiKey });
    const payload = (await fetchJson(fetchImpl, url)) as Record<string, unknown>;
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
    return mapDividendRows(rows);
  }

  const url = apiUrl("/stock/split", { symbol: symbol!, from: range.from, to: range.to, token: apiKey });
  const payload = (await fetchJson(fetchImpl, url)) as Record<string, unknown>;
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
  return mapSplitRows(rows);
}

export async function fetchCalendarEvents(tab: EconomicTab, range: EconomicRange, deps: CalendarClientDependencies = {}): Promise<CalendarFetchResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now?.() ?? new Date();
  const apiKey = readFinnhubApiKey();
  const cachePort = readCachePort(deps);
  const cacheKey = `${buildCalendarCacheKey(tab, range)}:finnhub:v1`;
  const cached = cachePort ? await cachePort.get(cacheKey) : null;
  const cachedEvents = fromCacheEvents(cached);
  const ageSeconds = staleAgeSeconds(cached?.lastUpdated ?? null);

  if (cached && cachedEvents.length > 0 && ageSeconds <= LIVE_TTL_SECONDS) {
    return {
      status: "READY",
      tab,
      range,
      updatedAt: new Date(cached.lastUpdated).toISOString(),
      events: cachedEvents,
      message: null,
      source: "cache",
      reason: "cache_hit",
      metadata: metadata(cached.lastUpdated),
    };
  }

  if (!apiKey) {
    const error = new FinnhubError({
      code: "FINNHUB_MISSING_API_KEY",
      message: "FINNHUB_API_KEY is not configured.",
      endpoint: "auth",
    });
    logFinnhubError(error, { tab, range });

    if (cached && cachedEvents.length > 0) {
      return {
        status: "DEGRADED",
        tab,
        range,
        updatedAt: new Date(cached.lastUpdated).toISOString(),
        events: cachedEvents,
        message: "Canlı anahtar bulunamadı. Son doğrulanan veri gösteriliyor.",
        source: "cache",
        reason: "missing_api_key",
        metadata: metadata(cached.lastUpdated, "FINNHUB_MISSING_API_KEY", true),
      };
    }

    return {
      status: "COOLDOWN",
      tab,
      range,
      updatedAt: null,
      events: [],
      message: "Takvim verisi için API anahtarı tanımlı değil.",
      source: "cache",
      reason: "missing_api_key",
      metadata: metadata(null, "FINNHUB_MISSING_API_KEY"),
    };
  }

  try {
    const dateRange = resolveRange(range, now);
    const symbol = deps.symbol ?? process.env.FINNHUB_DEFAULT_SYMBOL ?? null;
    const events = await fetchFinnhubTab({ fetchImpl, apiKey, tab, range: dateRange, symbol });

    if (events.length > 0) {
      if (cachePort) {
        await cachePort.set(cacheKey, toCachePayload(events), CALENDAR_TTL_SECONDS).catch(() => undefined);
      }
      return {
        status: "READY",
        tab,
        range,
        updatedAt: new Date().toISOString(),
        events,
        message: null,
        source: "finnhub",
        reason: null,
        metadata: metadata(Date.now()),
      };
    }

    if (cached && cachedEvents.length > 0 && ageSeconds <= LKG_TTL_SECONDS) {
      return {
        status: "DEGRADED",
        tab,
        range,
        updatedAt: new Date(cached.lastUpdated).toISOString(),
        events: cachedEvents,
        message: "Canlı kaynaktan sonuç yok, son doğrulanan veri gösteriliyor.",
        source: "cache",
        reason: "empty_finnhub_payload",
        metadata: metadata(cached.lastUpdated, "FINNHUB_EMPTY_PAYLOAD", true),
      };
    }

    return {
      status: "COOLDOWN",
      tab,
      range,
      updatedAt: null,
      events: [],
      message: "Canlı kaynaktan listelenecek veri alınamadı.",
      source: "cache",
      reason: "empty_finnhub_payload",
      metadata: metadata(null, "FINNHUB_EMPTY_PAYLOAD"),
    };
  } catch (error) {
    logFinnhubError(error, { tab, range });

    if (error instanceof FinnhubError && error.code === "FINNHUB_RATE_LIMIT" && cachePort) {
      await cachePort.set(cacheKey, toCachePayload([], "RATE_LIMITED"), 300).catch(() => undefined);
    }

    // fallback to legacy adapter only for economic/holidays/ipo paths
    if (tab === "economic" || tab === "holidays" || tab === "ipo") {
      const legacy = await fetchLegacyCalendarEvents(tab, range).catch(() => null);
      if (legacy && legacy.status === "READY" && legacy.events.length > 0) {
        if (cachePort) {
          await cachePort.set(cacheKey, toCachePayload(legacy.events), CALENDAR_TTL_SECONDS).catch(() => undefined);
        }
        return {
          status: "READY_FALLBACK",
          tab,
          range,
          updatedAt: new Date().toISOString(),
          events: legacy.events,
          message: "Yedek sağlayıcı üzerinden veri sunuluyor.",
          source: "legacy_adapter",
          reason: error instanceof FinnhubError ? error.code : "FINNHUB_UPSTREAM_ERROR",
          metadata: metadata(Date.now(), error instanceof FinnhubError ? error.code : "FINNHUB_UPSTREAM_ERROR"),
        };
      }
    }

    if (cached && cachedEvents.length > 0 && ageSeconds <= LKG_TTL_SECONDS) {
      return {
        status: "DEGRADED",
        tab,
        range,
        updatedAt: new Date(cached.lastUpdated).toISOString(),
        events: cachedEvents,
        message: "Sağlayıcı hatası nedeniyle son doğrulanan veri gösteriliyor.",
        source: "cache",
        reason: error instanceof FinnhubError ? error.code : "FINNHUB_UPSTREAM_ERROR",
        metadata: metadata(cached.lastUpdated, error instanceof FinnhubError ? error.code : "FINNHUB_UPSTREAM_ERROR", true),
      };
    }

    return {
      status: "COOLDOWN",
      tab,
      range,
      updatedAt: null,
      events: [],
      message: "Takvim sağlayıcısına şu anda erişilemiyor.",
      source: "cache",
      reason: error instanceof FinnhubError ? error.code : "FINNHUB_UPSTREAM_ERROR",
      metadata: metadata(null, error instanceof FinnhubError ? error.code : "FINNHUB_UPSTREAM_ERROR"),
    };
  }
}
