import { createHash, randomInt } from "node:crypto";
import { EconomicEventSchema, type EconomicEvent, type EconomicRange, type EconomicTab } from "@/lib/economic-calendar/schema";
import { SELECTOR_MAP } from "@/lib/economic-calendar/selectors";

interface CacheNode {
  timestamp: number;
  data: EconomicEvent[];
}

const CalendarCache: Record<string, CacheNode> = {};
const RevalidationLocks: Record<string, Promise<void> | undefined> = {};
const CACHE_TTL_MS = 60 * 1000 * 5;
const ISTANBUL_TIMEZONE = "Europe/Istanbul";

const LEGACY_ENDPOINTS: Record<EconomicTab, string> = {
  economic: "https://tr.investing.com/economic-calendar/Service/getCalendarFilteredData",
  holidays: "https://tr.investing.com/holiday-calendar/Service/getCalendarFilteredData",
  dividends: "https://tr.investing.com/dividends-calendar/Service/getCalendarFilteredData",
  splits: "https://tr.investing.com/stock-split-calendar/Service/getCalendarFilteredData",
  ipo: "https://tr.investing.com/ipo-calendar/Service/getCalendarFilteredData",
};

const PAGE_URLS: Record<EconomicTab, string> = {
  economic: "https://tr.investing.com/economic-calendar",
  holidays: "https://tr.investing.com/holiday-calendar",
  dividends: "https://tr.investing.com/dividends-calendar",
  splits: "https://tr.investing.com/stock-split-calendar",
  ipo: "https://tr.investing.com/ipo-calendar",
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

const RANGE_LABELS: Record<EconomicRange, string> = {
  yesterday: "Dün",
  today: "Bugün",
  tomorrow: "Yarın",
  week: "Bu Hafta",
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
];

const ACCEPT_LANG = "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7";

let stealthInitialized = false;

interface RequestLike {
  resourceType(): string;
  abort(): Promise<void>;
  continue(): Promise<void>;
}

interface PageLike {
  setUserAgent(userAgent: string): Promise<void>;
  setExtraHTTPHeaders(headers: Record<string, string>): Promise<void>;
  goto(url: string, options: { waitUntil: string; timeout: number }): Promise<unknown>;
  waitForSelector(selector: string, options: { timeout: number }): Promise<unknown>;
  evaluate<T, A>(pageFunction: (arg: A) => T, arg: A): Promise<T>;
  evaluate<T>(pageFunction: () => T): Promise<T>;
  setRequestInterception(enabled: boolean): Promise<void>;
  on(event: "request", handler: (request: RequestLike) => void | Promise<void>): void;
}

interface BrowserLike {
  newPage(): Promise<PageLike>;
  close(): Promise<void>;
}

interface PuppeteerExtraLike {
  use(plugin: unknown): void;
  launch(options: Record<string, unknown>): Promise<BrowserLike>;
}

interface ScrapedEventRow {
  idSeed: string;
  timeLabel: string;
  currency: string;
  eventTitle: string;
  importance: 1 | 2 | 3;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

interface CalendarResult {
  updatedAt: string;
  events: EconomicEvent[];
  dataAge: "fresh" | "stale";
}

function pickRandomUserAgent(): string {
  return USER_AGENTS[randomInt(0, USER_AGENTS.length)];
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

function extractCellByClass(rowHtml: string, classHint: string): string {
  const match = rowHtml.match(new RegExp(`<td[^>]*${classHint}[^>]*>([\\s\\S]*?)<\\/td>`, "i"));
  return sanitizeHtmlText(match?.[1] ?? "");
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
  if (timeLabel === "Tüm Gün") return `${dateLabel}T00:00:00+03:00`;
  const normalized = /^\d{2}:\d{2}$/.test(timeLabel) ? timeLabel : "00:00";
  return `${dateLabel}T${normalized}:00+03:00`;
}

function hashEventId(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

function safeMetricValue(value: string): string | null {
  const clean = value.trim();
  return clean.length === 0 || clean === "-" ? null : clean;
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
  return EconomicEventSchema.parse({
    id: hashEventId([payload.idSeed, payload.dateLabel, payload.timeLabel, payload.eventTitle]),
    time: toISOTime(payload.dateLabel, payload.timeLabel),
    currency: payload.currency || "-",
    importance: payload.importance,
    eventTitle: payload.eventTitle,
    actual: payload.actual,
    forecast: payload.forecast,
    previous: payload.previous,
    impactLevel: importanceToImpactLevel(payload.importance),
  });
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
        .map((match) => sanitizeHtmlText(match[1] ?? ""))
        .filter((value) => value.length > 0);

      if (cells.length < 2) return null;
      const [col1 = "-", col2 = "-", col3 = "-", col4 = "-", col5 = "-"] = cells;

      const mapped =
        tab === "holidays"
          ? {
              timeLabel: col1 || "Tüm Gün",
              currency: col2,
              eventTitle: col3 || col2,
              actual: null,
              forecast: null,
              previous: null,
            }
          : {
              timeLabel: col2 || col1,
              currency: "-",
              eventTitle: col1,
              actual: safeMetricValue(col3),
              forecast: safeMetricValue(col4),
              previous: safeMetricValue(col5),
            };

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

  if (tab !== "economic") body.set("economicCalendarTab", tab);

  return body;
}

function getDefaultExport(moduleValue: unknown): unknown {
  if (typeof moduleValue !== "object" || moduleValue === null) return null;
  return "default" in moduleValue ? (moduleValue as { default: unknown }).default : moduleValue;
}

function isPuppeteerExtra(value: unknown): value is PuppeteerExtraLike {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.use === "function" && typeof candidate.launch === "function";
}

function isScrapedEventRow(payload: unknown): payload is ScrapedEventRow {
  if (typeof payload !== "object" || payload === null) return false;
  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate.idSeed === "string" &&
    typeof candidate.timeLabel === "string" &&
    typeof candidate.currency === "string" &&
    typeof candidate.eventTitle === "string" &&
    (candidate.importance === 1 || candidate.importance === 2 || candidate.importance === 3) &&
    (typeof candidate.actual === "string" || candidate.actual === null) &&
    (typeof candidate.forecast === "string" || candidate.forecast === null) &&
    (typeof candidate.previous === "string" || candidate.previous === null)
  );
}

function isValidEventMap(payload: unknown): payload is EconomicEvent[] {
  return Array.isArray(payload) && payload.every((item) => EconomicEventSchema.safeParse(item).success);
}

async function loadStealthDependencies(): Promise<{ puppeteerExtra: PuppeteerExtraLike; createStealthPlugin: () => unknown }> {
  const dynamicImport = new Function("modulePath", "return import(modulePath);") as (modulePath: string) => Promise<unknown>;
  const puppeteerModule = await dynamicImport("puppeteer-extra");
  const stealthModule = await dynamicImport("puppeteer-extra-plugin-stealth");

  const puppeteerValue = getDefaultExport(puppeteerModule);
  const stealthValue = getDefaultExport(stealthModule);

  if (!isPuppeteerExtra(puppeteerValue) || typeof stealthValue !== "function") {
    throw new Error("Stealth dependencies are not available");
  }

  return {
    puppeteerExtra: puppeteerValue,
    createStealthPlugin: stealthValue as () => unknown,
  };
}

function makeCacheKey(tab: EconomicTab, range: EconomicRange): string {
  return `${tab}:${range}`;
}

function readCache(tab: EconomicTab, range: EconomicRange): { node: CacheNode | null; isFresh: boolean } {
  const key = makeCacheKey(tab, range);
  const node = CalendarCache[key] ?? null;
  if (!node) return { node: null, isFresh: false };
  return { node, isFresh: Date.now() - node.timestamp <= CACHE_TTL_MS };
}

function writeCache(tab: EconomicTab, range: EconomicRange, events: EconomicEvent[]): void {
  const key = makeCacheKey(tab, range);
  CalendarCache[key] = {
    timestamp: Date.now(),
    data: events,
  };
}

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

async function fetchMirrorHtml(tab: EconomicTab, range: EconomicRange, tabAlias: string): Promise<string> {
  const response = await fetch(LEGACY_ENDPOINTS[tab], {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://tr.investing.com",
      Referer: REFERERS[tab],
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": pickRandomUserAgent(),
      "Accept-Language": ACCEPT_LANG,
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
    },
    body: buildRequestBody(tab, range, tabAlias).toString(),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Mirror source returned ${response.status}`);

  const payloadUnknown: unknown = await response.json();
  const payload =
    typeof payloadUnknown === "object" && payloadUnknown !== null && "data" in payloadUnknown
      ? (payloadUnknown as { data?: unknown })
      : { data: undefined };

  return typeof payload.data === "string" ? payload.data : "";
}

async function fetchWithStealth(tab: EconomicTab, range: EconomicRange): Promise<EconomicEvent[]> {
  const { puppeteerExtra, createStealthPlugin } = await loadStealthDependencies();

  if (!stealthInitialized) {
    puppeteerExtra.use(createStealthPlugin());
    stealthInitialized = true;
  }

  const browser = await puppeteerExtra.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--lang=tr-TR,tr",
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", async (request: RequestLike) => {
      const blockedTypes = new Set(["image", "stylesheet", "font", "media"]);
      if (blockedTypes.has(request.resourceType())) {
        await request.abort();
        return;
      }
      await request.continue();
    });

    await page.setUserAgent(pickRandomUserAgent());
    await page.setExtraHTTPHeaders({ "Accept-Language": ACCEPT_LANG });

    await page.goto(PAGE_URLS[tab], { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector("#ecEventsTable", { timeout: 8_000 });

    await page.evaluate((rangeLabel: string) => {
      const nodes = Array.from(document.querySelectorAll("button, a, span"));
      const target = nodes.find((node) => node.textContent?.trim() === rangeLabel);
      if (target && target instanceof HTMLElement) target.click();
    }, RANGE_LABELS[range]);

    const rawRowsUnknown: unknown = await page.evaluate(() => {
      const normalize = (value: string | null | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();
      const rows = Array.from(document.querySelectorAll("tr[data-event-datetime], tr[id^='eventRowId_']"));

      return rows
        .map((row, index) => {
          const read = (selectors: string[]): string => {
            const node = selectors
              .map((selector) => row.querySelector(selector))
              .find((entry) => entry && normalize(entry.textContent).length > 0);
            return normalize(node?.textContent);
          };

          const eventTitle = read(["td[data-column-key='event']", "td.event", "td.left.event"]);
          if (!eventTitle) return null;

          const importanceCount = row.querySelectorAll("i[class*='bull'], i.grayFullBullishIcon, i.grayHalfBullishIcon").length;
          const importanceRaw = Math.min(3, Math.max(1, importanceCount || 1));
          const importance: 1 | 2 | 3 = importanceRaw === 3 ? 3 : importanceRaw === 2 ? 2 : 1;

          return {
            idSeed: row.getAttribute("data-event-datetime") ?? row.getAttribute("id") ?? `dom-${index + 1}`,
            timeLabel: read(["td[data-column-key='time']", "td.time", "td.first.left.time"]) || "Tüm Gün",
            currency: read(["td[data-column-key='currency']", "td.flagCur", "td.left.flagCur.noWrap"]) || "-",
            eventTitle,
            importance,
            actual: read(["td[data-column-key='actual']", "td.act", "td.bold.act"]) || null,
            forecast: read(["td[data-column-key='forecast']", "td.fore"]) || null,
            previous: read(["td[data-column-key='previous']", "td.prev"]) || null,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);
    });

    const rows = Array.isArray(rawRowsUnknown) ? rawRowsUnknown.filter(isScrapedEventRow) : [];
    const dateLabel = resolveDateRange(range).from;

    const mapped = rows.map((row) =>
      createEconomicEvent({
        idSeed: row.idSeed,
        dateLabel,
        timeLabel: row.timeLabel,
        currency: row.currency,
        eventTitle: row.eventTitle,
        importance: row.importance,
        actual: safeMetricValue(row.actual ?? ""),
        forecast: safeMetricValue(row.forecast ?? ""),
        previous: safeMetricValue(row.previous ?? ""),
      }),
    );

    return isValidEventMap(mapped) ? mapped : [];
  } finally {
    await browser.close();
  }
}

async function fetchWithServiceEndpoints(tab: EconomicTab, range: EconomicRange): Promise<EconomicEvent[]> {
  const aliases = TAB_ALIASES[tab];
  const dateLabel = resolveDateRange(range).from;

  const payloads = await Promise.allSettled(aliases.map((alias) => fetchMirrorHtml(tab, range, alias)));

  const parsed = payloads
    .map((result) => (result.status === "fulfilled" ? result.value : ""))
    .map((html) => (tab === "economic" ? parseEconomicRows(html, dateLabel) : parseGenericRows(html, dateLabel, tab)))
    .find((events) => events.length > 0);

  return parsed ?? [];
}

async function fetchFromOrigin(tab: EconomicTab, range: EconomicRange): Promise<EconomicEvent[]> {
  const stealthEvents = await fetchWithStealth(tab, range).catch(() => [] as EconomicEvent[]);
  if (stealthEvents.length > 0) return stealthEvents;

  return fetchWithServiceEndpoints(tab, range).catch(() => [] as EconomicEvent[]);
}

async function revalidateInBackground(tab: EconomicTab, range: EconomicRange): Promise<void> {
  const key = makeCacheKey(tab, range);
  if (RevalidationLocks[key]) return;

  RevalidationLocks[key] = (async () => {
    const events = await fetchFromOrigin(tab, range);
    if (events.length > 0 && isValidEventMap(events)) writeCache(tab, range, events);
  })()
    .catch(() => undefined)
    .finally(() => {
      delete RevalidationLocks[key];
    });

  await RevalidationLocks[key];
}

export async function fetchCalendarData(tab: EconomicTab, range: EconomicRange): Promise<CalendarResult> {
  const cacheState = readCache(tab, range);

  if (cacheState.node && cacheState.isFresh) {
    return {
      updatedAt: formatUpdatedAt(cacheState.node.timestamp),
      events: cacheState.node.data,
      dataAge: "fresh",
    };
  }

  if (cacheState.node && !cacheState.isFresh) {
    void revalidateInBackground(tab, range);
    return {
      updatedAt: formatUpdatedAt(cacheState.node.timestamp),
      events: cacheState.node.data,
      dataAge: "stale",
    };
  }

  try {
    const events = await fetchFromOrigin(tab, range);
    if (!isValidEventMap(events) || events.length === 0) throw new Error("Economic mirror returned empty dataset");

    writeCache(tab, range, events);
    const created = readCache(tab, range).node;
    return {
      updatedAt: formatUpdatedAt(created?.timestamp ?? Date.now()),
      events,
      dataAge: "fresh",
    };
  } catch {
    const fallback = readCache(tab, range).node;
    if (fallback) {
      return {
        updatedAt: formatUpdatedAt(fallback.timestamp),
        events: fallback.data,
        dataAge: "stale",
      };
    }

    throw new Error("Veri sunucusu senkronizasyonunda geçici bir gecikme yaşanıyor.");
  }
}

export async function fetchEconomicEvents(tab: EconomicTab, range: EconomicRange): Promise<{ updatedAt: string; events: EconomicEvent[] }> {
  const result = await fetchCalendarData(tab, range);
  return { updatedAt: result.updatedAt, events: result.events };
}
