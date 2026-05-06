import { beforeEach, describe, expect, it } from "vitest";
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

  async set(_key: string, value: CachePayload): Promise<void> {
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
    process.env.RAPIDAPI_KEY = "test-key";
  });

  it("returns Last Known Good data when RapidAPI responds 429", async () => {
    const cache = new FakeCachePort({
      lastUpdated: Date.now() - 10 * 60_000,
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

    expect(result.status).toBe("READY");
    expect(result.source).toBe("cache");
    expect(result.reason).toBe("http_429");
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventTitle).toBe("ISM Services PMI");
  });
});
