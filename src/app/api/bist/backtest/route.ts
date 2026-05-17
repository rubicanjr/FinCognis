import { NextResponse } from "next/server";
import {
  generateStrategySignals,
  runRiskAwareBacktest,
  type BacktestStrategy,
} from "@/lib/bist/backtest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const BIST30 = new Set([
  "AKBNK", "AKSEN", "ASELS", "BIMAS", "EKGYO", "ENKAI", "EREGL", "FROTO", "GARAN", "GUBRF",
  "HEKTS", "ISCTR", "KCHOL", "KRDMD", "MGROS", "ODAS", "PETKM", "PGSUS", "SAHOL", "SASA",
  "SISE", "TAVHL", "TCELL", "THYAO", "TKFEN", "TOASO", "TTKOM", "TUPRS", "VESTL", "YKBNK",
]);

const REJECTED = new Set([
  "BTC", "ETH", "XRP", "DOGE", "SOL", "XAU", "XAG", "LTC", "ADA", "AVAX", "DOT", "MATIC",
  "USDTRY", "EURTRY", "GBPTRY", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "NZDUSD",
  "GC", "SI", "CL", "NG", "HG", "XU100", "XU030", "XU050",
]);

type RiskPreset = "conservative" | "balanced" | "aggressive";

const RISK_PRESET_CONFIG: Record<
  RiskPreset,
  {
    maxRiskScore: number;
    blockHighVolatilityRegime: boolean;
    maxDrawdownGatePercent: number;
    warmupBars: number;
    tailRiskHedgePercent: number;
  }
> = {
  conservative: {
    maxRiskScore: 55,
    blockHighVolatilityRegime: true,
    maxDrawdownGatePercent: 18,
    warmupBars: 40,
    tailRiskHedgePercent: 2,
  },
  balanced: {
    maxRiskScore: 70,
    blockHighVolatilityRegime: true,
    maxDrawdownGatePercent: 25,
    warmupBars: 30,
    tailRiskHedgePercent: 1.5,
  },
  aggressive: {
    maxRiskScore: 85,
    blockHighVolatilityRegime: false,
    maxDrawdownGatePercent: 35,
    warmupBars: 20,
    tailRiskHedgePercent: 1,
  },
};

function parsePositiveNumberParam(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseBoundedNumberParam(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = parsePositiveNumberParam(value, fallback);
  return Math.max(min, Math.min(max, parsed));
}

function parseBooleanParam(value: string | null, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseStrategy(value: string | null): BacktestStrategy {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "rsi_reversion") return "rsi_reversion";
  if (v === "buy_hold") return "buy_hold";
  return "sma_momentum";
}

function parseRiskPreset(value: string | null): RiskPreset {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "conservative") return "conservative";
  if (v === "aggressive") return "aggressive";
  return "balanced";
}

function isValidTickerSymbol(value: string): boolean {
  return /^[A-Z0-9]{1,10}$/.test(value);
}

interface YahooOHLCV {
  timestamps: number[];
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: (number | null)[];
  error?: string;
}

async function fetchYahooOHLCV(ticker: string, range = "2y"): Promise<YahooOHLCV> {
  const yahooUrl = `${YAHOO_CHART_BASE}/${ticker}.IS?range=${encodeURIComponent(range)}&interval=1d`;
  const yResp = await fetch(yahooUrl, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(12_000),
  });

  if (!yResp.ok) {
    return {
      timestamps: [],
      closes: [],
      highs: [],
      lows: [],
      volumes: [],
      error: `Yahoo Finance veri yok (${yResp.status})`,
    };
  }

  const yData = await yResp.json();
  const result0 = yData?.chart?.result?.[0];
  if (!result0) {
    return {
      timestamps: [],
      closes: [],
      highs: [],
      lows: [],
      volumes: [],
      error: "Yahoo veri yapisi beklenmedik",
    };
  }

  const meta = result0.meta ?? {};
  if (meta.quoteType !== "EQUITY" || meta.exchangeName !== "IST") {
    if (!BIST30.has(ticker)) {
      return {
        timestamps: [],
        closes: [],
        highs: [],
        lows: [],
        volumes: [],
        error: `${ticker} BIST hissesi olarak taninamadi`,
      };
    }
  }

  const quotes = result0.indicators?.quote?.[0] ?? {};
  const rawTimestamps: unknown[] = result0.timestamp ?? [];
  const rawCloses: Array<number | null> = quotes.close ?? [];
  const rawHighs: Array<number | null> = quotes.high ?? [];
  const rawLows: Array<number | null> = quotes.low ?? [];
  const rawVolumes: Array<number | null> = quotes.volume ?? [];

  const alignedLen = Math.min(
    rawTimestamps.length,
    rawCloses.length,
    rawHighs.length,
    rawLows.length,
    rawVolumes.length
  );

  const timestamps: number[] = [];
  const closes: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  const volumes: (number | null)[] = [];

  for (let i = 0; i < alignedLen; i++) {
    const ts = rawTimestamps[i];
    const close = rawCloses[i];
    const high = rawHighs[i];
    const low = rawLows[i];
    const volume = rawVolumes[i];

    if (typeof ts !== "number" || !Number.isFinite(ts)) continue;
    if (typeof close !== "number" || !Number.isFinite(close) || close <= 0) continue;
    if (typeof high !== "number" || !Number.isFinite(high) || high <= 0) continue;
    if (typeof low !== "number" || !Number.isFinite(low) || low <= 0) continue;
    if (high < low) continue;

    timestamps.push(ts);
    closes.push(close);
    highs.push(high);
    lows.push(low);
    volumes.push(typeof volume === "number" && Number.isFinite(volume) && volume >= 0 ? volume : null);
  }

  return { timestamps, closes, highs, lows, volumes };
}

