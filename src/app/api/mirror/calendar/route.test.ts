import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CachePayload } from "@/lib/economic-calendar/cache-port";

const mockGet = vi.fn<() => Promise<CachePayload | null>>();

vi.mock("@/lib/economic-calendar/cache-port", () => ({
  buildCalendarCacheKey: (tab: string, range: string) => `calendar_events_tr:${tab}:${range}`,
  cacheEventToApiEvent: (event: { time: string; currency: string; event: string; importance: 1 | 2 | 3; actual: string | null; forecast: string | null; previous: string | null }) => ({
    id: "mock-id",
    time: event.time,
    currency: event.currency,
    eventTitle: event.event,
    importance: event.importance,
    actual: event.actual,
    forecast: event.forecast,
    previous: event.previous,
    impactLevel: event.importance === 3 ? "High" : event.importance === 2 ? "Medium" : "Low",
  }),
  getCalendarCachePort: () => ({
    get: mockGet,
  }),
  shouldTreatAsStale: (lastUpdated: number) => Date.now() - lastUpdated > 5 * 60 * 1000,
}));

describe("/api/mirror/calendar adaptive gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 200 with stale cached data when refresh is delayed", async () => {
    mockGet.mockResolvedValueOnce({
      lastUpdated: Date.now() - 6 * 60 * 1000,
      isStale: true,
      data: [
        {
          time: new Date().toISOString(),
          currency: "USD",
          event: "ABD PMI",
          importance: 3,
          actual: null,
          forecast: "52.0",
          previous: "51.8",
        },
      ],
    });

    const { GET } = await import("@/app/api/mirror/calendar/route");
    const response = await GET(new Request("http://localhost/api/mirror/calendar?tab=economic&range=today"));
    const payload = (await response.json()) as {
      events: Array<{ eventTitle: string }>;
      updatedAt: string;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Cache-Status")).toBe("HIT");
    expect(response.headers.get("X-Data-Age")).toBe("stale");
    expect(payload.events[0]?.eventTitle).toBe("ABD PMI");
    expect(typeof payload.updatedAt).toBe("string");
  });

  it("returns 202 INITIALIZING on cold start while self-warm is triggered", async () => {
    mockGet.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/mirror/calendar/route");
    const response = await GET(new Request("http://localhost/api/mirror/calendar?tab=ipo&range=yesterday"));
    const payload = (await response.json()) as { status?: string };

    expect(response.status).toBe(202);
    expect(payload.status).toBe("INITIALIZING");
    expect(fetchMock).toHaveBeenCalled();
  });
});
