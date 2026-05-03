import { NextResponse } from "next/server";

type CalendarCategory = "economic" | "holidays" | "dividends" | "splits" | "ipo";
type CalendarRange = "yesterday" | "today" | "tomorrow" | "week";

interface CalendarEntry {
  id: string;
  timeLabel: string;
  currency: string;
  event: string;
  importance: "Yüksek" | "Orta" | "Düşük";
  actual: string;
  forecast: string;
  previous: string;
}

const INVESTING_CALENDAR_URL = "https://tr.investing.com/economic-calendar";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const PRIMARY_ENDPOINT = "https://tr.investing.com/economic-calendar/Service/getCalendarFilteredData";
const FALLBACK_ENDPOINTS: Record<CalendarCategory, string> = {
  economic: "https://tr.investing.com/economic-calendar/Service/getCalendarFilteredData",
  holidays: "https://tr.investing.com/holiday-calendar/Service/getCalendarFilteredData",
  dividends: "https://tr.investing.com/dividends-calendar/Service/getCalendarFilteredData",
  splits: "https://tr.investing.com/stock-split-calendar/Service/getCalendarFilteredData",
  ipo: "https://tr.investing.com/ipo-calendar/Service/getCalendarFilteredData",
};

const REFERERS: Record<CalendarCategory, string> = {
  economic: "https://tr.investing.com/economic-calendar/",
  holidays: "https://tr.investing.com/holiday-calendar/",
  dividends: "https://tr.investing.com/dividends-calendar/",
  splits: "https://tr.investing.com/stock-split-calendar/",
  ipo: "https://tr.investing.com/ipo-calendar/",
};

const TAB_ALIASES: Record<CalendarCategory, string[]> = {
  economic: ["today", "custom"],
  holidays: ["holidays", "holiday", "hol"],
  dividends: ["dividends", "dividend"],
  splits: ["splits", "split"],
  ipo: ["ipo"],
};

function stripTags(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractCell(rowHtml: string, classHint: string): string {
  const match = rowHtml.match(new RegExp(`<td[^>]*${classHint}[^>]*>([\\s\\S]*?)<\\/td>`, "i"));
  return stripTags(match?.[1] ?? "");
}

function parseImportance(rowHtml: string): "Yüksek" | "Orta" | "Düşük" {
  const sentimentCell = extractCell(rowHtml, "sentiment");
  const row = `${rowHtml} ${sentimentCell}`.toLowerCase();
  if (row.includes("bull3") || row.includes("high") || row.includes("yüksek")) return "Yüksek";
  if (row.includes("bull2") || row.includes("medium") || row.includes("orta")) return "Orta";
  return "Düşük";
}

function parseRows(html: string): CalendarEntry[] {
  const rowMatches = html.match(/<tr[^>]*id="eventRowId_[^"]*"[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const entries: CalendarEntry[] = [];

  for (const row of rowMatches) {
    const idMatch = row.match(/id="(eventRowId_[^"]+)"/i);
    const event = extractCell(row, "event");
    if (!event) continue;

    entries.push({
      id: idMatch?.[1] ?? `event-${entries.length + 1}`,
      timeLabel: extractCell(row, "time") || "Tüm Gün",
      currency: extractCell(row, "flagCur") || extractCell(row, "cur"),
      event,
      importance: parseImportance(row),
      actual: extractCell(row, "act") || "-",
      forecast: extractCell(row, "fore") || "-",
      previous: extractCell(row, "prev") || "-",
    });
  }

  return entries;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDateRange(range: CalendarRange): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);

  if (range === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (range === "tomorrow") {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  } else if (range === "week") {
    end.setDate(end.getDate() + 7);
  }

  return { from: formatDate(start), to: formatDate(end) };
}

