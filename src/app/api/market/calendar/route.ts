import { NextResponse } from "next/server";
import { EconomicRangeSchema, EconomicTabSchema, type EconomicRange, type EconomicTab } from "@/lib/economic-calendar/schema";
import { buildCalendarCacheKey, getCalendarCachePort, type EconomicEvent as CachedEconomicEvent } from "@/lib/economic-calendar/cache-port";

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

function toLegacyEntries(events: CachedEconomicEvent[]): LegacyCalendarEntry[] {
  return events.map((event) => ({
    id: `${event.time}-${event.currency}-${event.event}`,
    timeLabel: new Date(event.time).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    currency: event.currency,
    event: event.event,
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
    const cachePort = getCalendarCachePort();
    const cached = await cachePort.get(buildCalendarCacheKey(tab, range));
    if (!cached) {
      return NextResponse.json({ error: "Takvim verisi hazırlanıyor.", entries: [] }, { status: 503 });
    }

    return NextResponse.json(
      {
        tab,
        range,
        updatedAt: new Date(cached.lastUpdated).toISOString(),
        entries: toLegacyEntries(cached.data),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen takvim hatası";
    return NextResponse.json({ error: message, entries: [] }, { status: 502 });
  }
}