export interface BistBacktestResponsePayload {
  totalScanned: number;
  backtestsGenerated: number;
  strategy: BacktestStrategy;
  config: {
    riskPreset: RiskPreset;
    initialCapital: number;
    minAvgVolume20: number;
    minAvgNotional20: number;
    maxRiskScore: number;
    blockHighVolatilityRegime: boolean;
    maxDrawdownGatePercent: number;
    warmupBars: number;
    tailRiskHedgePercent: number;
    commissionBps: number;
    slippageBps: number;
    taxBps: number;
    range: string;
  };
  results: Array<ReturnType<typeof runRiskAwareBacktest>>;
  errors: Array<{ ticker: string; error: string }>;
}

async function buildBistBacktestResponse(sp: URLSearchParams): Promise<
  | { status: 200; payload: BistBacktestResponsePayload }
  | { status: 400; payload: { error: string } }
> {
  const rawTickers = sp.get("tickers") ?? "";
  const strategy = parseStrategy(sp.get("strategy"));
  const riskPreset = parseRiskPreset(sp.get("riskPreset"));
  const preset = RISK_PRESET_CONFIG[riskPreset];
  const range = sp.get("range") ?? "2y";

  const initialCapital = parsePositiveNumberParam(sp.get("initialCapital"), 100_000);

  const minAvgVolume20 = parsePositiveNumberParam(sp.get("minAvgVolume20"), 100_000);
  const minAvgNotional20 = parsePositiveNumberParam(sp.get("minAvgNotional20"), 5_000_000);

  const maxRiskScore = parseBoundedNumberParam(sp.get("maxRiskScore"), preset.maxRiskScore, 1, 100);
  const maxDrawdownGatePercent = parseBoundedNumberParam(
    sp.get("maxDrawdownGatePercent"),
    preset.maxDrawdownGatePercent,
    1,
    100
  );
  const warmupBars = Math.floor(parseBoundedNumberParam(sp.get("warmupBars"), preset.warmupBars, 1, 400));
  const blockHighVolatilityRegime = parseBooleanParam(
    sp.get("blockHighVolatilityRegime"),
    preset.blockHighVolatilityRegime
  );
  const tailRiskHedgePercent = parseBoundedNumberParam(
    sp.get("tailRiskHedgePercent"),
    preset.tailRiskHedgePercent,
    0,
    5
  );

  const commissionBps = parseBoundedNumberParam(sp.get("commissionBps"), 10, 0, 500);
  const slippageBps = parseBoundedNumberParam(sp.get("slippageBps"), 8, 0, 500);
  const taxBps = parseBoundedNumberParam(sp.get("taxBps"), 10, 0, 500);

  const tickerList = rawTickers
    .toUpperCase()
    .split(",")
    .map((t) => t.trim().replace(".IS", ""))
    .filter(Boolean)
    .filter(isValidTickerSymbol)
    .slice(0, 10);

  if (!tickerList.length) {
    return {
      status: 400,
      payload: { error: "tickers parametresi gerekli. Ornek: ?tickers=GARAN,AKBNK" },
    };
  }

  const results: Array<ReturnType<typeof runRiskAwareBacktest>> = [];
  const errors: Array<{ ticker: string; error: string }> = [];

  for (const ticker of tickerList) {
    if (REJECTED.has(ticker)) {
      errors.push({ ticker, error: `${ticker} kripto/emtia/doviz varligidir. Sadece BIST hisseleri.` });
      continue;
    }

    try {
      const ohlcv = await fetchYahooOHLCV(ticker, range);
      if (ohlcv.error) {
        errors.push({ ticker, error: ohlcv.error });
        continue;
      }

      const minLen = Math.min(
        ohlcv.timestamps.length,
        ohlcv.closes.length,
        ohlcv.highs.length,
        ohlcv.lows.length,
        ohlcv.volumes.length
      );

      if (minLen < 60) {
        errors.push({ ticker, error: `Backtest icin yetersiz veri (${minLen} gun)` });
        continue;
      }

      const timestamps = ohlcv.timestamps.slice(0, minLen);
      const closes = ohlcv.closes.slice(0, minLen);
      const highs = ohlcv.highs.slice(0, minLen);
      const lows = ohlcv.lows.slice(0, minLen);
      const volumes = ohlcv.volumes.slice(0, minLen);

      const signals = generateStrategySignals(closes, strategy);

      const backtest = runRiskAwareBacktest({
        ticker,
        timestamps,
        closes,
        highs,
        lows,
        volumes,
        signals,
        initialCapital,
        liquidityThresholds: {
          minAvgVolume20,
          minAvgNotional20,
        },
        riskThresholds: {
          maxRiskScore,
          blockHighVolatilityRegime,
          maxDrawdownGatePercent,
          warmupBars,
        },
        costConfig: {
          commissionBps,
          slippageBps,
          taxBps,
          tailRiskHedgePercent,
        },
      });

      results.push(backtest);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bilinmeyen hata";
      console.error("/api/bist/backtest ticker processing error", { ticker, message });
      errors.push({ ticker, error: "Backtest islemi sirasinda beklenmeyen bir hata olustu" });
    }
  }

  return {
    status: 200,
    payload: {
      totalScanned: tickerList.length,
      backtestsGenerated: results.length,
      strategy,
      config: {
        riskPreset,
        initialCapital,
        minAvgVolume20,
        minAvgNotional20,
        maxRiskScore,
        blockHighVolatilityRegime,
        maxDrawdownGatePercent,
        warmupBars,
        tailRiskHedgePercent,
        commissionBps,
        slippageBps,
        taxBps,
        range,
      },
      results,
      errors,
    },
  };
}

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const result = await buildBistBacktestResponse(sp);
  return NextResponse.json(result.payload, { status: result.status });
}
