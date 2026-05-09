# Economic Calendar Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the real `Takvim sağlayıcısına şu anda erişilemiyor.` case by making the economic calendar cache-first, rate-limit-aware, observable, and user-friendly.

**Architecture:** Keep the public API route stable but enrich its status semantics. Move from request-time provider dependency toward Last Known Good cache + cooldown/circuit-breaker + scheduled refresh. UI displays one clear state: healthy, stale/degraded, empty, or hard unavailable.

**Tech Stack:** Next.js 15 Route Handlers, React 18, TailwindCSS, Upstash Redis REST, RapidAPI, Zod, Vitest, Playwright.

---

## Verified Case Summary

- [VERIFIED] Live endpoint `https://fincognis.com/api/mirror/calendar?tab=economic&range=today` returned HTTP 200 with `X-Calendar-Status: SOURCE_UNAVAILABLE`, `X-Calendar-Source: none`, `X-Calendar-Reason: http_429`, body `events: []`, `updatedAt: null` on 2026-05-09.
- [VERIFIED] All 20 checked tab/range combinations returned the same aggregate state: `SOURCE_UNAVAILABLE|none|http_429|events=0|updatedAt=null`.
- [VERIFIED] `src/lib/api/calendar-client.ts:363-385` maps a non-OK RapidAPI result with no cached data to `SOURCE_UNAVAILABLE`, `events: []`, message `Takvim sağlayıcısına şu anda erişilemiyor.`, and reason `http_${rapidResult.status}`.
- [VERIFIED] `src/lib/api/calendar-client.ts:321-347` already supports cache fallback for fresh cache and missing API key when cache exists.
- [VERIFIED] `src/lib/api/calendar-client.ts:363-375` already supports stale cache fallback when RapidAPI returns non-OK and cached data exists.
- [VERIFIED] `src/hooks/useEconomicCalendar.ts:88-93` converts every `SOURCE_UNAVAILABLE` into the generic empty-state message `Veri sunucusu senkronizasyonunda geçici bir gecikme yaşanıyor.`.
- [VERIFIED] `src/components/landing/EconomicCalendarPanel.tsx:138-149` renders a toast and `src/components/landing/EconomicCalendarPanel.tsx:196-198` renders an additional bottom note for `SOURCE_UNAVAILABLE`, causing duplicate messaging.
- [VERIFIED] `src/app/api/mirror/calendar/refresh/route.ts:6-14` disables the refresh worker with HTTP 410.

## Root Cause Model

The user-facing failure is not a React rendering bug. It is a provider-path failure: RapidAPI is returning HTTP 429, there is no usable cached calendar payload for the requested keys, and the API route intentionally converts that into a 200 business response with `SOURCE_UNAVAILABLE`. The UI then shows both a toast and empty-state fallback.

Primary fix path:
1. Preserve precise provider reason (`http_429`) in body and headers.
2. Avoid calling RapidAPI on every public request during provider cooldown.
3. Ensure at least one Last Known Good snapshot exists before users hit the page.
4. Improve UI state language so “rate-limited but cached” and “hard unavailable/no cache” are distinct.

## File Structure

- Modify: `src/lib/economic-calendar/schema.ts` — extend response metadata with `source`, `reason`, `isStale`, `ageSeconds`, `retryAfterSeconds`.
- Modify: `src/lib/economic-calendar/cache-port.ts` — add `RATE_LIMITED` worker state and cooldown/status key helpers.
- Modify: `src/lib/api/calendar-client.ts` — implement reason-aware responses, cache-first behavior, cooldown short-circuit, and cache writes with durable TTL.
- Modify: `src/app/api/mirror/calendar/route.ts` — propagate metadata in response body and headers.
- Modify: `src/hooks/useEconomicCalendar.ts` — derive UI messages from status/reason/stale metadata.
- Modify: `src/components/landing/EconomicCalendarPanel.tsx` — remove duplicate error copy; add stale/rate-limit badge.
- Modify: `src/app/api/mirror/calendar/refresh/route.ts` — re-enable protected refresh or replace with scheduled-safe worker endpoint.
- Modify tests: `src/lib/api/calendar-client.test.ts`, `src/app/api/mirror/calendar/route.test.ts`, `src/app/api/mirror/calendar/refresh/route.test.ts`.
- Optional create: `src/lib/api/calendar-client.diagnostics.test.ts` — focused tests for cooldown and metadata.

