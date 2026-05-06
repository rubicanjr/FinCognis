import { createHash } from "node:crypto";
import {
  CALENDAR_TTL_SECONDS,
  apiEventToCacheEvent,
  buildCalendarCacheKey,
  cacheEventToApiEvent,
  createWorkerState,
  getCalendarCachePort,
  shouldTreatAsStale,
  type CachePayload,
  type CachePort,
} from "@/lib/economic-calendar/cache-port";
import {
  EconomicEventSchema,
  type EconomicEvent,
  type EconomicMirrorStatus,
  type EconomicRange,
  type EconomicTab,
} from "@/lib/economic-calendar/schema";
import { z } from "zod";

const RAPID_API_HOST = "ultimate-economic-calendar.p.rapidapi.com";
const RAPID_API_ENDPOINT = `https://${RAPID_API_HOST}/economic-events/tradingview`;
const ISTANBUL_TIME_ZONE = "Europe/Istanbul";

type ImpactLevel = "High" | "Medium" | "Low";

export interface TradingViewEvent {
  id: string;
  date: string;
  country: string;
  event: string;
  importance: "low" | "medium" | "high";
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  unit?: string;
}

export interface CalendarQueryParams {
  from: string;
  to: string;
  countries: string;
}

export interface CalendarFetchResult {
  status: EconomicMirrorStatus;
  tab: EconomicTab;
  range: EconomicRange;
  updatedAt: string | null;
  events: EconomicEvent[];
  message: string | null;
  source: "rapidapi" | "cache" | "none";
  reason: string | null;
}

interface CalendarClientDependencies {
  fetchImpl?: typeof fetch;
  cachePort?: CachePort | null;
  now?: () => Date;
}

const TradingViewImportanceSchema = z
  .union([
    z.literal("low"),
    z.literal("medium"),
    z.literal("high"),
    z.literal("Low"),
    z.literal("Medium"),
    z.literal("High"),
    z.number().int().min(-5).max(5),
  ])
  .transform((value): "low" | "medium" | "high" => {
    if (typeof value === "number") {
      if (value >= 2) return "high";
      if (value === 1) return "medium";
      return "low";
    }
    if (value === "high" || value === "High") return "high";
    if (value === "medium" || value === "Medium") return "medium";
    return "low";
  });

const TradingViewEventSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    date: z.union([z.string(), z.number(), z.date()]),
    country: z.string().min(1),
    event: z.string().optional(),
    title: z.string().optional(),
    indicator: z.string().optional(),
    importance: TradingViewImportanceSchema,
    actual: z.union([z.string(), z.number(), z.null()]).optional(),
    forecast: z.union([z.string(), z.number(), z.null()]).optional(),
    previous: z.union([z.string(), z.number(), z.null()]).optional(),
    unit: z.string().optional(),
  })
  .transform((raw): TradingViewEvent => {
    const eventText = raw.event?.trim() || raw.title?.trim() || raw.indicator?.trim() || "Unknown Event";
    const id = typeof raw.id === "number" ? String(raw.id) : raw.id;
    const date =
      raw.date instanceof Date ? raw.date.toISOString() : typeof raw.date === "number" ? new Date(raw.date).toISOString() : raw.date;
    const toNullable = (value: string | number | null | undefined): string | null => {
      if (value === null || value === undefined) return null;
      const normalized = String(value).trim();
      return normalized.length > 0 ? normalized : null;
    };
    return {
      id: id && id.length > 0 ? id : createIdFromValues(raw.country, eventText, date),
      date,
      country: raw.country,
      event: eventText,
      importance: raw.importance,
      actual: toNullable(raw.actual),
      forecast: toNullable(raw.forecast),
      previous: toNullable(raw.previous),
      unit: raw.unit,
    };
  });

const TradingViewEventsSchema = z.array(TradingViewEventSchema);

function createIdFromValues(...values: string[]): string {
  return createHash("sha1").update(values.join("|")).digest("hex").slice(0, 16);
}

