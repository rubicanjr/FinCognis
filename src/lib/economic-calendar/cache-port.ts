import { createHash } from "node:crypto";
import { EconomicEventSchema, type EconomicEvent as ApiEconomicEvent, type EconomicRange, type EconomicTab } from "@/lib/economic-calendar/schema";

export interface RedisConfig {
  url: string;
  token: string;
}

export interface EconomicEvent {
  time: string;
  currency: string;
  event: string;
  importance: 1 | 2 | 3;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

export type WorkerStatus = "SUCCESS" | "WAF_BLOCKED" | "TIMEOUT" | "FATAL_ERROR";

export interface WorkerState {
  status: WorkerStatus;
  timestamp: number;
}

export interface CachePayload {
  lastUpdated: number;
  data: EconomicEvent[];
  workerStatus: WorkerState;
  isFallbackData: boolean;
}

export interface CachedCalendarData extends CachePayload {
  isStale: boolean;
}

export interface CachePort {
  get(key: string): Promise<CachedCalendarData | null>;
  set(key: string, value: CachePayload, ttl: number): Promise<void>;
  extendTtl(key: string, ttl: number): Promise<void>;
  acquireLock(key: string, ttl: number, owner: string): Promise<boolean>;
  releaseLock(key: string, owner: string): Promise<void>;
}

const CACHE_KEY_ROOT = "calendar_events_tr";
const DATA_STALE_MS = 5 * 60 * 1000;

export const CALENDAR_TTL_SECONDS = 24 * 60 * 60;
export const CALENDAR_FALLBACK_TTL_SECONDS = 5 * 60;
export const CALENDAR_LOCK_TTL_SECONDS = 45;

function readRedisConfigOrThrow(): RedisConfig {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be defined.");
  }
  return { url, token };
}

let redisConfigSingleton: RedisConfig | null = null;

function getRedisConfigOrThrow(): RedisConfig {
  if (redisConfigSingleton) return redisConfigSingleton;
  redisConfigSingleton = readRedisConfigOrThrow();
  return redisConfigSingleton;
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

function isWorkerState(value: unknown): value is WorkerState {
  if (!isObjectRecord(value)) return false;
  const status = value.status;
  return (
    (status === "SUCCESS" || status === "WAF_BLOCKED" || status === "TIMEOUT" || status === "FATAL_ERROR") &&
    typeof value.timestamp === "number" &&
    Number.isFinite(value.timestamp)
  );
}

export function isCachePayload(value: unknown): value is CachePayload {
  if (!isObjectRecord(value)) return false;
  if (typeof value.lastUpdated !== "number" || !Number.isFinite(value.lastUpdated)) return false;
  if (typeof value.isFallbackData !== "boolean") return false;
  if (!isWorkerState(value.workerStatus)) return false;
  if (!Array.isArray(value.data)) return false;
  return value.data.every(isCacheEconomicEvent);
}

function decodeResult(payload: unknown): unknown {
  if (!isObjectRecord(payload)) return null;
  return "result" in payload ? payload.result : null;
}

function createUpstashCachePort(config: RedisConfig): CachePort {
  const call = async (command: Array<string | number>): Promise<unknown> => {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
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

      return {
        ...parsedUnknown,
        isStale: Date.now() - parsedUnknown.lastUpdated > DATA_STALE_MS,
      };
    },
    async set(key, value, ttl) {
      await call(["SET", key, JSON.stringify(value), "EX", Math.max(1, ttl)]);
    },
    async extendTtl(key, ttl) {
      await call(["EXPIRE", key, Math.max(1, ttl)]);
    },
    async acquireLock(key, ttl, owner) {
      const payload = await call(["SET", key, owner, "NX", "EX", Math.max(1, ttl)]);
      return decodeResult(payload) === "OK";
    },
    async releaseLock(key, owner) {
      const current = decodeResult(await call(["GET", key]));
      if (current !== owner) return;
      await call(["DEL", key]);
    },
  };
}

let cachePortSingleton: CachePort | null = null;

export function getCalendarCachePort(): CachePort {
  if (cachePortSingleton) return cachePortSingleton;
  cachePortSingleton = createUpstashCachePort(getRedisConfigOrThrow());
  return cachePortSingleton;
}

export function createWorkerState(status: WorkerStatus): WorkerState {
  return {
    status,
    timestamp: Date.now(),
  };
}

export function createFallbackCachePayload(status: WorkerStatus): CachePayload {
  return {
    lastUpdated: Date.now(),
    data: [],
    workerStatus: createWorkerState(status),
    isFallbackData: true,
  };
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

export function shouldTreatAsStale(lastUpdated: number): boolean {
  return Date.now() - lastUpdated > DATA_STALE_MS;
}
