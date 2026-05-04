import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/mirror/calendar/route";
import { buildCalendarCacheKey, getCalendarCachePort } from "@/lib/economic-calendar/cache-port";

describe("/api/mirror/calendar cache-first route", () => {
  it("returns 200 with stale cached data when worker has not refreshed within 5 minutes", async () => {
    const cachePort = getCalendarCachePort();
    const key = buildCalendarCacheKey("economic", "today");

    await cachePort.set(
      key,
      {
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
      },
      60,
    );

    const response = await GET(new Request("http://localhost/api/mirror/calendar?tab=economic&range=today"));
    const payload = (await response.json()) as {
      events: Array<{ eventTitle: string }>;
      updatedAt: string;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Data-Age")).toBe("stale");
    expect(payload.events[0]?.eventTitle).toBe("ABD PMI");
    expect(typeof payload.updatedAt).toBe("string");
  });

  it("returns warming response when cache is empty", async () => {
    const response = await GET(new Request("http://localhost/api/mirror/calendar?tab=ipo&range=yesterday"));
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("DATA_WARMING_UP");
  });
});
