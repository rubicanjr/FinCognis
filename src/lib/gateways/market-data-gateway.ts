import { ASSET_UNIVERSE, LIQUIDITY_TABLE } from "@/components/tools/correlation/universe";
import {
  buildAssetCatalog,
  type AssetCatalogItem,
} from "@/components/tools/correlation/universal-asset-comparison";
import type { LiquidityProfile } from "@/components/tools/correlation/types";

export type MarketHistoryRange = "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y";

export interface MarketHistoryOptions {
  range?: MarketHistoryRange;
  interval?: "1d";
}

export interface MarketQuote {
  symbol: string;
  providerSymbol: string;
  price: number;
  changePercent: number;
  volume: number | null;
  currency: string | null;
  timestampIso: string | null;
}

export interface MarketHistoryPoint {
  date: string;
  close: number;
  volume: number | null;
}

export interface MarketHistory {
  symbol: string;
  providerSymbol: string;
  points: MarketHistoryPoint[];
  returns: number[];
}

export interface MarketLiquidity {
  symbol: string;
  providerSymbol: string;
  profile: LiquidityProfile;
  avgDailyVolume: number | null;
  volumeBand: "very_high" | "high" | "medium" | "low" | "unknown";
}

export interface MarketDataGatewayPort {
  getQuote(symbol: string): Promise<MarketQuote | null>;
  getHistory(symbol: string, options?: MarketHistoryOptions): Promise<MarketHistory>;
  getLiquidity(symbol: string): Promise<MarketLiquidity>;
  getSupportedAssets(): AssetCatalogItem[];
}

interface CacheEntry<TValue> {
  expiresAt: number;
  value: TValue;
}

const DEFAULT_BASE_URL = "https://query1.finance.yahoo.com";
const QUOTE_TTL_MS = 15_000;
const HISTORY_TTL_MS = 5 * 60_000;
const LIQUIDITY_TTL_MS = 5 * 60_000;
const REQUEST_TIMEOUT_MS = 6_000;

const PROVIDER_SYMBOL_OVERRIDES: Record<string, string> = {
  AAPL: "AAPL",
  AMZN: "AMZN",
  ASELS: "ASELS.IS",
  BIST30: "XU030.IS",
  BNB: "BNB-USD",
  BRENT: "BZ=F",
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  EURUSD: "EURUSD=X",
  EUROBOND: "^TNX",
  GARAN: "GARAN.IS",
  KCHOL: "KCHOL.IS",
  MSFT: "MSFT",
  NDX: "^NDX",
  NVDA: "NVDA",
  QQQ: "QQQ",
  SOL: "SOL-USD",
  SPX: "^GSPC",
  SPY: "SPY",
  THYAO: "THYAO.IS",
  TUPRS: "TUPRS.IS",
  USDTRY: "USDTRY=X",
  WTI: "CL=F",
  XAG: "XAGUSD=X",
  XAGUSD: "XAGUSD=X",
  XAU: "XAUUSD=X",
  XAUUSD: "XAUUSD=X",
};

const BASE_LIQUIDITY_BY_SYMBOL = ASSET_UNIVERSE.reduce<Record<string, LiquidityProfile>>((acc, asset) => {
  acc[asset.ticker.toUpperCase()] = LIQUIDITY_TABLE[asset.liquidityTier];
  return acc;
}, {});

function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9=.^-]/g, "");
}

