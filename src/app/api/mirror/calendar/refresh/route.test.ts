import { createHmac, randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchCalendarEvents = vi.fn();

vi.mock("@/lib/api/calendar-client", () => ({
  fetchCalendarEvents: mockFetchCalendarEvents,
}));

function buildSignedHeaders(urlPath = "/api/mirror/calendar/refresh", method = "POST") {
  const secret = process.env.CALENDAR_REFRESH_SECRET ?? "refresh-secret";
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const bodyHash = createHmac("sha256", secret).update("").digest("hex");
  const payload = `${timestamp}.${nonce}.${method}.${urlPath}.${bodyHash}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return {
    "x-refresh-signature": signature,
    "x-refresh-timestamp": timestamp,
    "x-refresh-nonce": nonce,
  };
}

describe("/api/mirror/calendar/refresh route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CALENDAR_REFRESH_SECRET = "refresh-secret";
  });

  it("rejects refresh without signed headers", async () => {
    const { POST } = await import("@/app/api/mirror/calendar/refresh/route");
    const response = await POST(new Request("http://localhost/api/mirror/calendar/refresh", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mockFetchCalendarEvents).not.toHaveBeenCalled();
  });

  it("refreshes requested tab and range with valid signature", async () => {
    mockFetchCalendarEvents.mockResolvedValueOnce({
      status: "READY",
      tab: "economic",
      range: "today",
      updatedAt: "2026-05-09T10:00:00.000Z",
      events: [],
      message: null,
      source: "rapid_api",
      reason: null,
      metadata: {
        stale_age_seconds: 0,
        next_sync_permitted_at: "2026-05-09T10:02:00.000Z",
      },
    });

    const { POST } = await import("@/app/api/mirror/calendar/refresh/route");
    const headers = buildSignedHeaders();
    const response = await POST(
      new Request("http://localhost/api/mirror/calendar/refresh?tab=economic&range=today", {
        method: "POST",
        headers,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockFetchCalendarEvents).toHaveBeenCalledWith("economic", "today");
  });
});
