import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CachePayload } from "@/lib/economic-calendar/cache-port";

const mockGet = vi.fn<(key: string) => Promise<CachePayload | null>>();
const mockSet = vi.fn<(key: string, value: CachePayload, ttl: number) => Promise<void>>();
const mockExtendTtl = vi.fn<(key: string, ttl: number) => Promise<void>>();
const mockAcquireLock = vi.fn<(key: string, ttl: number, owner: string) => Promise<boolean>>();
const mockReleaseLock = vi.fn<(key: string, owner: string) => Promise<void>>();
const mockRefreshCalendarCache = vi.fn();
const mockRefreshDefaultCalendarCache = vi.fn();

vi.mock("@/lib/economic-calendar/cache-port", () => ({
  CALENDAR_FALLBACK_TTL_SECONDS: 300,
  CALENDAR_LOCK_TTL_SECONDS: 45,
  CALENDAR_TTL_SECONDS: 86_400,
  buildCalendarCacheKey: (tab: string, range: string) => `calendar_events_tr:${tab}:${range}`,
  buildCalendarLockKey: (tab: string, range: string) => `calendar_events_tr:lock:${tab}:${range}`,
  createFallbackCachePayload: (status: "SUCCESS" | "WAF_BLOCKED" | "TIMEOUT" | "FATAL_ERROR") => ({
    lastUpdated: Date.now(),
    data: [],
    workerStatus: {
      status,
      timestamp: Date.now(),
    },
    isFallbackData: true,
  }),
  getCalendarCachePort: () => ({
    get: mockGet,
    set: mockSet,
    extendTtl: mockExtendTtl,
    acquireLock: mockAcquireLock,
    releaseLock: mockReleaseLock,
  }),
}));

vi.mock("@/lib/economic-calendar/mirror", () => ({
  refreshCalendarCache: mockRefreshCalendarCache,
  refreshDefaultCalendarCache: mockRefreshDefaultCalendarCache,
}));

describe("/api/mirror/calendar/refresh resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("releases lock and seeds timeout fallback payload when scraper crashes", async () => {
    mockAcquireLock.mockResolvedValue(true);
    mockRefreshCalendarCache.mockRejectedValue(new Error("TimeoutError: waiting for selector #ecEventsTable failed"));
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue();
    mockReleaseLock.mockResolvedValue();

    const { POST } = await import("@/app/api/mirror/calendar/refresh/route");
    const response = await POST(new Request("http://localhost/api/mirror/calendar/refresh?mode=single&tab=economic&range=today", { method: "POST" }));
    const payload = (await response.json()) as { workerStatus?: string; status?: string };

    expect(response.status).toBe(500);
    expect(payload.workerStatus).toBe("TIMEOUT");
    expect(payload.status).toBe("FALLBACK_SEEDED");
    expect(mockReleaseLock).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(1);

    const writtenPayload = mockSet.mock.calls[0]?.[1];
    expect(writtenPayload?.workerStatus.status).toBe("TIMEOUT");
    expect(writtenPayload?.isFallbackData).toBe(true);
  });
});
