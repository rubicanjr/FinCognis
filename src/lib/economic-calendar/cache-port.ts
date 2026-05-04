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
  extendTtl(key: string, ttl: number): Promise<void>;
  acquireLock(key: string, ttl: number, owner: string): Promise<boolean>;
  releaseLock(key: string, owner: string): Promise<void>;
}

const CACHE_KEY_ROOT = "calendar_events_tr";
const DATA_STALE_MS = 5 * 60 * 1000;
const MEMORY_CACHE_DEFAULT_TTL_SECONDS = 24 * 60 * 60;

function readUpstashEnv(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

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

function decodeResult(payload: unknown): unknown {
  if (!isObjectRecord(payload)) return null;
  return "result" in payload ? payload.result : null;
}

function toNumberResult(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function createUpstashCachePort(): CachePort {
  const env = readUpstashEnv();
  if (!env) {
    throw new Error("Upstash cache is not configured.");
  }

  const call = async (command: Array<string | number>): Promise<unknown> => {
    const response = await fetch(env.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.token}`,
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
      const raw = decodeResult(payload);
      if (typeof raw !== "string") return null;

      const parsedUnknown: unknown = JSON.parse(raw);
      if (!isCachePayload(parsedUnknown)) return null;

      const isStale = Date.now() - parsedUnknown.lastUpdated > DATA_STALE_MS;
      return {
        ...parsedUnknown,
        isStale,
      };
    },
    async set(key, value, ttl) {
      await call(["SET", key, JSON.stringify(value), "EX", ttl]);
    },
    async extendTtl(key, ttl) {
      await call(["EXPIRE", key, ttl]);
    },
    async acquireLock(key, ttl, owner) {
      const payload = await call(["SET", key, owner, "NX", "EX", ttl]);
      return decodeResult(payload) === "OK";
    },
    async releaseLock(key, owner) {
      const current = decodeResult(await call(["GET", key]));
      if (current !== owner) return;
      await call(["DEL", key]);
    },
  };
}

interface MemoryEntry {
  payload: CachePayload;
  expiresAt: number;
}

interface MemoryLockEntry {
  owner: string;
  expiresAt: number;
}

function createMemoryCachePort(): CachePort {
  const dataStore = new Map<string, MemoryEntry>();
  const lockStore = new Map<string, MemoryLockEntry>();

  const now = (): number => Date.now();

  const getDataEntry = (key: string): MemoryEntry | null => {
    const entry = dataStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now()) {
      dataStore.delete(key);
      return null;
    }
    return entry;
  };

  const getLockEntry = (key: string): MemoryLockEntry | null => {
    const entry = lockStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now()) {
      lockStore.delete(key);
      return null;
    }
    return entry;
  };

  return {
    async get(key) {
      const entry = getDataEntry(key);
      if (!entry) return null;
      const isStale = now() - entry.payload.lastUpdated > DATA_STALE_MS;
      return {
        ...entry.payload,
        isStale,
      };
    },
    async set(key, value, ttl) {
      const safeTtl = Math.max(1, ttl || MEMORY_CACHE_DEFAULT_TTL_SECONDS);
      dataStore.set(key, {
        payload: value,
        expiresAt: now() + safeTtl * 1000,
      });
    },
    async extendTtl(key, ttl) {
      const entry = getDataEntry(key);
      if (!entry) return;
      const safeTtl = Math.max(1, ttl || MEMORY_CACHE_DEFAULT_TTL_SECONDS);
      dataStore.set(key, {
        ...entry,
        expiresAt: now() + safeTtl * 1000,
      });
    },
    async acquireLock(key, ttl, owner) {
      const current = getLockEntry(key);
      if (current) return false;
      const safeTtl = Math.max(1, ttl);
      lockStore.set(key, {
        owner,
        expiresAt: now() + safeTtl * 1000,
      });
      return true;
    },
    async releaseLock(key, owner) {
      const current = getLockEntry(key);
      if (!current) return;
      if (current.owner !== owner) return;
      lockStore.delete(key);
    },
  };
}

let cachePortSingleton: CachePort | null = null;

export function getCalendarCachePort(): CachePort {
  if (cachePortSingleton) return cachePortSingleton;
  cachePortSingleton = readUpstashEnv() ? createUpstashCachePort() : createMemoryCachePort();
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

export function buildCalendarLockKey(tab: EconomicTab, range: EconomicRange): string {
  return `${CACHE_KEY_ROOT}:lock:${tab}:${range}`;
}

export const CALENDAR_TTL_SECONDS = 24 * 60 * 60;
export const CALENDAR_LOCK_TTL_SECONDS = 45;

export function shouldTreatAsStale(lastUpdated: number): boolean {
  return Date.now() - lastUpdated > DATA_STALE_MS;
}
