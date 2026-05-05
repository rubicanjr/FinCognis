import { z } from "zod";

export interface RapidStockData {
  symbol: string;
  price: number;
  change: number;
  changePercentage: string;
  volume: string;
}

export type FinCognisState = "LOADING" | "IDLE" | "ERROR" | "SYNCING";

interface MostActiveResult {
  state: FinCognisState;
  rows: RapidStockData[];
  lastUpdated: string | null;
  message: string | null;
}

interface CachedMostActive {
  rows: RapidStockData[];
  lastUpdated: string;
  fetchedAt: number;
}

const RAPID_API_URL = "https://investing11.p.rapidapi.com/most-active-stocks";
const CACHE_FRESH_MS = 60_000;
const CACHE_STALE_MS = 5 * 60_000;

let mostActiveCache: CachedMostActive | null = null;
let inFlightRefresh: Promise<CachedMostActive | null> | null = null;

const RapidStockRowSchema = z
  .object({
    symbol: z.string().min(1),
    price: z.coerce.number(),
    change: z.coerce.number(),
    changePercentage: z.union([z.string(), z.number()]).transform((value) => String(value)),
    volume: z.union([z.string(), z.number()]).transform((value) => String(value)),
  })
  .transform((row): RapidStockData => ({
    symbol: row.symbol,
    price: row.price,
    change: row.change,
    changePercentage: row.changePercentage,
    volume: row.volume,
  }));

const RapidRowsSchema = z.array(RapidStockRowSchema);

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function extractCandidateRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.result)) return record.result;
  if (Array.isArray(record.stocks)) return record.stocks;
  return [];
}

function parseRapidRows(payload: unknown): RapidStockData[] {
  const candidateRows = extractCandidateRows(payload);
  const parsed = RapidRowsSchema.safeParse(candidateRows);
  return parsed.success ? parsed.data : [];
}

function readRapidApiKey(): string | null {
  const key = process.env.RAPID_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

async function fetchMostActiveFromRapidApi(): Promise<CachedMostActive | null> {
  const apiKey = readRapidApiKey();
  if (!apiKey) return null;

  const response = await fetch(RAPID_API_URL, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "investing11.p.rapidapi.com",
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) return null;

  const payload: unknown = await response.json().catch(() => null);
  const rows = parseRapidRows(payload);
  if (rows.length === 0) return null;

  const dateHeader = response.headers.get("date");
  const updatedAt = dateHeader && Number.isFinite(new Date(dateHeader).getTime()) ? new Date(dateHeader).toISOString() : new Date().toISOString();
  return {
    rows,
    lastUpdated: updatedAt,
    fetchedAt: Date.now(),
  };
}

function cacheAgeMs(cache: CachedMostActive): number {
  return Date.now() - cache.fetchedAt;
}

function startBackgroundRefresh(): void {
  if (inFlightRefresh) return;
  inFlightRefresh = fetchMostActiveFromRapidApi()
    .then((result) => {
      if (result) mostActiveCache = result;
      return result;
    })
    .finally(() => {
      inFlightRefresh = null;
    });
}

export async function getMostActiveStocks(): Promise<MostActiveResult> {
  const cacheSnapshot = mostActiveCache;

  if (cacheSnapshot && cacheAgeMs(cacheSnapshot) <= CACHE_FRESH_MS) {
    return {
      state: "IDLE",
      rows: cacheSnapshot.rows,
      lastUpdated: cacheSnapshot.lastUpdated,
      message: null,
    };
  }

  if (cacheSnapshot && cacheAgeMs(cacheSnapshot) <= CACHE_STALE_MS) {
    startBackgroundRefresh();
    return {
      state: "SYNCING",
      rows: cacheSnapshot.rows,
      lastUpdated: cacheSnapshot.lastUpdated,
      message: "Veriler güncelleniyor, en son doğrulanan akış gösteriliyor.",
    };
  }

  const freshResult = await fetchMostActiveFromRapidApi();
  if (freshResult) {
    mostActiveCache = freshResult;
    return {
      state: "IDLE",
      rows: freshResult.rows,
      lastUpdated: freshResult.lastUpdated,
      message: null,
    };
  }

  return {
    state: "ERROR",
    rows: [],
    lastUpdated: null,
    message: "Canlı veri akışına şu anda erişilemiyor.",
  };
}
