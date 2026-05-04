import { createHash } from "node:crypto";
import { EconomicEventSchema, type EconomicEvent as ApiEconomicEvent, type EconomicRange, type EconomicTab } from "@/lib/economic-calendar/schema";

export interface EconomicEvent {
  time: string;
  currency: string;
  event: string;
  importance: 1 | 2 | 3;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

export interface CachePayload {
  lastUpdated: number;
  isStale: boolean;
  data: EconomicEvent[];
}

export interface CachePort {
  get(key: string): Promise<CachePayload | null>;
  set(key: string, value: CachePayload, ttl: number): Promise<void>;
}

interface MemoryNode {
  value: CachePayload;
  expiresAt: number;
}

const FALLBACK_MEMORY = new Map<string, MemoryNode>();
const CACHE_KEY_ROOT = "calendar_events_tr";
const DATA_STALE_MS = 5 * 60 * 1000;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCacheEconomicEvent(value: unknown): value is EconomicEvent {
  if (!isObjectRecord(value)) return false;
  const importance = value.importance;
  return (
    typeof value.time === "string" &&
    typeof value.currency === "string" &&
    typeof value.event === "string" &&
    (importance === 1 || importance === 2 || importance === 3) &&
    (typeof value.actual === "string" || value.actual === null) &&
    (typeof value.forecast === "string" || value.forecast === null) &&
    (typeof value.previous === "string" || value.previous === null)
  );
}

export function isCachePayload(value: unknown): value is CachePayload {
  if (!isObjectRecord(value)) return false;
  if (typeof value.lastUpdated !== "number" || !Number.isFinite(value.lastUpdated)) return false;
  if (typeof value.isStale !== "boolean") return false;
  if (!Array.isArray(value.data)) return false;
  return value.data.every(isCacheEconomicEvent);
}

function isUpstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function createMemoryCachePort(): CachePort {
  return {
    async get(key) {
      const node = FALLBACK_MEMORY.get(key);
      if (!node) return null;
      if (node.expiresAt < Date.now()) {
        FALLBACK_MEMORY.delete(key);
        return null;
      }

      const isStale = Date.now() - node.value.lastUpdated > DATA_STALE_MS;
      return {
        ...node.value,
        isStale,
      };
    },
    async set(key, value, ttl) {
      FALLBACK_MEMORY.set(key, {
        value,
        expiresAt: Date.now() + ttl * 1000,
      });
    },
  };
}

function decodeUpstashResult(payload: unknown): string | null {
  if (!isObjectRecord(payload)) return null;
  if (!("result" in payload)) return null;
  const result = payload.result;
  return typeof result === "string" ? result : null;
}

function createUpstashCachePort(): CachePort {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

  const call = async (command: string[]): Promise<unknown> => {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Upstash command failed: ${response.status}`);
    }

    return response.json();
  };

  return {
    async get(key) {
      const payload = await call(["GET", key]);
      const raw = decodeUpstashResult(payload);
      if (!raw) return null;

      const parsedUnknown: unknown = JSON.parse(raw);
      if (!isCachePayload(parsedUnknown)) return null;

      const isStale = Date.now() - parsedUnknown.lastUpdated > DATA_STALE_MS;
      return {
        ...parsedUnknown,
        isStale,
      };
    },
    async set(key, value, ttl) {
      await call(["SET", key, JSON.stringify(value), "EX", String(ttl)]);
    },
  };
}

let cachePortSingleton: CachePort | null = null;

export function getCalendarCachePort(): CachePort {
  if (cachePortSingleton) return cachePortSingleton;

  cachePortSingleton = isUpstashConfigured() ? createUpstashCachePort() : createMemoryCachePort();
  return cachePortSingleton;
}

function eventHash(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 16);
}

function importanceToImpact(importance: 1 | 2 | 3): "High" | "Medium" | "Low" {
  if (importance === 3) return "High";
  if (importance === 2) return "Medium";
  return "Low";
}

export function cacheEventToApiEvent(event: EconomicEvent): ApiEconomicEvent {
  return EconomicEventSchema.parse({
    id: eventHash(`${event.time}|${event.currency}|${event.event}`),
    time: event.time,
    currency: event.currency,
    importance: event.importance,
    eventTitle: event.event,
    actual: event.actual,
    forecast: event.forecast,
    previous: event.previous,
    impactLevel: importanceToImpact(event.importance),
  });
}

export function apiEventToCacheEvent(event: ApiEconomicEvent): EconomicEvent {
  return {
    time: event.time,
    currency: event.currency,
    event: event.eventTitle,
    importance: event.importance,
    actual: event.actual,
    forecast: event.forecast,
    previous: event.previous,
  };
}

export function buildCalendarCacheKey(tab: EconomicTab, range: EconomicRange): string {
  return `${CACHE_KEY_ROOT}:${tab}:${range}`;
}

export const CALENDAR_TTL_SECONDS = 24 * 60 * 60;
