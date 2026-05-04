import { createHash } from "node:crypto";
import { EconomicEventSchema, type EconomicEvent, type EconomicRange, type EconomicTab } from "@/lib/economic-calendar/schema";
import { SELECTOR_MAP } from "@/lib/economic-calendar/selectors";

const CACHE_TTL_MS = 60_000;
const ISTANBUL_TIMEZONE = "Europe/Istanbul";

const ENDPOINTS: Record<EconomicTab, string> = {
  economic: "https://tr.investing.com/economic-calendar/Service/getCalendarFilteredData",
  holidays: "https://tr.investing.com/holiday-calendar/Service/getCalendarFilteredData",
  dividends: "https://tr.investing.com/dividends-calendar/Service/getCalendarFilteredData",
  splits: "https://tr.investing.com/stock-split-calendar/Service/getCalendarFilteredData",
  ipo: "https://tr.investing.com/ipo-calendar/Service/getCalendarFilteredData",
};

const REFERERS: Record<EconomicTab, string> = {
  economic: "https://tr.investing.com/economic-calendar/",
  holidays: "https://tr.investing.com/holiday-calendar/",
  dividends: "https://tr.investing.com/dividends-calendar/",
  splits: "https://tr.investing.com/stock-split-calendar/",
  ipo: "https://tr.investing.com/ipo-calendar/",
};

