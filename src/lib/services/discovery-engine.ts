import { randomUUID } from "crypto";
import { AnalyzeResponseSchema, type AnalyzeRequest, type AnalyzeResponse } from "@/lib/contracts/universal-asset-schemas";
import type { DiscoveryJob } from "@/lib/contracts/discover-job-schemas";
import {
  getDiscoveryBackendTimeoutMs,
  getDiscoveryRetryBaseDelayMs,
  getDiscoveryRetryCount,
} from "@/lib/discovery/discovery-config";

const DISCOVERY_TTL_MS = 5 * 60 * 1000;
const DISCOVERY_JOB_TTL_MS = 5 * 60 * 1000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildBackoffDelayMs(attempt: number): number {
  const base = getDiscoveryRetryBaseDelayMs();
  const exponential = Math.min(base * Math.pow(2, attempt), 5_000);
  const jitter = Math.floor(Math.random() * Math.max(120, Math.floor(base * 0.35)));
  return exponential + jitter;
}

interface DiscoverCacheEntry {
  key: string;
  payload: AnalyzeResponse;
  expiresAt: number;
}

interface DiscoveryJobRecord extends DiscoveryJob {
  key: string;
}

const discoverCache = new Map<string, DiscoverCacheEntry>();
const discoverJobs = new Map<string, DiscoveryJobRecord>();

function nowMs(): number {
  return Date.now();
}

function cleanupCache(): void {
  const now = nowMs();
  Array.from(discoverCache.entries())
    .filter(([, entry]) => entry.expiresAt <= now)
    .forEach(([key]) => discoverCache.delete(key));
}

function cleanupJobs(): void {
  const now = nowMs();
  Array.from(discoverJobs.entries())
    .filter(([, job]) => job.expiresAt <= now)
    .forEach(([id]) => discoverJobs.delete(id));
}

function withBackendTimeout<T>(jobFn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutHandle = setTimeout(() => reject(new Error("discover_backend_timeout")), timeoutMs);
    jobFn()
      .then((value) => {
        clearTimeout(timeoutHandle);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });
  });
}

async function withBackendTimeoutRetry<T>(jobFn: () => Promise<T>): Promise<T> {
  const timeoutMs = getDiscoveryBackendTimeoutMs();
  const retries = getDiscoveryRetryCount();

  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await withBackendTimeout(jobFn, timeoutMs);
    } catch (error) {
      const isTimeout = error instanceof Error && error.message === "discover_backend_timeout";
      if (!isTimeout || attempt >= retries) {
        throw error;
      }
      await wait(buildBackoffDelayMs(attempt));
      attempt += 1;
    }
  }

  throw new Error("discover_backend_timeout");
}

function toDiscoverCacheKey(requestData: AnalyzeRequest): string {
  const sortedSymbols = requestData.assets
    .map((asset) => `${asset.symbol}:${asset.class}`)
    .sort((left, right) => left.localeCompare(right));

  return [requestData.analysisMode, requestData.timeHorizon, sortedSymbols.join("|")].join("::");
}

function createJob(key: string): DiscoveryJobRecord {
  return {
    id: randomUUID(),
    key,
    status: "pending",
    data: null,
    progress: 0,
    expiresAt: nowMs() + DISCOVERY_JOB_TTL_MS,
  };
}

function setJob(job: DiscoveryJobRecord): void {
  discoverJobs.set(job.id, job);
}

function setDiscoverCache(key: string, payload: AnalyzeResponse): void {
  discoverCache.set(key, {
    key,
    payload,
    expiresAt: nowMs() + DISCOVERY_TTL_MS,
  });
}

function getDiscoverCache(key: string): AnalyzeResponse | null {
  cleanupCache();
  const entry = discoverCache.get(key);
  return entry ? entry.payload : null;
}

function findActiveJobByKey(key: string): DiscoveryJobRecord | null {
  cleanupJobs();
  const jobs = Array.from(discoverJobs.values()).filter((job) => job.key === key && job.status !== "failed" && job.status !== "completed");
  return jobs[0] ?? null;
}

function updateJobProgress(jobId: string, status: DiscoveryJob["status"], progress: number, data: DiscoveryJob["data"], error?: string): void {
  const existing = discoverJobs.get(jobId);
  if (!existing) return;
  discoverJobs.set(jobId, {
    ...existing,
    status,
    progress,
    data,
    error,
  });
}

async function runDiscoverJob(
  job: DiscoveryJobRecord,
  requestData: AnalyzeRequest,
  analyzeFn: () => Promise<AnalyzeResponse>
): Promise<void> {
  updateJobProgress(job.id, "processing", 10, null);

  try {
    const analyzed = await withBackendTimeoutRetry(analyzeFn);
    const parsed = AnalyzeResponseSchema.parse(analyzed);
    setDiscoverCache(job.key, parsed);
    updateJobProgress(job.id, "completed", 100, parsed);
  } catch (error) {
    const cached = getDiscoverCache(job.key);
    const errorMessage = error instanceof Error ? error.message : "discover_job_failed";
    const fallbackData = cached ? AnalyzeResponseSchema.partial().parse(cached) : null;
    updateJobProgress(job.id, "failed", 100, fallbackData, errorMessage);
  }

  void requestData;
}

export function getDiscoveryJob(jobId: string): DiscoveryJob | null {
  cleanupJobs();
  const job = discoverJobs.get(jobId);
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    data: job.data,
    progress: job.progress,
    expiresAt: job.expiresAt,
    error: job.error,
  };
}

export function createOrReuseDiscoverJob(
  requestData: AnalyzeRequest,
  analyzeFn: () => Promise<AnalyzeResponse>
): {
  mode: "cached" | "existing" | "created";
  cached?: AnalyzeResponse;
  job: DiscoveryJob;
} {
  const key = toDiscoverCacheKey(requestData);
  const cached = getDiscoverCache(key);
  if (cached) {
    return {
      mode: "cached",
      cached,
      job: {
        id: "cached",
        status: "completed",
        data: AnalyzeResponseSchema.partial().parse(cached),
        progress: 100,
        expiresAt: nowMs() + DISCOVERY_TTL_MS,
      },
    };
  }

  const existing = findActiveJobByKey(key);
  if (existing) {
    return {
      mode: "existing",
      job: getDiscoveryJob(existing.id)!,
    };
  }

  const job = createJob(key);
  setJob(job);
  void runDiscoverJob(job, requestData, analyzeFn);

  return {
    mode: "created",
    job: getDiscoveryJob(job.id)!,
  };
}

export function __clearDiscoveryEngineStateForTests(): void {
  discoverCache.clear();
  discoverJobs.clear();
}

export function __seedDiscoveryCacheForTests(requestData: AnalyzeRequest, payload: AnalyzeResponse): void {
  setDiscoverCache(toDiscoverCacheKey(requestData), payload);
}
