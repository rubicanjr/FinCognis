import { NextResponse } from "next/server";
import { fetchCalendarEvents, type CalendarFetchResult } from "@/lib/economic-calendar/mirror";
import {
  EconomicMirrorResponseSchema,
  EconomicRangeSchema,
  EconomicTabSchema,
  type EconomicRange,
  type EconomicTab,
} from "@/lib/economic-calendar/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseTab(value: string | null): EconomicTab {
  const parsed = EconomicTabSchema.safeParse(value);
  return parsed.success ? parsed.data : "economic";
}

function parseRange(value: string | null): EconomicRange {
  const parsed = EconomicRangeSchema.safeParse(value);
  return parsed.success ? parsed.data : "today";
}

async function fetchWithTimeout(tab: EconomicTab, range: EconomicRange) {
  return Promise.race([
    fetchCalendarEvents(tab, range),
    new Promise<CalendarFetchResult>((resolve) => {
      setTimeout(() => {
        resolve({
          status: "SOURCE_UNAVAILABLE",
          tab,
          range,
          updatedAt: null,
          events: [],
          message: "Takvim kaynağı zaman aşımına uğradı. Lütfen kısa süre sonra tekrar deneyin.",
          source: "none",
          reason: "timeout",
        });
      }, 15_000);
    }),
  ]);
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const tab = parseTab(searchParams.get("tab"));
  const range = parseRange(searchParams.get("range"));

  try {
    const result = await fetchWithTimeout(tab, range);
    const payload = EconomicMirrorResponseSchema.parse({
      status: result.status,
      message: result.message,
      tab: result.tab,
      range: result.range,
      updatedAt: result.updatedAt,
      events: result.events,
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "X-Calendar-Status": result.status,
        "X-Calendar-Source": result.source,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Takvim verisi şu anda alınamıyor.";
    const payload = EconomicMirrorResponseSchema.parse({
      status: "SOURCE_UNAVAILABLE",
      message: "Takvim verisinde geçici senkronizasyon gecikmesi var. Lütfen kısa süre sonra tekrar deneyin.",
      tab,
      range,
      updatedAt: null,
      events: [],
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "X-Calendar-Status": "SOURCE_UNAVAILABLE",
        "X-Calendar-Source": "none",
        "X-Calendar-Error": message,
      },
    });
  }
}