function toYmd(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL_TIME_ZONE,
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

function buildRangeQuery(range: EconomicRange, now: Date): CalendarQueryParams {
  const today = toYmd(now);
  if (range === "yesterday") {
    const yesterday = toYmd(addDays(now, -1));
    return { from: yesterday, to: yesterday, countries: "" };
  }
  if (range === "tomorrow") {
    const tomorrow = toYmd(addDays(now, 1));
    return { from: tomorrow, to: tomorrow, countries: "" };
  }
  if (range === "week") {
    return { from: today, to: toYmd(addDays(now, 6)), countries: "" };
  }
  return { from: today, to: today, countries: "" };
}

function normalizeToIstanbulIso(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return new Date().toISOString();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = new Map(parts.map((part) => [part.type, part.value]));
  return `${map.get("year")}-${map.get("month")}-${map.get("day")}T${map.get("hour")}:${map.get("minute")}:${map.get("second")}+03:00`;
}

function mapImportance(value: "low" | "medium" | "high"): { importance: 1 | 2 | 3; impactLevel: ImpactLevel } {
  if (value === "high") return { importance: 3, impactLevel: "High" };
  if (value === "medium") return { importance: 2, impactLevel: "Medium" };
  return { importance: 1, impactLevel: "Low" };
}

function matchesTab(tab: EconomicTab, event: TradingViewEvent): boolean {
  const lower = event.event.toLowerCase();
  if (tab === "economic") return true;
  if (tab === "holidays") return lower.includes("holiday") || lower.includes("tatil");
  if (tab === "dividends") return lower.includes("dividend") || lower.includes("temett");
  if (tab === "splits") return lower.includes("split") || lower.includes("bölün");
  return lower.includes("ipo") || lower.includes("halka arz");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function extractRapidEvents(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.events)) return record.events;
  if (Array.isArray(record.result)) return record.result;
  if (Array.isArray(record.items)) return record.items;
  return [];
}

function getCacheKey(tab: EconomicTab, range: EconomicRange): string {
  return `${buildCalendarCacheKey(tab, range)}:tradingview`;
}

function toCachePayload(events: EconomicEvent[]): CachePayload {
  return {
    lastUpdated: Date.now(),
    data: events.map(apiEventToCacheEvent),
    workerStatus: createWorkerState("SUCCESS"),
    isFallbackData: false,
  };
}

function fromCacheEvents(cached: Awaited<ReturnType<CachePort["get"]>>): EconomicEvent[] {
  if (!cached || cached.data.length === 0) return [];
  return cached.data.map(cacheEventToApiEvent);
}

function messageForStatus(status: number): string {
  if (status === 429) return "Takvim sağlayıcısı hız sınırına ulaştı. Son doğrulanan veri gösteriliyor.";
  return "Takvim akışında geçici gecikme var. Son doğrulanan veri gösteriliyor.";
}

function buildApiUrl(params: CalendarQueryParams): string {
  const entries: Record<string, string> = {
    from: params.from,
    to: params.to,
  };
  if (params.countries.trim().length > 0) {
    entries.countries = params.countries;
  }
  const search = new URLSearchParams(entries);
  return `${RAPID_API_ENDPOINT}?${search.toString()}`;
}

