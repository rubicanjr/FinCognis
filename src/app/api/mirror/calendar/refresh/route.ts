import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { EconomicRangeSchema, EconomicTabSchema, type EconomicRange, type EconomicTab } from "@/lib/economic-calendar/schema";
import {
  buildCalendarCacheKey,
  buildCalendarLockKey,
  CALENDAR_FALLBACK_TTL_SECONDS,
  CALENDAR_LOCK_TTL_SECONDS,
  CALENDAR_TTL_SECONDS,
  createFallbackCachePayload,
  getCalendarCachePort,
  type CachePort,
  type WorkerStatus,
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

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown worker error";
}

function classifyWorkerError(error: unknown): WorkerStatus {
  const message = normalizeErrorMessage(error).toLowerCase();
  if (message.includes("timeout")) return "TIMEOUT";
  if (message.includes("cloudflare") || message.includes("waf") || message.includes("captcha") || message.includes("forbidden")) {
    return "WAF_BLOCKED";
  }
  return "FATAL_ERROR";
}

function classifyRefreshReason(reason: string | undefined): WorkerStatus {
  if (!reason) return "FATAL_ERROR";
  if (reason.includes("timeout")) return "TIMEOUT";
  if (reason.includes("empty_or_invalid_source") || reason.includes("waf") || reason.includes("cloudflare")) return "WAF_BLOCKED";
  return "FATAL_ERROR";
}

async function writeFallbackIfNeeded(
  cachePort: CachePort,
  dataKey: string,
  status: WorkerStatus,
): Promise<{ seeded: boolean }> {
  const cached = await cachePort.get(dataKey);
  if (cached) {
    await cachePort.extendTtl(dataKey, CALENDAR_TTL_SECONDS);
    return { seeded: false };
  }

  await cachePort.set(dataKey, createFallbackCachePayload(status), CALENDAR_FALLBACK_TTL_SECONDS);
  return { seeded: true };
}

async function releaseLockSafely(cachePort: CachePort, lockKey: string, lockOwner: string): Promise<void> {
  try {
    await cachePort.releaseLock(lockKey, lockOwner);
  } catch (error) {
    console.error({
      event: "LOCK_RELEASE_FAILED",
      lockKey,
      reason: normalizeErrorMessage(error),
    });
  }
}

async function runSingleRefresh(cachePort: CachePort, tab: EconomicTab, range: EconomicRange, mode: string): Promise<NextResponse> {
  const lockKey = buildCalendarLockKey(tab, range);
  const dataKey = buildCalendarCacheKey(tab, range);
  const lockOwner = randomUUID();

  const lockAcquired = await cachePort.acquireLock(lockKey, CALENDAR_LOCK_TTL_SECONDS, lockOwner);
  if (!lockAcquired) {
    return NextResponse.json({ ok: false, mode, status: "LOCKED" }, { status: 429 });
  }

  try {
    const result = await refreshCalendarCache(tab, range, cachePort);
    if (result.ok) {
      return NextResponse.json({ ok: true, mode, result, status: "SUCCESS" }, { status: 200 });
    }

    const workerStatus = classifyRefreshReason(result.reason);
    const fallbackState = await writeFallbackIfNeeded(cachePort, dataKey, workerStatus);
    console.error({
      event: "SCRAPE_FAILED",
      reason: result.reason ?? "empty_refresh_result",
      tab,
      range,
      workerStatus,
      fallbackSeeded: fallbackState.seeded,
    });

    return NextResponse.json(
      {
        ok: false,
        mode,
        result,
        workerStatus,
        status: fallbackState.seeded ? "FALLBACK_SEEDED" : "STALE_EXTENDED",
      },
      { status: 200 },
    );
  } catch (error) {
    const workerStatus = classifyWorkerError(error);
    const reason = normalizeErrorMessage(error);
    const fallbackState = await writeFallbackIfNeeded(cachePort, dataKey, workerStatus);
    console.error({
      event: "SCRAPE_FAILED",
      reason,
      tab,
      range,
      workerStatus,
      fallbackSeeded: fallbackState.seeded,
    });

    return NextResponse.json(
      {
        ok: false,
        mode,
        error: reason,
        workerStatus,
        status: fallbackState.seeded ? "FALLBACK_SEEDED" : "STALE_EXTENDED",
      },
      { status: 500 },
    );
  } finally {
    await releaseLockSafely(cachePort, lockKey, lockOwner);
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized refresh request" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") ?? "single";

  try {
    const cachePort = getCalendarCachePort();
    if (mode === "batch") {
      const results = await refreshDefaultCalendarCache(cachePort);
      return NextResponse.json({ ok: true, mode, results }, { status: 200 });
    }

    const tab = parseTab(params.get("tab"));
    const range = parseRange(params.get("range"));
    return runSingleRefresh(cachePort, tab, range, mode);
  } catch (error) {
    const workerStatus = classifyWorkerError(error);
    const reason = normalizeErrorMessage(error);
    console.error({
      event: "REFRESH_BOOTSTRAP_FAILED",
      reason,
      workerStatus,
    });

    return NextResponse.json({ ok: false, mode, error: reason, workerStatus, status: "FAILED" }, { status: 500 });
  }
}
