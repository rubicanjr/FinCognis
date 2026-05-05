import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchCalendarEvents = vi.fn();

vi.mock("@/lib/economic-calendar/mirror", () => ({
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
      source: "stealth",
      reason: null,
    });

    const { GET } = await import("@/app/api/mirror/calendar/route");
    const response = await GET(new Request("http://localhost/api/mirror/calendar?tab=economic&range=today"));
    const payload = (await response.json()) as { status: string; events: Array<{ eventTitle: string }> };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("READY");
    expect(payload.events[0]?.eventTitle).toBe("ABD PMI");
    expect(response.headers.get("X-Calendar-Status")).toBe("READY");
  });

  it("returns SOURCE_UNAVAILABLE response without 5xx", async () => {
    mockFetchCalendarEvents.mockResolvedValueOnce({
      status: "SOURCE_UNAVAILABLE",
      tab: "holidays",
      range: "today",
      updatedAt: null,
      events: [],
      message: "Veri sunucusu senkronizasyonunda geçici bir gecikme yaşanıyor.",
      source: "none",
      reason: "empty_or_invalid_source",
    });

    const { GET } = await import("@/app/api/mirror/calendar/route");
    const response = await GET(new Request("http://localhost/api/mirror/calendar?tab=holidays&range=today"));
    const payload = (await response.json()) as { status: string; message: string | null };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("SOURCE_UNAVAILABLE");
    expect(payload.message).toContain("geçici");
    expect(response.headers.get("X-Calendar-Status")).toBe("SOURCE_UNAVAILABLE");
  });

  it("falls back to SOURCE_UNAVAILABLE when mirror throws", async () => {
    mockFetchCalendarEvents.mockRejectedValueOnce(new Error("mirror crash"));

    const { GET } = await import("@/app/api/mirror/calendar/route");
    const response = await GET(new Request("http://localhost/api/mirror/calendar?tab=ipo&range=tomorrow"));
    const payload = (await response.json()) as { status: string; events: unknown[] };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("SOURCE_UNAVAILABLE");
    expect(payload.events).toEqual([]);
  });
});