function resolveProviderSymbol(symbol: string): string {
  return PROVIDER_SYMBOL_OVERRIDES[symbol] ?? symbol;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRecord(value: unknown, key: string): Record<string, unknown> | null {
  if (!isObjectRecord(value)) return null;
  const maybeRecord = value[key];
  return isObjectRecord(maybeRecord) ? maybeRecord : null;
}

function readArray(value: unknown, key: string): unknown[] {
  if (!isObjectRecord(value)) return [];
  const maybeArray = value[key];
  return Array.isArray(maybeArray) ? maybeArray : [];
}

function readString(value: unknown, key: string): string | null {
  if (!isObjectRecord(value)) return null;
  const field = value[key];
  return typeof field === "string" && field.length > 0 ? field : null;
}

function readFiniteNumber(value: unknown, key: string): number | null {
  if (!isObjectRecord(value)) return null;
  const field = value[key];
  return typeof field === "number" && Number.isFinite(field) ? field : null;
}

function readOptionalNumberArray(value: unknown, key: string): Array<number | null> {
  const list = readArray(value, key);
  return list.map((item) => (typeof item === "number" && Number.isFinite(item) ? item : null));
}

function toIsoDay(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toISOString().slice(0, 10);
}

function mapVolumeBand(avgDailyVolume: number | null): MarketLiquidity["volumeBand"] {
  if (avgDailyVolume === null || !Number.isFinite(avgDailyVolume) || avgDailyVolume <= 0) return "unknown";
  if (avgDailyVolume >= 80_000_000) return "very_high";
  if (avgDailyVolume >= 20_000_000) return "high";
  if (avgDailyVolume >= 2_000_000) return "medium";
  return "low";
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function parseQuotePayload(
  payload: unknown,
  symbol: string,
  providerSymbol: string
): MarketQuote | null {
  const quoteResponse = readRecord(payload, "quoteResponse");
  const results = readArray(quoteResponse, "result");
  const first = results.length > 0 ? results[0] : null;
  if (!isObjectRecord(first)) return null;

  const price = readFiniteNumber(first, "regularMarketPrice");
  if (price === null) return null;

  const changePercent = readFiniteNumber(first, "regularMarketChangePercent") ?? 0;
  const volume = readFiniteNumber(first, "regularMarketVolume");
  const currency = readString(first, "currency");
  const marketTime = readFiniteNumber(first, "regularMarketTime");
  const timestampIso = marketTime !== null ? new Date(marketTime * 1000).toISOString() : null;

  return {
    symbol,
    providerSymbol,
    price,
    changePercent,
    volume,
    currency,
    timestampIso,
  };
}

function parseHistoryPayload(
  payload: unknown,
  symbol: string,
  providerSymbol: string
): MarketHistory {
  const chart = readRecord(payload, "chart");
  const resultList = readArray(chart, "result");
  const firstResult = resultList.length > 0 ? resultList[0] : null;
  if (!isObjectRecord(firstResult)) {
    return { symbol, providerSymbol, points: [], returns: [] };
  }

  const timestampsRaw = readOptionalNumberArray(firstResult, "timestamp");
  const timestamps = timestampsRaw.filter((value): value is number => value !== null);
  const indicators = readRecord(firstResult, "indicators");
  const quoteEntries = readArray(indicators, "quote");
  const quoteEntry = quoteEntries.length > 0 ? quoteEntries[0] : null;
  const closes = readOptionalNumberArray(quoteEntry, "close");
  const volumes = readOptionalNumberArray(quoteEntry, "volume");
  const length = Math.min(timestamps.length, closes.length);

  const points: MarketHistoryPoint[] = [];
  for (let index = 0; index < length; index += 1) {
    const close = closes[index];
    if (close === null || close <= 0) continue;
    points.push({
      date: toIsoDay(timestamps[index]),
      close,
      volume: volumes[index] ?? null,
    });
  }

  const returns: number[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1].close;
    const current = points[index].close;
    if (previous > 0 && Number.isFinite(previous) && Number.isFinite(current)) {
      returns.push(current / previous - 1);
    }
  }

  return { symbol, providerSymbol, points, returns };
}

export class MarketDataGateway implements MarketDataGatewayPort {
  private readonly quoteCache = new Map<string, CacheEntry<MarketQuote | null>>();

  private readonly historyCache = new Map<string, CacheEntry<MarketHistory>>();

  private readonly liquidityCache = new Map<string, CacheEntry<MarketLiquidity>>();

  private readonly baseUrl: string;

  private readonly supportedAssets: AssetCatalogItem[];

  constructor(baseUrl = process.env.YAHOO_FINANCE_BASE_URL ?? DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
    this.supportedAssets = buildAssetCatalog();
  }

  getSupportedAssets(): AssetCatalogItem[] {
    return this.supportedAssets;
  }

  async getQuote(symbolInput: string): Promise<MarketQuote | null> {
    const symbol = normalizeSymbol(symbolInput);
    if (!symbol) return null;
    const cached = this.getCached(this.quoteCache, symbol);
    if (cached !== undefined) return cached;

    const providerSymbol = resolveProviderSymbol(symbol);
    const url = `${this.baseUrl}/v7/finance/quote?symbols=${encodeURIComponent(providerSymbol)}`;
    const payload = await fetchJson(url);
    const quote = parseQuotePayload(payload, symbol, providerSymbol);
    this.setCached(this.quoteCache, symbol, quote, QUOTE_TTL_MS);
    return quote;
  }

  async getHistory(
    symbolInput: string,
    options: MarketHistoryOptions = {}
  ): Promise<MarketHistory> {
    const symbol = normalizeSymbol(symbolInput);
    const range = options.range ?? "1y";
    const interval = options.interval ?? "1d";
    if (!symbol) return { symbol, providerSymbol: symbol, points: [], returns: [] };

    const cacheKey = `${symbol}:${range}:${interval}`;
    const cached = this.getCached(this.historyCache, cacheKey);
    if (cached !== undefined) return cached;

    const providerSymbol = resolveProviderSymbol(symbol);
    const url =
      `${this.baseUrl}/v8/finance/chart/${encodeURIComponent(providerSymbol)}` +
      `?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
    const payload = await fetchJson(url);
    const history = parseHistoryPayload(payload, symbol, providerSymbol);
    this.setCached(this.historyCache, cacheKey, history, HISTORY_TTL_MS);
    return history;
  }

  async getLiquidity(symbolInput: string): Promise<MarketLiquidity> {
    const symbol = normalizeSymbol(symbolInput);
    const cacheKey = symbol;
    const cached = this.getCached(this.liquidityCache, cacheKey);
    if (cached !== undefined) return cached;

    const providerSymbol = resolveProviderSymbol(symbol);
    const baseProfile = BASE_LIQUIDITY_BY_SYMBOL[symbol] ?? LIQUIDITY_TABLE.high;
    const [history, quote] = await Promise.all([
      this.getHistory(symbol, { range: "3mo", interval: "1d" }),
      this.getQuote(symbol),
    ]);

    const volumeSamples = history.points
      .map((point) => point.volume)
      .filter((volume): volume is number => typeof volume === "number" && volume > 0);
    const historyAvgVolume =
      volumeSamples.length > 0
        ? volumeSamples.reduce((sum, value) => sum + value, 0) / volumeSamples.length
        : null;
    const avgDailyVolume = historyAvgVolume ?? quote?.volume ?? null;

    const liquidity: MarketLiquidity = {
      symbol,
      providerSymbol,
      profile: baseProfile,
      avgDailyVolume,
      volumeBand: mapVolumeBand(avgDailyVolume),
    };

    this.setCached(this.liquidityCache, cacheKey, liquidity, LIQUIDITY_TTL_MS);
    return liquidity;
  }

  private getCached<TValue>(
    cache: Map<string, CacheEntry<TValue>>,
    key: string
  ): TValue | undefined {
    const existing = cache.get(key);
    if (!existing) return undefined;
    if (existing.expiresAt <= Date.now()) {
      cache.delete(key);
      return undefined;
    }
    return existing.value;
  }

  private setCached<TValue>(
    cache: Map<string, CacheEntry<TValue>>,
    key: string,
    value: TValue,
    ttlMs: number
  ): void {
    cache.set(key, {
      expiresAt: Date.now() + ttlMs,
      value,
    });
  }
}

export const marketDataGateway = new MarketDataGateway();
