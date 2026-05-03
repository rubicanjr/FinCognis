import { NextResponse } from "next/server";

const SEARCH_ENDPOINT = "https://query1.finance.yahoo.com/v1/finance/search";
const ALLOWED_EXCHANGES = new Set(["IST", "NYQ", "NMS", "NGM", "PCX", "CCC", "COMMODITY"]);
const BLOCKED_EXCHANGES = new Set(["OTC", "OTCM", "OTCQB", "OTCQX", "PNK", "PINK"]);
const EQUITY_EXCHANGES = new Set(["IST", "NYQ", "NMS", "NGM", "PCX"]);
const COMMODITY_ALIAS_BY_SYMBOL: Record<string, string> = {
  "GC=F": "XAU",
  "SI=F": "XAG",
  "CL=F": "WTI",
  "BZ=F": "BRENT",
};

interface YahooSearchResultItem {
  ticker: string;
  name: string;
  exchange: string;
  yahooSymbol: string;
  currency: "TRY" | "USD";
  assetClass: "equity_bist" | "equity_us" | "crypto" | "commodity" | "fx" | "etf_us";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readString(record: Record<string, unknown> | null, field: string): string {
  if (!record) return "";
  const value = record[field];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSymbol(rawSymbol: string, exchange: string): string {
  const symbol = rawSymbol.trim().toUpperCase();
  if (!symbol) return "";

  if (COMMODITY_ALIAS_BY_SYMBOL[symbol]) return COMMODITY_ALIAS_BY_SYMBOL[symbol];
  if (exchange === "IST" && symbol.endsWith(".IS")) return symbol.slice(0, -3);
  if (exchange === "CCC" && symbol.endsWith("-USD")) return symbol.slice(0, -4);

  return symbol.replace(/[^A-Z0-9]/g, "");
}

function isAllowedQuote(record: Record<string, unknown>): boolean {
  const exchange = readString(record, "exchange").toUpperCase();
  if (!ALLOWED_EXCHANGES.has(exchange)) return false;
  if (BLOCKED_EXCHANGES.has(exchange)) return false;

  const quoteType = readString(record, "quoteType").toUpperCase();
  if (quoteType === "CURRENCY") return false;

  const shortName = readString(record, "shortname") || readString(record, "shortName");
  const longName = readString(record, "longname") || readString(record, "longName");
  if (!shortName && !longName) return false;

  const typeDisp = readString(record, "typeDisp").toUpperCase();
  const sector = readString(record, "sector");
  const industry = readString(record, "industryDisp");
  const isEtf = quoteType === "ETF" || typeDisp === "ETF";

  if (!isEtf && EQUITY_EXCHANGES.has(exchange) && !sector && !industry && !longName) {
    return false;
  }

  return true;
}

function mapCurrency(exchange: string, rawCurrency: string): "TRY" | "USD" {
  if (exchange === "IST") return "TRY";
  if (rawCurrency.toUpperCase() === "TRY") return "TRY";
  return "USD";
}

function mapAssetClass(
  exchange: string,
  quoteType: string,
  typeDisp: string
): "equity_bist" | "equity_us" | "crypto" | "commodity" | "fx" | "etf_us" {
  if (exchange === "IST") return "equity_bist";
  if (exchange === "CCC") return "crypto";
  if (exchange === "COMMODITY") return "commodity";
  if (quoteType === "ETF" || typeDisp === "ETF") return "etf_us";
  return "equity_us";
}

function toSearchResult(record: Record<string, unknown>): YahooSearchResultItem | null {
  if (!isAllowedQuote(record)) return null;

  const exchange = readString(record, "exchange").toUpperCase();
  const quoteType = readString(record, "quoteType").toUpperCase();
  const typeDisp = readString(record, "typeDisp").toUpperCase();
  const yahooSymbol = readString(record, "symbol").toUpperCase();
  const ticker = normalizeSymbol(yahooSymbol, exchange);
  if (!ticker || !/^[A-Z0-9]{2,12}$/.test(ticker)) return null;

  const name = readString(record, "shortname") || readString(record, "shortName") || readString(record, "longname") || readString(record, "longName") || ticker;
  const currency = mapCurrency(exchange, readString(record, "currency"));

  return {
    ticker,
    name,
    exchange,
    yahooSymbol,
    currency,
    assetClass: mapAssetClass(exchange, quoteType, typeDisp),
  };
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] }, { status: 200 });

  const endpoint =
    `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}` +
    "&quotesCount=8&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query";

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    const payload = (await response.json()) as { quotes?: unknown[] };
    const mapped = (Array.isArray(payload.quotes) ? payload.quotes : [])
      .map((item) => toSearchResult(asRecord(item) ?? {}))
      .filter((item): item is YahooSearchResultItem => item !== null);

    const deduped = Array.from(
      mapped.reduce((acc, item) => {
        if (!acc.has(item.ticker)) acc.set(item.ticker, item);
        return acc;
      }, new Map<string, YahooSearchResultItem>()).values()
    ).slice(0, 8);

    return NextResponse.json({ results: deduped }, { status: 200 });
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
