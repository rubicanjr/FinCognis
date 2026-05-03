import type { CatalogAsset, CatalogAssetClass } from "@/data/asset-catalog";

export interface YahooSearchAsset extends CatalogAsset {
  source: "static_catalog" | "yahoo_search" | "yahoo_verify";
}

const SEARCH_CACHE_TTL_MS = 5 * 60_000;
const verifyCache = new Map<string, { expiresAt: number; value: YahooSearchAsset | null }>();
const searchCache = new Map<string, { expiresAt: number; value: YahooSearchAsset[] }>();

function getCached<T>(cache: Map<string, { expiresAt: number; value: T }>, key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return cached.value;
}

function setCached<T>(cache: Map<string, { expiresAt: number; value: T }>, key: string, value: T): void {
  cache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, value });
}

function mapUnknownExchangeToClass(exchange: string): CatalogAssetClass {
  const code = exchange.toUpperCase();
  if (code === "IST") return "equity_bist";
  if (["NYQ", "NMS", "NGM", "PCX"].includes(code)) return "equity_us";
  if (code === "CCC") return "crypto";
  if (code === "COMMODITY") return "commodity";
  return "equity_us";
}

function mapAssetClassFromValue(value: unknown, exchange: string): CatalogAssetClass {
  if (
    value === "equity_bist" ||
    value === "equity_us" ||
    value === "crypto" ||
    value === "commodity" ||
    value === "fx" ||
    value === "etf_us"
  ) {
    return value;
  }
  return mapUnknownExchangeToClass(exchange);
}

export async function searchYahooSymbols(query: string): Promise<YahooSearchAsset[]> {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];

  const cached = getCached(searchCache, normalized);
  if (cached) return cached;

  try {
    const response = await fetch(`/api/yahoo-symbol-search?q=${encodeURIComponent(query)}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      setCached(searchCache, normalized, []);
      return [];
    }
    const payload = (await response.json()) as { results?: Array<Record<string, unknown>> };
    const mapped: YahooSearchAsset[] = [];
    for (const item of payload.results ?? []) {
      const ticker = typeof item.ticker === "string" ? item.ticker.toUpperCase() : "";
      const name = typeof item.name === "string" ? item.name : ticker;
      const exchange = typeof item.exchange === "string" ? item.exchange : "YAHOO";
      const yahooSymbol = typeof item.yahooSymbol === "string" ? item.yahooSymbol : ticker;
      const currency = item.currency === "TRY" ? "TRY" : "USD";
      if (!ticker || !name || !yahooSymbol) continue;
      mapped.push({
        ticker,
        name,
        exchange,
        yahooSymbol,
        currency,
        assetClass: mapAssetClassFromValue(item.assetClass, exchange),
        isVerified: true,
        source: "yahoo_search",
      });
      if (mapped.length >= 8) break;
    }

    setCached(searchCache, normalized, mapped);
    return mapped;
  } catch {
    setCached(searchCache, normalized, []);
    return [];
  }
}

export async function verifyYahooTicker(input: string): Promise<YahooSearchAsset | null> {
  const normalized = input.trim().toUpperCase();
  if (!normalized) return null;

  const cached = getCached(verifyCache, normalized);
  if (cached !== null) return cached;

  try {
    const response = await fetch(`/api/yahoo-symbol-verify?symbol=${encodeURIComponent(normalized)}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      setCached(verifyCache, normalized, null);
      return null;
    }

    const payload = (await response.json()) as { result?: Record<string, unknown> | null };
    const result = payload.result;
    if (!result) {
      setCached(verifyCache, normalized, null);
      return null;
    }

    const ticker = typeof result.ticker === "string" ? result.ticker.toUpperCase() : "";
    const name = typeof result.name === "string" ? result.name : ticker;
    const exchange = typeof result.exchange === "string" ? result.exchange : "YAHOO";
    const yahooSymbol = typeof result.yahooSymbol === "string" ? result.yahooSymbol : ticker;
    const currency = result.currency === "TRY" ? "TRY" : "USD";
    if (!ticker || !name || !yahooSymbol) {
      setCached(verifyCache, normalized, null);
      return null;
    }

    const mapped: YahooSearchAsset = {
      ticker,
      name,
      exchange,
      yahooSymbol,
      currency,
      assetClass: mapAssetClassFromValue(result.assetClass, exchange),
      isVerified: true,
      source: "yahoo_verify",
    };

    setCached(verifyCache, normalized, mapped);
    return mapped;
  } catch {
    setCached(verifyCache, normalized, null);
    return null;
  }
}