function readRapidApiKey(): string | null {
  const key = process.env.RAPIDAPI_KEY ?? process.env.RAPID_API_KEY;
  if (!key) return null;
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readCachePort(deps: CalendarClientDependencies): CachePort | null {
  if (deps.cachePort !== undefined) return deps.cachePort;
  try {
    return getCalendarCachePort();
  } catch {
    return null;
  }
}

async function fetchRapidEvents(
  fetchImpl: typeof fetch,
  params: CalendarQueryParams,
  apiKey: string,
): Promise<{ ok: true; updatedAt: string | null; events: TradingViewEvent[] } | { ok: false; status: number }> {
  const response = await fetchImpl(buildApiUrl(params), {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": RAPID_API_HOST,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "FinCognisCalendarBot/1.0 (+https://fincognis.com)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) return { ok: false, status: response.status };

  const payloadUnknown: unknown = await response.json().catch(() => []);
  const extracted = extractRapidEvents(payloadUnknown);
  const parsed = TradingViewEventsSchema.safeParse(extracted);
  if (!parsed.success || parsed.data.length === 0) {
    return { ok: true, updatedAt: response.headers.get("date"), events: [] };
  }
  return {
    ok: true,
    updatedAt: response.headers.get("date"),
    events: parsed.data,
  };
}

function mapToEconomicEvents(tab: EconomicTab, rapidEvents: TradingViewEvent[]): EconomicEvent[] {
  return rapidEvents
    .filter((event) => matchesTab(tab, event))
    .map((event) => {
      const mappedImportance = mapImportance(event.importance);
      return EconomicEventSchema.parse({
        id: event.id || createIdFromValues(event.country, event.event, event.date),
        time: normalizeToIstanbulIso(event.date),
        currency: event.country,
        importance: mappedImportance.importance,
        eventTitle: event.event,
        actual: event.actual,
        forecast: event.forecast,
        previous: event.previous,
        impactLevel: mappedImportance.impactLevel,
      });
    });
}

export async function fetchCalendarEvents(
  tab: EconomicTab,
  range: EconomicRange,
  deps: CalendarClientDependencies = {},
): Promise<CalendarFetchResult> {
  const cachePort = readCachePort(deps);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now?.() ?? new Date();
  const key = getCacheKey(tab, range);
  const cached = cachePort ? await cachePort.get(key) : null;

  if (cached && !shouldTreatAsStale(cached.lastUpdated) && cached.data.length > 0) {
    return {
      status: "READY",
      tab,
      range,
      updatedAt: new Date(cached.lastUpdated).toISOString(),
      events: fromCacheEvents(cached),
      message: null,
      source: "cache",
      reason: null,
    };
  }

  const apiKey = readRapidApiKey();
  if (!apiKey) {
    if (cached && cached.data.length > 0) {
      return {
        status: "READY",
        tab,
        range,
        updatedAt: new Date(cached.lastUpdated).toISOString(),
        events: fromCacheEvents(cached),
        message: "Canlı anahtar bulunamadı. Son doğrulanan veri gösteriliyor.",
        source: "cache",
        reason: "missing_api_key",
      };
    }
    return {
      status: "SOURCE_UNAVAILABLE",
      tab,
      range,
      updatedAt: null,
      events: [],
      message: "Takvim verisi için API anahtarı tanımlı değil.",
      source: "none",
      reason: "missing_api_key",
    };
  }

  const query = buildRangeQuery(range, now);
  const rapidResult = await fetchRapidEvents(fetchImpl, query, apiKey);

  if (!rapidResult.ok) {
    if (cached && cached.data.length > 0) {
      return {
        status: "READY",
        tab,
        range,
        updatedAt: new Date(cached.lastUpdated).toISOString(),
        events: fromCacheEvents(cached),
        message: messageForStatus(rapidResult.status),
        source: "cache",
        reason: `http_${rapidResult.status}`,
      };
    }
    return {
      status: "SOURCE_UNAVAILABLE",
      tab,
      range,
      updatedAt: null,
      events: [],
      message: "Takvim sağlayıcısına şu anda erişilemiyor.",
      source: "none",
      reason: `http_${rapidResult.status}`,
    };
  }

  const mapped = mapToEconomicEvents(tab, rapidResult.events);
  if (mapped.length === 0) {
    if (cached && cached.data.length > 0) {
      return {
        status: "READY",
        tab,
        range,
        updatedAt: new Date(cached.lastUpdated).toISOString(),
        events: fromCacheEvents(cached),
        message: "Bu filtre için canlı kaynakta veri bulunamadı, son doğrulanan set gösteriliyor.",
        source: "cache",
        reason: "empty_remote_payload",
      };
    }
    return {
      status: "READY",
      tab,
      range,
      updatedAt: null,
      events: [],
      message: null,
      source: "rapidapi",
      reason: null,
    };
  }

  if (cachePort) {
    await cachePort.set(key, toCachePayload(mapped), 5 * 60).catch(() => undefined);
  }

  const updatedAtSource = rapidResult.updatedAt ? new Date(rapidResult.updatedAt).toISOString() : new Date().toISOString();
  return {
    status: "READY",
    tab,
    range,
    updatedAt: updatedAtSource,
    events: mapped,
    message: null,
    source: "rapidapi",
    reason: null,
  };
}
