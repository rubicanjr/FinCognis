import { NextResponse } from "next/server";
import { fetchCalendarEvents } from "@/lib/economic-calendar/mirror";
import { EconomicRangeSchema, EconomicTabSchema, type EconomicRange, type EconomicTab } from "@/lib/economic-calendar/schema";

interface LegacyCalendarEntry {
  id: string;
  timeLabel: string;
  currency: string;
  event: string;
  importance: "Yüksek" | "Orta" | "Düşük";
  actual: string;
  forecast: string;
  previous: string;
}

function parseTab(value: string | null): EconomicTab {
  const parsed = EconomicTabSchema.safeParse(value);
  return parsed.success ? parsed.data : "economic";
}

function parseRange(value: string | null): EconomicRange {
  const parsed = EconomicRangeSchema.safeParse(value);
  return parsed.success ? parsed.data : "today";
}

function toImportanceLabel(value: 1 | 2 | 3): "Yüksek" | "Orta" | "Düşük" {
  if (value === 3) return "Yüksek";
  if (value === 2) return "Orta";
  return "Düşük";
}

function toLegacyEntries(events: Awaited<ReturnType<typeof fetchCalendarEvents>>["events"]): LegacyCalendarEntry[] {
  return events.map((event) => ({
    id: event.id,
    timeLabel: new Date(event.time).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    currency: event.currency,
    event: event.eventTitle,
    importance: toImportanceLabel(event.importance),
    actual: event.actual ?? "-",
    forecast: event.forecast ?? "-",
    previous: event.previous ?? "-",
  }));
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const tab = parseTab(searchParams.get("tab"));
  const range = parseRange(searchParams.get("range"));

  const result = await fetchCalendarEvents(tab, range);
  return NextResponse.json(
    {
      status: result.status,
      tab,
      range,
      updatedAt: result.updatedAt,
      entries: toLegacyEntries(result.events),
      message: result.message,
    },
    { status: 200 },
  );
}
