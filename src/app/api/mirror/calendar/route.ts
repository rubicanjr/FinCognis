import { NextResponse } from "next/server";
import { fetchCalendarEvents, type CalendarFetchResult } from "@/lib/api/calendar-client";
import {
  EconomicMirrorResponseSchema,
  EconomicRangeSchema,
  EconomicTabSchema,
  type EconomicRange,
  type EconomicTab,
} from "@/lib/economic-calendar/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildSignature(): string {
  return process.env.RENDER_GIT_COMMIT?.slice(0, 8) ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "local";
}

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
          status: "COOLDOWN",
          tab,
          range,
          updatedAt: null,
          events: [],
          message: "Takvim kaynağı zaman aşımına uğradı. Lütfen kısa süre sonra tekrar deneyin.",
          source: "cache",
          reason: "timeout",
          metadata: {
            stale_age_seconds: -1,
            next_sync_permitted_at: new Date(Date.now() + 5 * 60_000).toISOString(),
            reason_code: "ERROR_CODE_TIMEOUT",
          },
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
      source: result.source,
      reason: result.reason,
      metadata: result.metadata,
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "X-Calendar-Status": result.status,
        "X-Calendar-Source": result.source,
        "X-Calendar-Reason": result.reason ?? "none",
        "X-Calendar-Build": buildSignature(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Takvim verisi şu anda alınamıyor.";
    const payload = EconomicMirrorResponseSchema.parse({
      status: "COOLDOWN",
      message: "Takvim verisinde geçici senkronizasyon gecikmesi var. Lütfen kısa süre sonra tekrar deneyin.",
      tab,
      range,
      updatedAt: null,
      events: [],
      source: "cache",
      reason: "route_exception",
      metadata: {
        stale_age_seconds: -1,
        next_sync_permitted_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        reason_code: "ERROR_CODE_ROUTE_EXCEPTION",
      },
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "X-Calendar-Status": "COOLDOWN",
        "X-Calendar-Source": "cache",
        "X-Calendar-Reason": "route_exception",
        "X-Calendar-Build": buildSignature(),
        "X-Calendar-Error": message,
      },
    });
  }
}
