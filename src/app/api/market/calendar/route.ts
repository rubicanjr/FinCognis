import { NextResponse } from "next/server";
import { EconomicRangeSchema, EconomicTabSchema, type EconomicRange, type EconomicTab } from "@/lib/economic-calendar/schema";
import { fetchEconomicEvents } from "@/lib/economic-calendar/mirror";

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

function toLegacyEntries(events: Awaited<ReturnType<typeof fetchEconomicEvents>>["events"]): LegacyCalendarEntry[] {
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

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const tab = parseTab(searchParams.get("tab"));
  const range = parseRange(searchParams.get("range"));

  try {
    const result = await fetchEconomicEvents(tab, range);
    return NextResponse.json(
      {
        tab,
        range,
        updatedAt: result.updatedAt,
        entries: toLegacyEntries(result.events),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen takvim hatası";
    return NextResponse.json({ error: message, entries: [] }, { status: 502 });
  }
}
