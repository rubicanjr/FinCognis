import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCalendarEvents } from "@/lib/api/calendar-client";
import type { CachePayload, CachePort, CachedCalendarData } from "@/lib/economic-calendar/cache-port";

class FakeCachePort implements CachePort {
  public value: CachedCalendarData | null;

  constructor(seed: CachedCalendarData | null) {
    this.value = seed;
  }

  async get(_key: string): Promise<CachedCalendarData | null> {
    return this.value;
  }

  async set(_key: string, value: CachePayload, _ttl: number): Promise<void> {
    this.value = {
      ...value,
      isStale: false,
    };
  }

  async extendTtl(_key: string, _ttl: number): Promise<void> {
    return;
  }

  async acquireLock(_key: string, _ttl: number, _owner: string): Promise<boolean> {
    return true;
  }

  async releaseLock(_key: string, _owner: string): Promise<void> {
    return;
  }
}

describe("calendar-client", () => {
  beforeEach(() => {
    process.env.FINNHUB_API_KEY = "test-key";
  });

  it("returns Last Known Good data when Finnhub responds 429", async () => {
    const cache = new FakeCachePort({
      lastUpdated: Date.now() - 20 * 60_000,
      data: [
        {
          time: "2026-05-06T10:00:00+03:00",
          currency: "US",
          event: "ISM Services PMI",
          importance: 3,
          actual: "52.0",
          forecast: "51.7",
          previous: "51.4",
        },
      ],
      workerStatus: {
        status: "SUCCESS",
        timestamp: Date.now() - 10 * 60_000,
      },
      isFallbackData: false,
      isStale: true,
    });

    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ message: "rate limit" }), { status: 429 });
    const result = await fetchCalendarEvents("economic", "today", { fetchImpl, cachePort: cache });

    expect(result.status).toBe("DEGRADED");
    expect(result.source).toBe("cache");
    expect(result.reason).toBe("FINNHUB_RATE_LIMIT");
    expect(result.metadata.is_lkg).toBe(true);
    expect(result.metadata.reason_code).toBe("FINNHUB_RATE_LIMIT");
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventTitle).toBe("ISM Services PMI");
  });

  it("returns COOLDOWN and stores RATE_LIMITED fallback on 429 with empty cache", async () => {
    const cache = new FakeCachePort(null);
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ message: "rate limit" }), {
        status: 429,
        headers: { "Retry-After": "300" },
      });

    const result = await fetchCalendarEvents("economic", "today", { fetchImpl, cachePort: cache });

    expect(result.status).toBe("COOLDOWN");
    expect(result.reason).toBe("FINNHUB_RATE_LIMIT");
    expect(result.metadata.reason_code).toBe("FINNHUB_RATE_LIMIT");
    expect(cache.value?.workerStatus.status).toBe("RATE_LIMITED");
  });

  it("uses fresh cache without calling provider", async () => {
    const cache = new FakeCachePort({
      lastUpdated: Date.now() - 2 * 60_000,
      data: [
        {
          time: "2026-05-06T10:00:00+03:00",
          currency: "US",
          event: "ISM Services PMI",
          importance: 3,
          actual: "52.0",
          forecast: "51.7",
          previous: "51.4",
        },
      ],
      workerStatus: {
        status: "SUCCESS",
        timestamp: Date.now() - 2 * 60_000,
      },
      isFallbackData: false,
      isStale: false,
    });
    const fetchImpl = vi.fn<typeof fetch>();

    const result = await fetchCalendarEvents("economic", "today", { fetchImpl, cachePort: cache });

    expect(result.status).toBe("READY");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns missing_fmp_api_key when dividends requested without FMP key", async () => {
    delete process.env.FMP_API_KEY;
    const result = await fetchCalendarEvents("dividends", "today", {
      fetchImpl: vi.fn<typeof fetch>(),
      cachePort: new FakeCachePort(null),
    });

    expect(result.status).toBe("COOLDOWN");
    expect(result.reason).toBe("missing_fmp_api_key");
    expect(result.metadata.reason_code).toBe("FMP_MISSING_API_KEY");
  });
});
