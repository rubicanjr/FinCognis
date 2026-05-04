import { NextResponse } from "next/server";
import {
  EconomicMirrorResponseSchema,
  EconomicRangeSchema,
  EconomicTabSchema,
  type EconomicRange,
  type EconomicTab,
} from "@/lib/economic-calendar/schema";
import {
  buildCalendarCacheKey,
  cacheEventToApiEvent,
  getCalendarCachePort,
  shouldTreatAsStale,
} from "@/lib/economic-calendar/cache-port";

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

function buildRefreshUrl(request: Request, tab: EconomicTab, range: EconomicRange, sync: boolean): string {
  const url = new URL("/api/mirror/calendar/refresh", request.url);
  url.searchParams.set("mode", "single");
  url.searchParams.set("tab", tab);
  url.searchParams.set("range", range);
  if (sync) url.searchParams.set("sync", "1");

  const secret = process.env.CALENDAR_REFRESH_SECRET;
  if (secret) url.searchParams.set("secret", secret);

  return url.toString();
}

async function triggerRefresh(request: Request, tab: EconomicTab, range: EconomicRange, sync: boolean): Promise<void> {
  const url = buildRefreshUrl(request, tab, range, sync);
  await fetch(url, {
    method: "POST",
    cache: "no-store",
    signal: sync ? AbortSignal.timeout(5000) : undefined,
  });
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const tab = parseTab(searchParams.get("tab"));
  const range = parseRange(searchParams.get("range"));

  try {
    const cachePort = getCalendarCachePort();
    const cacheKey = buildCalendarCacheKey(tab, range);
    const cached = await cachePort.get(cacheKey);
    if (cached) {
      const responsePayload = EconomicMirrorResponseSchema.parse({
        tab,
        range,
        updatedAt: new Date(cached.lastUpdated).toISOString(),
        events: cached.data.map(cacheEventToApiEvent),
      });

      return NextResponse.json(responsePayload, {
        status: 200,
        headers: {
          "X-Cache-Status": "HIT",
          "X-Data-Age": shouldTreatAsStale(cached.lastUpdated) ? "stale" : "fresh",
        },
      });
    }

    await triggerRefresh(request, tab, range, true).catch(() => undefined);

    const warmed = await cachePort.get(cacheKey);
    if (warmed) {
      const responsePayload = EconomicMirrorResponseSchema.parse({
        tab,
        range,
        updatedAt: new Date(warmed.lastUpdated).toISOString(),
        events: warmed.data.map(cacheEventToApiEvent),
      });

      return NextResponse.json(responsePayload, {
        status: 200,
        headers: {
          "X-Cache-Status": "FAST-WARM",
          "X-Data-Age": shouldTreatAsStale(warmed.lastUpdated) ? "stale" : "fresh",
        },
      });
    }

    void triggerRefresh(request, tab, range, false);

    return NextResponse.json(
      {
        status: "INITIALIZING",
        message: "Veriler ilk kez hazırlanıyor, lütfen bekleyin...",
        tab,
        range,
        updatedAt: null,
        events: [],
      },
      {
        status: 202,
        headers: {
          "X-Cache-Status": "MISS",
          "X-Data-Age": "empty",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen takvim hatası";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