---

### Task 1: Extend API Schema Metadata

**Files:**
- Modify: `src/lib/economic-calendar/schema.ts`
- Modify: `src/app/api/mirror/calendar/route.test.ts`

- [ ] **Step 1: Write failing route schema test**

Add this test to `src/app/api/mirror/calendar/route.test.ts`:

```ts
it("includes provider metadata in SOURCE_UNAVAILABLE response", async () => {
  mockFetchCalendarEvents.mockResolvedValueOnce({
    status: "SOURCE_UNAVAILABLE",
    tab: "economic",
    range: "today",
    updatedAt: null,
    events: [],
    message: "Takvim sağlayıcısı hız sınırına ulaştı.",
    source: "none",
    reason: "http_429",
    isStale: false,
    ageSeconds: null,
    retryAfterSeconds: 300,
  });

  const { GET } = await import("@/app/api/mirror/calendar/route");
  const response = await GET(new Request("http://localhost/api/mirror/calendar?tab=economic&range=today"));
  const payload = (await response.json()) as {
    source: string;
    reason: string;
    isStale: boolean;
    ageSeconds: number | null;
    retryAfterSeconds: number | null;
  };

  expect(payload.source).toBe("none");
  expect(payload.reason).toBe("http_429");
  expect(payload.isStale).toBe(false);
  expect(payload.ageSeconds).toBeNull();
  expect(payload.retryAfterSeconds).toBe(300);
  expect(response.headers.get("X-Calendar-Reason")).toBe("http_429");
});
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
npm run test -- src/app/api/mirror/calendar/route.test.ts
```

Expected: FAIL because response schema strips or rejects new metadata fields.

- [ ] **Step 3: Extend schema**

Update `EconomicMirrorResponseSchema` in `src/lib/economic-calendar/schema.ts`:

```ts
export const EconomicMirrorResponseSchema = z.object({
  status: EconomicMirrorStatusSchema,
  message: z.string().nullable().default(null),
  tab: EconomicTabSchema,
  range: EconomicRangeSchema,
  updatedAt: z.string().nullable(),
  events: z.array(EconomicEventSchema),
  source: z.enum(["rapidapi", "cache", "none"]).default("none"),
  reason: z.string().nullable().default(null),
  isStale: z.boolean().default(false),
  ageSeconds: z.number().int().nonnegative().nullable().default(null),
  retryAfterSeconds: z.number().int().positive().nullable().default(null),
});
```

- [ ] **Step 4: Propagate metadata in route**

In `src/app/api/mirror/calendar/route.ts`, include these fields in the parsed payload:

```ts
const payload = EconomicMirrorResponseSchema.parse({
  status: result.status,
  message: result.message,
  tab: result.tab,
  range: result.range,
  updatedAt: result.updatedAt,
  events: result.events,
  source: result.source,
  reason: result.reason,
  isStale: result.isStale ?? false,
  ageSeconds: result.ageSeconds ?? null,
  retryAfterSeconds: result.retryAfterSeconds ?? null,
});
```

In catch fallback add:

```ts
source: "none",
reason: "route_exception",
isStale: false,
ageSeconds: null,
retryAfterSeconds: null,
```

- [ ] **Step 5: Run test to verify pass**

Run:

```powershell
npm run test -- src/app/api/mirror/calendar/route.test.ts
```

Expected: PASS.

---

### Task 2: Add Rate-Limit Cooldown State

**Files:**
- Modify: `src/lib/economic-calendar/cache-port.ts`
- Modify: `src/lib/api/calendar-client.ts`
- Modify: `src/lib/api/calendar-client.test.ts`