const TAB_ALIASES: Record<EconomicTab, string[]> = {
  economic: ["today", "custom"],
  holidays: ["holidays", "holiday"],
  dividends: ["dividends", "dividend"],
  splits: ["splits", "split"],
  ipo: ["ipo"],
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

const ACCEPT_LANGS = ["tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7", "tr;q=0.9,en;q=0.8"];

const cacheStore = new Map<string, { expiresAt: number; updatedAt: string; events: EconomicEvent[] }>();

function nowHeaderIndex(): number {
  return Math.abs(Math.floor(Date.now() / 1000)) % USER_AGENTS.length;
}

function sanitizeHtmlText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTurkish(value: string): string {
  return value
    .replaceAll("Ã¼", "ü")
    .replaceAll("Ã¶", "ö")
    .replaceAll("Ä±", "ı")
    .replaceAll("ÄŸ", "ğ")
    .replaceAll("ÅŸ", "ş")
    .replaceAll("Ã§", "ç")
    .replaceAll("Ä°", "İ")
    .replaceAll("Ãœ", "Ü")
    .replaceAll("Ã–", "Ö")
    .replaceAll("Ã‡", "Ç")
    .replaceAll("Åž", "Ş")
    .replaceAll("Äž", "Ğ");
}

function extractCellByClass(rowHtml: string, classHint: string): string {
  const match = rowHtml.match(new RegExp(`<td[^>]*${classHint}[^>]*>([\\s\\S]*?)<\\/td>`, "i"));
  return normalizeTurkish(sanitizeHtmlText(match?.[1] ?? ""));
}

function parseImportanceValue(rowHtml: string, sentimentText: string): 1 | 2 | 3 {
  const normalized = `${rowHtml} ${sentimentText}`.toLowerCase();
  if (normalized.includes("bull3") || normalized.includes("high") || normalized.includes("yüksek")) return 3;
  if (normalized.includes("bull2") || normalized.includes("medium") || normalized.includes("orta")) return 2;
  return 1;
}

function importanceToImpactLevel(value: 1 | 2 | 3): "High" | "Medium" | "Low" {
  if (value === 3) return "High";
  if (value === 2) return "Medium";
  return "Low";
}

function toISOTime(dateLabel: string, timeLabel: string): string {
  if (timeLabel === "Tüm Gün") {
    return `${dateLabel}T00:00:00+03:00`;
  }
  const normalized = timeLabel.match(/^\d{2}:\d{2}$/) ? timeLabel : "00:00";
  return `${dateLabel}T${normalized}:00+03:00`;
}

function hashEventId(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

function createEconomicEvent(payload: {
  idSeed: string;
  dateLabel: string;
  timeLabel: string;
  currency: string;
  eventTitle: string;
  importance: 1 | 2 | 3;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}): EconomicEvent {
  const raw = {
    id: hashEventId([payload.idSeed, payload.dateLabel, payload.timeLabel, payload.eventTitle]),
    time: toISOTime(payload.dateLabel, payload.timeLabel),
    currency: payload.currency || "-",
    importance: payload.importance,
    eventTitle: payload.eventTitle,
    actual: payload.actual,
    forecast: payload.forecast,
    previous: payload.previous,
    impactLevel: importanceToImpactLevel(payload.importance),
  };
  return EconomicEventSchema.parse(raw);
}

function safeMetricValue(value: string): string | null {
  const clean = normalizeTurkish(value).trim();
  return clean.length === 0 || clean === "-" ? null : clean;
}

function parseEconomicRows(html: string, dateLabel: string): EconomicEvent[] {
  const selector = SELECTOR_MAP.economic;
  const rows = html.match(selector.rowPattern) ?? [];

  return rows
    .map((rowHtml, index) => {
      const sentimentText = extractCellByClass(rowHtml, selector.classHints.importance);
      const importance = parseImportanceValue(rowHtml, sentimentText);
      const eventTitle = extractCellByClass(rowHtml, selector.classHints.event);
      if (!eventTitle) return null;

      const eventId = rowHtml.match(selector.eventIdPattern)?.[1] ?? `economic-${index + 1}`;
      const timeLabel = extractCellByClass(rowHtml, selector.classHints.time) || "Tüm Gün";
      const currency = extractCellByClass(rowHtml, selector.classHints.currency) || "-";
      return createEconomicEvent({
        idSeed: eventId,
        dateLabel,
        timeLabel,
        currency,
        eventTitle,
        importance,
        actual: safeMetricValue(extractCellByClass(rowHtml, selector.classHints.actual)),
        forecast: safeMetricValue(extractCellByClass(rowHtml, selector.classHints.forecast)),
        previous: safeMetricValue(extractCellByClass(rowHtml, selector.classHints.previous)),
      });
    })
    .filter((event): event is EconomicEvent => event !== null);
}

function parseGenericRows(html: string, dateLabel: string, tab: EconomicTab): EconomicEvent[] {
  const selector = SELECTOR_MAP[tab];
  const rows = html.match(selector.rowPattern) ?? [];

  return rows
    .map((rowHtml, index) => {
      const cells = Array.from(rowHtml.matchAll(selector.cellPattern))
        .map((match) => normalizeTurkish(sanitizeHtmlText(match[1] ?? "")))
        .filter((value) => value.length > 0);

      if (cells.length < 2) return null;
      const [col1 = "-", col2 = "-", col3 = "-", col4 = "-", col5 = "-"] = cells;

      const mapped =
        tab === "holidays"
          ? { timeLabel: col1 || "Tüm Gün", currency: col2, eventTitle: col3 || col2, actual: null, forecast: null, previous: null }
          : { timeLabel: col2 || col1, currency: "-", eventTitle: col1, actual: safeMetricValue(col3), forecast: safeMetricValue(col4), previous: safeMetricValue(col5) };

      if (!mapped.eventTitle || mapped.eventTitle === "-") return null;

      return createEconomicEvent({
        idSeed: `${tab}-${index + 1}`,
        dateLabel,
        timeLabel: mapped.timeLabel,
        currency: mapped.currency,
        eventTitle: mapped.eventTitle,
        importance: 2,
        actual: mapped.actual,
        forecast: mapped.forecast,
        previous: mapped.previous,
      });
    })
    .filter((event): event is EconomicEvent => event !== null);
}

function getIstanbulDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function shiftDate(base: Date, dayOffset: number): Date {
  return new Date(base.getTime() + dayOffset * 86_400_000);
}

function resolveDateRange(range: EconomicRange): { from: string; to: string } {
  const now = new Date();
  const base = shiftDate(now, 0);

  if (range === "yesterday") {
    const day = getIstanbulDateString(shiftDate(base, -1));
    return { from: day, to: day };
  }

  if (range === "tomorrow") {
    const day = getIstanbulDateString(shiftDate(base, 1));
    return { from: day, to: day };
  }

  if (range === "week") {
    return { from: getIstanbulDateString(base), to: getIstanbulDateString(shiftDate(base, 7)) };
  }

  const day = getIstanbulDateString(base);
  return { from: day, to: day };
}

function buildRequestBody(tab: EconomicTab, range: EconomicRange, currentTab: string): URLSearchParams {
  const { from, to } = resolveDateRange(range);
  const body = new URLSearchParams();
  body.set("dateFrom", from);
  body.set("dateTo", to);
  body.set("date", from);
  body.set("timeZone", "55");
  body.set("timeFilter", "timeOnly");
  body.set("currentTab", currentTab);
  body.set("limit_from", "0");
  body.set("submitFilters", "1");
  body.set("country[]", "");
  body.set("importance[]", "-1");
  body.set("importance[]", "0");
  body.set("importance[]", "1");
  body.set("importance[]", "2");
  body.set("importance[]", "3");
  body.set("category[]", "");

  if (tab !== "economic") {
    body.set("economicCalendarTab", tab);
  }

  return body;
}

function getCachedResult(cacheKey: string): { updatedAt: string; events: EconomicEvent[] } | null {
  const cached = cacheStore.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    cacheStore.delete(cacheKey);
    return null;
  }
  return { updatedAt: cached.updatedAt, events: cached.events };
}

function storeCache(cacheKey: string, value: { updatedAt: string; events: EconomicEvent[] }): void {
  cacheStore.set(cacheKey, {
    updatedAt: value.updatedAt,
    events: value.events,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

async function fetchMirrorHtml(tab: EconomicTab, range: EconomicRange, tabAlias: string): Promise<string> {
  const idx = nowHeaderIndex();
  const response = await fetch(ENDPOINTS[tab], {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://tr.investing.com",
      Referer: REFERERS[tab],
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": USER_AGENTS[idx],
      "Accept-Language": ACCEPT_LANGS[idx % ACCEPT_LANGS.length],
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
    },
    body: buildRequestBody(tab, range, tabAlias).toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Mirror source returned ${response.status}`);
  }

  const payloadUnknown: unknown = await response.json();
  const payload =
    typeof payloadUnknown === "object" && payloadUnknown !== null && "data" in payloadUnknown
      ? (payloadUnknown as { data?: unknown })
      : { data: undefined };

  return typeof payload.data === "string" ? payload.data : "";
}

export async function fetchEconomicEvents(tab: EconomicTab, range: EconomicRange): Promise<{ updatedAt: string; events: EconomicEvent[] }> {
  const cacheKey = `${tab}:${range}`;
  const fromCache = getCachedResult(cacheKey);
  if (fromCache) return fromCache;

  const aliases = TAB_ALIASES[tab];
  const dateLabel = resolveDateRange(range).from;

  const events =
    (
      await Promise.allSettled(aliases.map((alias) => fetchMirrorHtml(tab, range, alias)))
    )
      .map((result) => (result.status === "fulfilled" ? result.value : ""))
      .map((html) => (tab === "economic" ? parseEconomicRows(html, dateLabel) : parseGenericRows(html, dateLabel, tab)))
      .find((list) => list.length > 0) ?? [];

  const updatedAt = new Date().toISOString();
  const payload = { updatedAt, events };
  storeCache(cacheKey, payload);
  return payload;
}
