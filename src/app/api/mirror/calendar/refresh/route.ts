import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { EconomicRangeSchema, EconomicTabSchema, type EconomicRange, type EconomicTab } from "@/lib/economic-calendar/schema";
import {
  buildCalendarCacheKey,
  buildCalendarLockKey,
  CALENDAR_LOCK_TTL_SECONDS,
  CALENDAR_TTL_SECONDS,
  getCalendarCachePort,
} from "@/lib/economic-calendar/cache-port";
import { refreshCalendarCache, refreshDefaultCalendarCache } from "@/lib/economic-calendar/mirror";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTab(value: string | null): EconomicTab {
  const parsed = EconomicTabSchema.safeParse(value);
  return parsed.success ? parsed.data : "economic";
}

function parseRange(value: string | null): EconomicRange {
  const parsed = EconomicRangeSchema.safeParse(value);
  return parsed.success ? parsed.data : "today";
}

function isAuthorized(request: Request): boolean {
  const configured = process.env.CALENDAR_REFRESH_SECRET;
  if (!configured) return true;

  const headerToken = request.headers.get("x-refresh-secret");
  const queryToken = new URL(request.url).searchParams.get("secret");
  return headerToken === configured || queryToken === configured;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized refresh request" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") ?? "single";
  const cachePort = getCalendarCachePort();

  try {
    if (mode === "batch") {
      const results = await refreshDefaultCalendarCache(cachePort);
      return NextResponse.json({ ok: true, mode, results }, { status: 200 });
    }

    const tab = parseTab(params.get("tab"));
    const range = parseRange(params.get("range"));
    const lockKey = buildCalendarLockKey(tab, range);
    const dataKey = buildCalendarCacheKey(tab, range);
    const lockOwner = randomUUID();

    const lockAcquired = await cachePort.acquireLock(lockKey, CALENDAR_LOCK_TTL_SECONDS, lockOwner);
    if (!lockAcquired) {
      return NextResponse.json({ ok: true, mode, status: "LOCKED" }, { status: 202 });
    }

    try {
      const result = await refreshCalendarCache(tab, range, cachePort);
      if (result.ok) return NextResponse.json({ ok: true, mode, result }, { status: 200 });

      await cachePort.extendTtl(dataKey, CALENDAR_TTL_SECONDS);
      return NextResponse.json({ ok: false, mode, result, status: "STALE_EXTENDED" }, { status: 202 });
    } catch (error) {
      await cachePort.extendTtl(dataKey, CALENDAR_TTL_SECONDS).catch(() => undefined);
      const message = error instanceof Error ? error.message : "Unknown worker error";
      return NextResponse.json({ ok: false, error: message, status: "FAILED_STALE_EXTENDED" }, { status: 500 });
    } finally {
      await cachePort.releaseLock(lockKey, lockOwner).catch(() => undefined);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown worker error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
