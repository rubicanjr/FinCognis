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
const INVESTING_CALENDAR_SERVICE_URL = "https://tr.investing.com/economic-calendar/Service/getCalendarFilteredData";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

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

function mapRangeToCurrentTab(range: CalendarRange): string {
  if (range === "yesterday") return "yesterday";
  if (range === "tomorrow") return "tomorrow";
  if (range === "week") return "thisWeek";
  return "today";
}

function buildServiceBody(range: CalendarRange): URLSearchParams {
  const body = new URLSearchParams();
  body.set("timeZone", "55");
  body.set("timeFilter", "timeRemain");
  body.set("currentTab", mapRangeToCurrentTab(range));
  body.set("limit_from", "0");
  body.set("submitFilters", "0");
  return body;
}

async function fetchCalendarRowsFromService(range: CalendarRange): Promise<CalendarEntry[]> {
  const response = await fetch(INVESTING_CALENDAR_SERVICE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://tr.investing.com",
      Referer: "https://tr.investing.com/economic-calendar/",
      "User-Agent": UA,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: buildServiceBody(range).toString(),
    cache: "no-store",
  });

  if (!response.ok) return [];
  const payload = (await response.json()) as { data?: string };
  const rowsHtml = typeof payload.data === "string" ? payload.data : "";
  if (!rowsHtml) return [];
  return parseRows(rowsHtml);
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
  if (category === "economic") return entries;
  if (category === "holidays") return entries.filter((entry) => /(tatil|holiday|bayram)/i.test(normalized(entry)));
  if (category === "dividends") return entries.filter((entry) => /(temett|dividend|kar payı)/i.test(normalized(entry)));
  if (category === "splits") return entries.filter((entry) => /(split|bölünme|hisse bölün)/i.test(normalized(entry)));
  return entries.filter((entry) => /(ipo|halka arz|arz)/i.test(normalized(entry)));
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
    entries = await fetchCalendarRowsFromService(range);
    if (entries.length === 0) {
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