function parseGenericRows(html: string, category: CalendarCategory): CalendarEntry[] {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const entries: CalendarEntry[] = [];

  for (const row of rows) {
    if (!/<td/i.test(row)) continue;
    const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi))
      .map((match) => stripTags(match[1]))
      .filter(Boolean);
    if (cells.length < 2) continue;

    const [c1 = "-", c2 = "-", c3 = "-", c4 = "-", c5 = "-", c6 = "-", c7 = "-"] = cells;

    if (category === "holidays") {
      entries.push({
        id: `${category}-${entries.length + 1}`,
        timeLabel: c1 || "Tüm Gün",
        currency: c2 || "-",
        event: c3 || c2,
        importance: "Orta",
        actual: "-",
        forecast: "-",
        previous: "-",
      });
      continue;
    }

    if (category === "dividends") {
      entries.push({
        id: `${category}-${entries.length + 1}`,
        timeLabel: c2 || c1,
        currency: "-",
        event: c1,
        importance: "Orta",
        actual: c3 || "-",
        forecast: c4 || "-",
        previous: c5 || "-",
      });
      continue;
    }

    if (category === "splits") {
      entries.push({
        id: `${category}-${entries.length + 1}`,
        timeLabel: c2 || c1,
        currency: "-",
        event: c1,
        importance: "Orta",
        actual: c3 || "-",
        forecast: c4 || "-",
        previous: c5 || "-",
      });
      continue;
    }

    entries.push({
      id: `${category}-${entries.length + 1}`,
      timeLabel: c2 || c1,
      currency: "-",
      event: c1,
      importance: "Orta",
      actual: c3 || "-",
      forecast: c4 || "-",
      previous: c5 || "-",
    });
  }

  return entries;
}

function buildServiceBody(category: CalendarCategory, range: CalendarRange, tabAlias?: string): URLSearchParams {
  const { from, to } = buildDateRange(range);
  const body = new URLSearchParams();
  body.set("dateFrom", from);
  body.set("dateTo", to);
  body.set("timeZone", "55");
  body.set("timeFilter", "timeOnly");
  body.set("currentTab", tabAlias ?? (category === "economic" ? "custom" : category));
  body.set("limit_from", "0");
  body.set("submitFilters", "1");
  body.set("country[]", "");
  body.set("importance[]", "-1");
  body.set("importance[]", "0");
  body.set("importance[]", "1");
  body.set("importance[]", "2");
  body.set("importance[]", "3");
  body.set("category[]", "");
  body.set("date", from);
  return body;
}

async function fetchCalendarRowsFromService(category: CalendarCategory, range: CalendarRange): Promise<CalendarEntry[]> {
  const referer = REFERERS[category];
  const attempts: Array<{ endpoint: string; alias: string }> = [];

  for (const alias of TAB_ALIASES[category]) {
    attempts.push({ endpoint: PRIMARY_ENDPOINT, alias });
  }
  attempts.push({ endpoint: FALLBACK_ENDPOINTS[category], alias: category });

  for (const attempt of attempts) {
    const response = await fetch(attempt.endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: "https://tr.investing.com",
        Referer: referer,
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: buildServiceBody(category, range, attempt.alias).toString(),
      cache: "no-store",
    });

    if (!response.ok) continue;
    const payload = (await response.json()) as { data?: string };
    const rowsHtml = typeof payload.data === "string" ? payload.data : "";
    if (!rowsHtml) continue;

    const parsed = category === "economic" ? parseRows(rowsHtml) : parseGenericRows(rowsHtml, category);
    if (parsed.length > 0) return parsed;
  }

  return [];
}

async function fetchCalendarRowsFromPage(): Promise<CalendarEntry[]> {
  const response = await fetch(INVESTING_CALENDAR_URL, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": UA,
    },
    cache: "no-store",
  });

  if (!response.ok) return [];
  const html = await response.text();
  return parseRows(html);
}

function filterByCategory(entries: CalendarEntry[], category: CalendarCategory): CalendarEntry[] {
  const normalized = (entry: CalendarEntry) => `${entry.event} ${entry.currency}`.toLowerCase();
  if (category === "economic") {
    return entries.filter((entry) => !/(tatil|holiday|bayram|temett|dividend|split|bölünme|ipo|halka arz)/i.test(normalized(entry)));
  }
  if (category === "holidays") return entries;
  if (category === "dividends") return entries;
  if (category === "splits") return entries;
  return entries;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryParam = (searchParams.get("tab") ?? "economic").toLowerCase();
  const rangeParam = (searchParams.get("range") ?? "today").toLowerCase();

  const category: CalendarCategory = ["economic", "holidays", "dividends", "splits", "ipo"].includes(categoryParam)
    ? (categoryParam as CalendarCategory)
    : "economic";
  const range: CalendarRange = ["yesterday", "today", "tomorrow", "week"].includes(rangeParam)
    ? (rangeParam as CalendarRange)
    : "today";

  let entries: CalendarEntry[] = [];
  try {
    entries = await fetchCalendarRowsFromService(category, range);
    if (entries.length === 0 && category === "economic") {
      entries = await fetchCalendarRowsFromPage();
    }
  } catch {
    entries = [];
  }

  const filtered = filterByCategory(entries, category);

  return NextResponse.json(
    {
      tab: category,
      range,
      updatedAt: new Date().toISOString(),
      entries: filtered.slice(0, 80),
    },
    { status: 200 }
  );
}
