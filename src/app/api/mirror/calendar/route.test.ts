import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchCalendarEvents = vi.fn();

vi.mock("@/lib/api/calendar-client", () => ({
  fetchCalendarEvents: mockFetchCalendarEvents,
}));

describe("/api/mirror/calendar route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns READY response with events", async () => {
    mockFetchCalendarEvents.mockResolvedValueOnce({
      status: "READY",
      tab: "economic",
      range: "today",
      updatedAt: "2026-05-05T10:00:00.000Z",
      events: [
        {
          id: "evt-1",
          time: "2026-05-05T13:00:00+03:00",
          currency: "USD",
          importance: 3,
          eventTitle: "ABD PMI",
          actual: "53.1",
          forecast: "52.8",
          previous: "52.2",
          impactLevel: "High",
        },
      ],
      message: null,
      source: "rapid_api",
      reason: null,
      metadata: {
        stale_age_seconds: 0,
        next_sync_permitted_at: "2026-05-05T10:05:00.000Z",
      },
    });

    const { GET } = await import("@/app/api/mirror/calendar/route");
    const response = await GET(new Request("http://localhost/api/mirror/calendar?tab=economic&range=today"));
    const payload = (await response.json()) as { status: string; events: Array<{ eventTitle: string }> };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("READY");
    expect(payload.events[0]?.eventTitle).toBe("ABD PMI");
    expect(response.headers.get("X-Calendar-Status")).toBe("READY");
  });

  it("returns COOLDOWN response without 5xx", async () => {
    mockFetchCalendarEvents.mockResolvedValueOnce({
      status: "COOLDOWN",
      tab: "holidays",
      range: "today",
      updatedAt: null,
      events: [],
      message: "Takvim sağlayıcısı hız sınırında.",
      source: "cache",
      reason: "http_429",
      metadata: {
        stale_age_seconds: -1,
        next_sync_permitted_at: "2026-05-05T10:05:00.000Z",
        reason_code: "ERROR_CODE_EVDS_429",
      },
    });

    const { GET } = await import("@/app/api/mirror/calendar/route");
    const response = await GET(new Request("http://localhost/api/mirror/calendar?tab=holidays&range=today"));
    const payload = (await response.json()) as { status: string; message: string | null };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("COOLDOWN");
    expect(payload.message).toContain("hız sınır");
    expect(response.headers.get("X-Calendar-Status")).toBe("COOLDOWN");
  });

  it("falls back to COOLDOWN when client throws", async () => {
    mockFetchCalendarEvents.mockRejectedValueOnce(new Error("client crash"));

    const { GET } = await import("@/app/api/mirror/calendar/route");
    const response = await GET(new Request("http://localhost/api/mirror/calendar?tab=ipo&range=tomorrow"));
    const payload = (await response.json()) as { status: string; events: unknown[] };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("COOLDOWN");
    expect(payload.events).toEqual([]);
  });

  it("returns metadata fields in payload", async () => {
    mockFetchCalendarEvents.mockResolvedValueOnce({
      status: "DEGRADED",
      tab: "economic",
      range: "today",
      updatedAt: "2026-05-05T10:00:00.000Z",
      events: [],
      message: "Son doğrulanan veri gösteriliyor.",
      source: "cache",
      reason: "http_429",
      metadata: {
        stale_age_seconds: 601,
        next_sync_permitted_at: "2026-05-05T10:10:00.000Z",
        reason_code: "ERROR_CODE_EVDS_429",
        is_lkg: true,
      },
    });

    const { GET } = await import("@/app/api/mirror/calendar/route");
    const response = await GET(new Request("http://localhost/api/mirror/calendar?tab=economic&range=today"));
    const payload = (await response.json()) as { metadata: { stale_age_seconds: number; reason_code?: string } };

    expect(payload.metadata.stale_age_seconds).toBe(601);
    expect(payload.metadata.reason_code).toBe("ERROR_CODE_EVDS_429");
    expect(response.headers.get("X-Calendar-Reason")).toBe("http_429");
  });
});
