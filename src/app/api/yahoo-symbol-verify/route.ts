import { NextResponse } from "next/server";

const QUOTE_ENDPOINT = "https://query1.finance.yahoo.com/v7/finance/quote";
const ALLOWED_EXCHANGES = new Set(["IST", "NYQ", "NMS", "NGM", "PCX", "CCC", "COMMODITY"]);
const BLOCKED_EXCHANGES = new Set(["OTC", "OTCM", "OTCQB", "OTCQX", "PNK", "PINK"]);
const COMMODITY_ALIAS_BY_SYMBOL: Record<string, string> = {
  "GC=F": "XAU",
  "SI=F": "XAG",
  "CL=F": "WTI",
  "BZ=F": "BRENT",
};

interface YahooVerifyResultItem {
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

  const shortName = readString(record, "shortName") || readString(record, "longName");
  if (!shortName) return false;

  const regularPrice = Number(record.regularMarketPrice);
  if (!Number.isFinite(regularPrice) || regularPrice <= 0) return false;

  return true;
}

function mapCurrency(exchange: string, rawCurrency: string): "TRY" | "USD" {
  if (exchange === "IST") return "TRY";
  if (rawCurrency.toUpperCase() === "TRY") return "TRY";
  return "USD";
}

function mapAssetClass(
  exchange: string,
  quoteType: string
): "equity_bist" | "equity_us" | "crypto" | "commodity" | "fx" | "etf_us" {
  if (exchange === "IST") return "equity_bist";
  if (exchange === "CCC") return "crypto";
  if (exchange === "COMMODITY") return "commodity";
  if (quoteType === "ETF") return "etf_us";
  return "equity_us";
}

function toVerifyResult(record: Record<string, unknown>): YahooVerifyResultItem | null {
  if (!isAllowedQuote(record)) return null;

  const exchange = readString(record, "exchange").toUpperCase();
  const yahooSymbol = readString(record, "symbol").toUpperCase();
  const quoteType = readString(record, "quoteType").toUpperCase();
  const ticker = normalizeSymbol(yahooSymbol, exchange);
  if (!ticker || !/^[A-Z0-9]{2,12}$/.test(ticker)) return null;

  return {
    ticker,
    name: readString(record, "shortName") || readString(record, "longName") || ticker,
    exchange,
    yahooSymbol,
    currency: mapCurrency(exchange, readString(record, "currency")),
    assetClass: mapAssetClass(exchange, quoteType),
  };
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") ?? "").trim().toUpperCase();
  if (!symbol || symbol.length < 2 || !/^[A-Z0-9.=\-^]{2,15}$/.test(symbol)) {
    return NextResponse.json({ result: null }, { status: 200 });
  }

  const endpoint = `${QUOTE_ENDPOINT}?symbols=${encodeURIComponent(symbol)}`;

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

    if (!response.ok) return NextResponse.json({ result: null }, { status: 200 });

    const payload = (await response.json()) as { quoteResponse?: { result?: unknown[] } };
    const list = Array.isArray(payload.quoteResponse?.result) ? payload.quoteResponse?.result : [];
    const first = list.length > 0 ? (asRecord(list[0]) ?? null) : null;

    if (!first) return NextResponse.json({ result: null }, { status: 200 });

    const mapped = toVerifyResult(first);
    return NextResponse.json({ result: mapped }, { status: 200 });
  } catch {
    return NextResponse.json({ result: null }, { status: 200 });
  }
}