- [ ] **Step 1: Write failing cooldown test**

Add to `src/lib/api/calendar-client.test.ts`:

```ts
it("does not call RapidAPI during rate-limit cooldown when no cache exists", async () => {
  const cache = new FakeCachePort(null);
  const fetchImpl = vi.fn<typeof fetch>();

  cache.value = {
    lastUpdated: Date.now(),
    data: [],
    workerStatus: {
      status: "RATE_LIMITED",
      timestamp: Date.now() - 60_000,
    },
    isFallbackData: true,
    isStale: false,
  };

  const result = await fetchCalendarEvents("economic", "today", { fetchImpl, cachePort: cache });

  expect(fetchImpl).not.toHaveBeenCalled();
  expect(result.status).toBe("SOURCE_UNAVAILABLE");
  expect(result.reason).toBe("cooldown_active");
  expect(result.retryAfterSeconds).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
npm run test -- src/lib/api/calendar-client.test.ts
```

Expected: FAIL because `RATE_LIMITED` is not a valid worker status and cooldown logic does not exist.

- [ ] **Step 3: Extend worker status**

In `src/lib/economic-calendar/cache-port.ts`:

```ts
export type WorkerStatus = "SUCCESS" | "WAF_BLOCKED" | "TIMEOUT" | "FATAL_ERROR" | "RATE_LIMITED";
```

Update `isWorkerState` status check to include `RATE_LIMITED`.

- [ ] **Step 4: Add cooldown helper**

In `src/lib/api/calendar-client.ts`:

```ts
const RATE_LIMIT_COOLDOWN_SECONDS = 5 * 60;

function getCooldownRemainingSeconds(cached: Awaited<ReturnType<CachePort["get"]>>): number | null {
  if (!cached || cached.workerStatus.status !== "RATE_LIMITED") return null;
  const elapsedSeconds = Math.floor((Date.now() - cached.workerStatus.timestamp) / 1000);
  const remaining = RATE_LIMIT_COOLDOWN_SECONDS - elapsedSeconds;
  return remaining > 0 ? remaining : null;
}
```

- [ ] **Step 5: Short-circuit in `fetchCalendarEvents`**

After reading `cached`, before reading the API key:

```ts
const cooldownRemaining = getCooldownRemainingSeconds(cached);
if (cooldownRemaining !== null) {
  const cachedEvents = fromCacheEvents(cached);
  return {
    status: cachedEvents.length > 0 ? "READY" : "SOURCE_UNAVAILABLE",
    tab,
    range,
    updatedAt: cached?.lastUpdated ? new Date(cached.lastUpdated).toISOString() : null,
    events: cachedEvents,
    message:
      cachedEvents.length > 0
        ? "Takvim sağlayıcısı hız sınırında. Son doğrulanan veri gösteriliyor."
        : "Takvim sağlayıcısı hız sınırında. Kısa süre sonra tekrar denenecek.",
    source: cachedEvents.length > 0 ? "cache" : "none",
    reason: "cooldown_active",
    isStale: cached ? shouldTreatAsStale(cached.lastUpdated) : false,
    ageSeconds: cached ? Math.floor((Date.now() - cached.lastUpdated) / 1000) : null,
    retryAfterSeconds: cooldownRemaining,
  };
}
```

- [ ] **Step 6: Run test to verify pass**

Run:

```powershell
npm run test -- src/lib/api/calendar-client.test.ts
```

Expected: PASS.

---

### Task 3: Store Rate-Limit Fallback Payload on 429

**Files:**
- Modify: `src/lib/api/calendar-client.ts`
- Modify: `src/lib/api/calendar-client.test.ts`

- [ ] **Step 1: Write failing no-cache 429 test**

Add:

```ts
it("stores RATE_LIMITED fallback metadata when RapidAPI returns 429 without cache", async () => {
  const cache = new FakeCachePort(null);
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ message: "rate limit" }), { status: 429 });

  const result = await fetchCalendarEvents("economic", "today", { fetchImpl, cachePort: cache });

  expect(result.status).toBe("SOURCE_UNAVAILABLE");
  expect(result.reason).toBe("http_429");
  expect(result.retryAfterSeconds).toBe(300);
  expect(cache.value?.workerStatus.status).toBe("RATE_LIMITED");
  expect(cache.value?.isFallbackData).toBe(true);
});
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
npm run test -- src/lib/api/calendar-client.test.ts
```

Expected: FAIL because fallback metadata is not written.

- [ ] **Step 3: Add fallback writer**

In `src/lib/api/calendar-client.ts`:

```ts
async function storeProviderFailure(
  cachePort: CachePort | null,
  key: string,
  status: "RATE_LIMITED" | "TIMEOUT" | "FATAL_ERROR",
): Promise<void> {
  if (!cachePort) return;
  await cachePort
    .set(
      key,
      {
        lastUpdated: Date.now(),
        data: [],
        workerStatus: createWorkerState(status),
        isFallbackData: true,
      },
      RATE_LIMIT_COOLDOWN_SECONDS,
    )
    .catch(() => undefined);
}
```

- [ ] **Step 4: Use fallback writer for non-OK provider response**

In the `if (!rapidResult.ok)` no-cache branch:

```ts
const retryAfterSeconds = rapidResult.status === 429 ? RATE_LIMIT_COOLDOWN_SECONDS : null;
if (rapidResult.status === 429) {
  await storeProviderFailure(cachePort, key, "RATE_LIMITED");
}

return {
  status: "SOURCE_UNAVAILABLE",
  tab,
  range,
  updatedAt: null,
  events: [],
  message:
    rapidResult.status === 429
      ? "Takvim sağlayıcısı hız sınırına ulaştı. Kısa süre sonra tekrar denenecek."
      : "Takvim sağlayıcısına şu anda erişilemiyor.",
  source: "none",
  reason: `http_${rapidResult.status}`,
  isStale: false,
  ageSeconds: null,
  retryAfterSeconds,
};
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm run test -- src/lib/api/calendar-client.test.ts src/app/api/mirror/calendar/route.test.ts
```

Expected: PASS.

---

### Task 4: Make Last Known Good Metadata Explicit

**Files:**
- Modify: `src/lib/api/calendar-client.ts`
- Modify: `src/lib/api/calendar-client.test.ts`

- [ ] **Step 1: Extend existing 429 + cache test**

Update the existing `returns Last Known Good data when RapidAPI responds 429` assertions:

```ts
expect(result.status).toBe("READY");
expect(result.source).toBe("cache");
expect(result.reason).toBe("http_429");
expect(result.isStale).toBe(true);
expect(result.ageSeconds).toBeGreaterThanOrEqual(600);
expect(result.retryAfterSeconds).toBe(300);
expect(result.message).toContain("hız sınırına");
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
npm run test -- src/lib/api/calendar-client.test.ts
```

Expected: FAIL until metadata is returned.

- [ ] **Step 3: Add metadata to all `CalendarFetchResult` returns**

Extend `CalendarFetchResult` in `src/lib/api/calendar-client.ts`:

```ts
isStale: boolean;
ageSeconds: number | null;
retryAfterSeconds: number | null;
```

Add helper:

```ts
function ageSecondsFrom(lastUpdated: number): number {
  return Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000));
}
```

For every return object in `fetchCalendarEvents`, include those fields. For cache returns use:

```ts
isStale: shouldTreatAsStale(cached.lastUpdated),
ageSeconds: ageSecondsFrom(cached.lastUpdated),
retryAfterSeconds: null,
```

For 429 + cache use:

```ts
retryAfterSeconds: RATE_LIMIT_COOLDOWN_SECONDS,
```

- [ ] **Step 4: Run tests**

Run:

```powershell
npm run test -- src/lib/api/calendar-client.test.ts src/app/api/mirror/calendar/route.test.ts
```

Expected: PASS.

---

### Task 5: Re-enable Refresh as Protected Worker Path

**Files:**
- Modify: `src/app/api/mirror/calendar/refresh/route.ts`
- Modify: `src/app/api/mirror/calendar/refresh/route.test.ts`

- [ ] **Step 1: Write failing auth test**

Replace current disabled test with:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchCalendarEvents = vi.fn();

vi.mock("@/lib/api/calendar-client", () => ({
  fetchCalendarEvents: mockFetchCalendarEvents,
}));

describe("/api/mirror/calendar/refresh route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CALENDAR_REFRESH_SECRET = "refresh-secret";
  });

  it("rejects refresh without bearer secret", async () => {
    const { POST } = await import("@/app/api/mirror/calendar/refresh/route");
    const response = await POST(new Request("http://localhost/api/mirror/calendar/refresh", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mockFetchCalendarEvents).not.toHaveBeenCalled();
  });

  it("refreshes requested tab and range with bearer secret", async () => {
    mockFetchCalendarEvents.mockResolvedValueOnce({
      status: "READY",
      tab: "economic",
      range: "today",
      updatedAt: "2026-05-09T10:00:00.000Z",
      events: [],
      message: null,
      source: "rapidapi",
      reason: null,
      isStale: false,
      ageSeconds: null,
      retryAfterSeconds: null,
    });

    const { POST } = await import("@/app/api/mirror/calendar/refresh/route");
    const response = await POST(
      new Request("http://localhost/api/mirror/calendar/refresh?tab=economic&range=today", {
        method: "POST",
        headers: { Authorization: "Bearer refresh-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mockFetchCalendarEvents).toHaveBeenCalledWith("economic", "today");
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
npm run test -- src/app/api/mirror/calendar/refresh/route.test.ts
```

Expected: FAIL because endpoint returns 410.

- [ ] **Step 3: Implement protected refresh route**

Use:

```ts
import { NextResponse } from "next/server";
import { fetchCalendarEvents } from "@/lib/api/calendar-client";
import { EconomicRangeSchema, EconomicTabSchema, type EconomicRange, type EconomicTab } from "@/lib/economic-calendar/schema";

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
  const secret = process.env.CALENDAR_REFRESH_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, status: "UNAUTHORIZED" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const tab = parseTab(searchParams.get("tab"));
  const range = parseRange(searchParams.get("range"));
  const result = await fetchCalendarEvents(tab, range);

  return NextResponse.json({ ok: result.status === "READY", result }, { status: 200 });
}
```

- [ ] **Step 4: Run test**

Run:

```powershell
npm run test -- src/app/api/mirror/calendar/refresh/route.test.ts
```

Expected: PASS.

---

### Task 6: Improve Hook Message Semantics

**Files:**
- Modify: `src/hooks/useEconomicCalendar.ts`
- Add or modify hook tests if existing setup supports React hook tests.

- [ ] **Step 1: Extract message helper**

Add pure helper to `src/hooks/useEconomicCalendar.ts`:

```ts
export function calendarEmptyStateMessage(input: {
  isLoading: boolean;
  status: EconomicMirrorStatus;
  eventCount: number;
  reason: string | null;
  isStale: boolean;
}): string | null {
  if (input.isLoading) return null;
  if (input.eventCount > 0) return null;
  if (input.status === "SOURCE_UNAVAILABLE") {
    if (input.reason === "http_429" || input.reason === "cooldown_active") {
      return "Takvim sağlayıcısı hız sınırında. Kısa süre sonra otomatik tekrar denenecek.";
    }
    return SOURCE_UNAVAILABLE_MESSAGE;
  }
  return "Bu sekme için şu anda listelenecek veri bulunamadı.";
}
```

- [ ] **Step 2: Use helper in `useMemo`**

Replace current `emptyStateMessage` memo with:

```ts
const emptyStateMessage = useMemo(
  () =>
    calendarEmptyStateMessage({
      isLoading: state.isLoading,
      status: state.status,
      eventCount: state.events.length,
      reason: state.reason,
      isStale: state.isStale,
    }),
  [state.events.length, state.isLoading, state.isStale, state.reason, state.status],
);
```

- [ ] **Step 3: Extend hook state**

Add to `UseEconomicCalendarState`:

```ts
source: "rapidapi" | "cache" | "none";
reason: string | null;
isStale: boolean;
ageSeconds: number | null;
retryAfterSeconds: number | null;
```

Initialize with `source: "none"`, `reason: null`, `isStale: false`, `ageSeconds: null`, `retryAfterSeconds: null`.

Set from payload after schema parse.

---

### Task 7: Remove Duplicate UI Error Copy and Add Status Badge

**Files:**
- Modify: `src/components/landing/EconomicCalendarPanel.tsx`

- [ ] **Step 1: Add status badge copy**

Inside component after hook call:

```ts
const providerBadge = useMemo(() => {
  if (status === "LOADING") return null;
  if (status === "READY" && updatedAt && toast) return "Son doğrulanan veri";
  if (status === "READY") return "Canlı veri";
  if (status === "SOURCE_UNAVAILABLE") return "Sağlayıcı beklemede";
  return null;
}, [status, toast, updatedAt]);
```

- [ ] **Step 2: Render badge near timestamp**

Replace timestamp paragraph block with a flex container:

```tsx
<div className="flex flex-wrap items-center gap-2">
  {providerBadge ? (
    <span className="rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-2.5 py-1 font-data text-xs text-amber-200">
      {providerBadge}
    </span>
  ) : null}
  <p className="font-data text-xs text-slate-400">Son güncelleme: {formatUpdateTime(updatedAt)}</p>
</div>
```

- [ ] **Step 3: Delete duplicate bottom note**

Remove:

```tsx
{!isLoading && status === "SOURCE_UNAVAILABLE" ? (
  <p className="mt-3 text-xs text-slate-400">{SOURCE_UNAVAILABLE_MESSAGE}</p>
) : null}
```

- [ ] **Step 4: Run lint/test**

Run:

```powershell
npm run test -- src/app/api/mirror/calendar/route.test.ts src/lib/api/calendar-client.test.ts
npm run lint
```

Expected: PASS or existing unrelated lint notes documented.

---

### Task 8: Real Case Verification Checklist

**Files:**
- No source changes unless previous tasks are accepted.

- [ ] **Step 1: Verify live API after deployment**

Run:

```powershell
$response = Invoke-WebRequest -Uri "https://fincognis.com/api/mirror/calendar?tab=economic&range=today" -Headers @{Accept="application/json"}
$response.Headers["X-Calendar-Status"]
$response.Headers["X-Calendar-Source"]
$response.Headers["X-Calendar-Reason"]
$response.Content
```

Expected when rate-limited/no cache: `SOURCE_UNAVAILABLE`, `none`, `http_429` or `cooldown_active`, clear body metadata.

- [ ] **Step 2: Verify all tab/range combinations**

Run a small script to call 20 combinations and group by status/source/reason/events.

Expected after cache warmup: common path should be `READY|cache|...|events>0` for economic ranges where provider has data.

- [ ] **Step 3: Verify UI**

Open `/ekonomik-takvim`.

Expected:
- No duplicate error text.
- If cache exists, rows remain visible with stale/son doğrulanan veri badge.
- If no cache exists, one clear provider-limit message appears.

---

## Self-Review

- Spec coverage: Covers provider reason propagation, LKG cache, cooldown, refresh worker, UI message cleanup, and verification.
- Placeholder scan: No TBD/TODO placeholders. Optional diagnostics are explicitly marked optional and not required for Sprint 1-2.
- Type consistency: `source`, `reason`, `isStale`, `ageSeconds`, `retryAfterSeconds` are used consistently across schema, route, client, hook, and UI.
