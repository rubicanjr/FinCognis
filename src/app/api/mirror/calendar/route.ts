import { NextResponse } from "next/server";
import {
  EconomicMirrorResponseSchema,
  EconomicRangeSchema,
  EconomicTabSchema,
  type EconomicRange,
  type EconomicTab,
} from "@/lib/economic-calendar/schema";
import { buildCalendarCacheKey, cacheEventToApiEvent, getCalendarCachePort } from "@/lib/economic-calendar/cache-port";

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

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const tab = parseTab(searchParams.get("tab"));
  const range = parseRange(searchParams.get("range"));

  try {
    const cachePort = getCalendarCachePort();
    const cacheKey = buildCalendarCacheKey(tab, range);
    const cached = await cachePort.get(cacheKey);

    if (!cached) {
      return NextResponse.json(
        {
          code: "DATA_WARMING_UP",
          error: "Takvim verisi hazırlanıyor. Lütfen kısa süre sonra tekrar deneyin.",
          tab,
          range,
          updatedAt: null,
          events: [],
        },
        {
          status: 503,
          headers: {
            "X-Data-Age": "empty",
          },
        },
      );
    }

    const responsePayload = EconomicMirrorResponseSchema.parse({
      tab,
      range,
      updatedAt: new Date(cached.lastUpdated).toISOString(),
      events: cached.data.map(cacheEventToApiEvent),
    });

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: {
        "X-Data-Age": cached.isStale ? "stale" : "fresh",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen takvim hatası";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
