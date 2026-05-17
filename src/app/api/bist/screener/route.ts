import { NextResponse } from "next/server";
import {
  computeRiskLayer,
  type LiquidityMetrics,
  type RiskMetrics,
} from "@/lib/bist/risk";
import { SPK_LEGAL_DISCLAIMER } from "@/lib/legal/spk-disclaimer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const KAP_BASE = "https://www.kap.org.tr";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ─── BIST30 + BIST100 tickers ───
const BIST30 = new Set([
  "AKBNK","AKSEN","ASELS","BIMAS","EKGYO","ENKAI","EREGL","FROTO","GARAN","GUBRF",
  "HEKTS","ISCTR","KCHOL","KRDMD","MGROS","ODAS","PETKM","PGSUS","SAHOL","SASA",
  "SISE","TAVHL","TCELL","THYAO","TKFEN","TOASO","TOASO","TTKOM","TUPRS","VESTL","YKBNK",
]);

const REJECTED = new Set([
  "BTC","ETH","XRP","DOGE","SOL","XAU","XAG","LTC","ADA","AVAX","DOT","MATIC",
  "USDTRY","EURTRY","GBPTRY","EURUSD","GBPUSD","USDJPY","AUDUSD","NZDUSD",
  "GC","SI","CL","NG","HG","XU100","XU030","XU050",
]);

// ─── Interfaces ───
interface CriterionScore {
  name: string;
  score: number;
  maxScore: number;
  value: unknown;
  note: string;
  isPlaceholder: boolean;
}

interface HorizonResult {
  label: string;
  totalScore: number;
  availableMax: number;
  criteria: CriterionScore[];
}

interface ScreenerResponse {
  ticker: string;
  assetValid: boolean;
  compositeScore: number;
  compositeMax: number;
  disclaimer: string;
  shortTerm: HorizonResult;
  longTerm: HorizonResult;
  liquidity?: LiquidityMetrics;
  risk?: RiskMetrics;
  error?: string;
}

function parsePositiveNumberParam(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

// ─── Computation helpers ───

function computeRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const deltas = closes.slice(1).map((c, i) => c - closes[i]);
  const recent = deltas.slice(-period);
  const gains = recent.filter((d) => d > 0);
  const losses = recent.filter((d) => d < 0).map((d) => -d);
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period || 0.001;
  return Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 10) / 10;
}

function computeSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  return Math.round(closes.slice(-period).reduce((a, b) => a + b, 0) / period * 100) / 100;
}

function computeATR(highs: number[], lows: number[], closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  if (trs.length < period) return null;
  return Math.round(trs.slice(-period).reduce((a, b) => a + b, 0) / period * 10000) / 10000;
}

function computeMACD(closes: number[]): { cross: string | null; histogram: number } {
  if (closes.length < 35) return { cross: null, histogram: 0 };

  const ema = (data: number[], span: number) => {
    const m = 2 / (span + 1);
    const result = [data[0]];
    for (let i = 1; i < data.length; i++) result.push(data[i] * m + result[i - 1] * (1 - m));
    return result;
  };

  const macdLine = ema(closes, 12).map((v, i) => v - ema(closes, 26)[i]);
  const signalLine = ema(macdLine, 9);
  const hist = macdLine.map((v, i) => v - signalLine[i]);

  let cross: string | null = null;
  if (hist.length >= 2) {
    if (hist[hist.length - 2] <= 0 && hist[hist.length - 1] > 0) cross = "bullish";
    else if (hist[hist.length - 2] >= 0 && hist[hist.length - 1] < 0) cross = "bearish";
  }
  return { cross, histogram: hist[hist.length - 1] ?? 0 };
}

function computeVolumeTrend(volumes: (number | null)[], period = 20): string {
  const clean = volumes.filter((v): v is number => v != null && v > 0);
  if (clean.length < period) return "insufficient";
  const recent = clean.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const base = clean.slice(-period).reduce((a, b) => a + b, 0) / period;
  if (recent > base * 1.2) return "increasing";
  if (recent < base * 0.8) return "decreasing";
  return "stable";
}

function computePercentile(closes: number[]): number | null {
  if (closes.length < 20) return null;
  const current = closes[closes.length - 1];
  const low = Math.min(...closes);
  const high = Math.max(...closes);
  if (high === low) return 50;
  return Math.round(((current - low) / (high - low)) * 1000) / 10;
}

// ─── Scoring functions ───

const PH_NOTE = "Finansal tablo verisi gerektirir. Hesaplanamiyor — ileride eklenecek.";
const placeholder = (name: string, max: number): CriterionScore => ({ name, score: 0, maxScore: max, value: null, note: PH_NOTE, isPlaceholder: true });

function scoreRSI(rsi: number | null): CriterionScore {
  if (rsi == null) return { name: "RSI-14", score: 0, maxScore: 15, value: null, note: "Veri yetersiz", isPlaceholder: false };
  if (rsi >= 40 && rsi <= 60) return { name: "RSI-14", score: 15, maxScore: 15, value: rsi, note: "Optimal band (40-60)", isPlaceholder: false };
  if (rsi >= 30 && rsi <= 70) return { name: "RSI-14", score: 10, maxScore: 15, value: rsi, note: "Kabul edilebilir", isPlaceholder: false };
  if (rsi >= 20 && rsi <= 80) return { name: "RSI-14", score: 5, maxScore: 15, value: rsi, note: "Asiri yone kayma", isPlaceholder: false };
  return { name: "RSI-14", score: 2, maxScore: 15, value: rsi, note: "Asiri alim/satim", isPlaceholder: false };
}

function scoreMACD(macd: { cross: string | null }, vol: string): CriterionScore {
  if (!macd.cross) return { name: "MACD + Hacim", score: macd.cross === null ? 6 : 0, maxScore: 20, value: macd, note: macd.cross ? "" : "Kesisim yok", isPlaceholder: false };
  let s = 0;
  const parts: string[] = [];
  if (macd.cross === "bullish") { s += 12; parts.push("Bullish"); } else { s += 3; parts.push("Bearish"); }
  if (macd.cross === "bullish" && vol === "increasing") { s += 8; parts.push("Hacim teyidi"); }
  else if (vol === "increasing") { s += 4; parts.push("Hacim artan"); }
  return { name: "MACD + Hacim", score: Math.min(s, 20), maxScore: 20, value: { cross: macd.cross, volume: vol }, note: parts.join(" | "), isPlaceholder: false };
}

function scoreSMA(closes: number[]): CriterionScore {
  const sma50 = computeSMA(closes, 50);
  const sma200 = computeSMA(closes, 200);
  const cur = closes[closes.length - 1] ?? 0;
  if (!sma50) return { name: "SMA-50/200", score: 0, maxScore: 15, value: null, note: "Veri yetersiz", isPlaceholder: false };
  let s = 0;
  const parts: string[] = [];
  if (cur > sma50) { s += 5; parts.push("Fiyat > SMA-50"); } else parts.push("Fiyat < SMA-50");
  if (sma200) { if (sma50 > sma200) { s += 10; parts.push("Golden Cross"); } else { s += 2; parts.push("Death Cross"); } }
  else if (cur > sma50) s += 5;
  return { name: "SMA-50/200", score: Math.min(s, 15), maxScore: 15, value: { sma50, sma200, current: cur }, note: parts.join(" | "), isPlaceholder: false };
}

function scoreATR(atr: number | null, price: number): CriterionScore {
  if (!atr || !price) return { name: "ATR-14", score: 0, maxScore: 10, value: null, note: "Veri yetersiz", isPlaceholder: false };
  const pct = (atr / price) * 100;
  const s = pct >= 1 && pct <= 3 ? 10 : pct >= 0.5 ? 7 : pct <= 5 ? 6 : pct > 5 ? 3 : 5;
  const noteLabel = pct >= 1 && pct <= 3 ? "Normal" : pct > 3 ? "Yuksek" : "Dusuk";
  return { name: "ATR-14", score: s, maxScore: 10, value: Math.round(pct * 10) / 10, note: `${noteLabel} volatilite (${pct.toFixed(1)}%)`, isPlaceholder: false };
}

function scoreHistoricalBand(closes: number[]): CriterionScore {
  const pct = computePercentile(closes);
  if (pct == null) return { name: "Tarihsel Band", score: 0, maxScore: 15, value: null, note: "Veri yetersiz", isPlaceholder: false };
  const s = pct <= 20 ? 15 : pct <= 40 ? 12 : pct <= 60 ? 8 : pct <= 80 ? 5 : 3;
  const noteLabel = pct <= 20 ? "Deger firsati" : pct <= 40 ? "Makul" : pct <= 60 ? "Normal" : pct <= 80 ? "Biraz pahali" : "Pahali";
  return { name: "Tarihsel Band", score: s, maxScore: 15, value: pct, note: `${noteLabel} (%${pct})`, isPlaceholder: false };
}

function scoreRealtReturn(closes: number[], inflation = 3): CriterionScore {
  if (closes.length < 20) return { name: "TL Reel Getiri", score: 0, maxScore: 10, value: null, note: "Veri yetersiz", isPlaceholder: false };
  const nom = ((closes[closes.length - 1] - closes[closes.length - 20]) / closes[closes.length - 20]) * 100;
  const real = nom - inflation;
  const s = real > 5 ? 10 : real > 0 ? 7 : real > -5 ? 4 : 1;
  return { name: "TL Reel Getiri", score: s, maxScore: 10, value: { nominal: Math.round(nom * 10) / 10, real: Math.round(real * 10) / 10 }, note: `Reel: ${real > 0 ? "+" : ""}${real.toFixed(1)}%`, isPlaceholder: false };
}

// ─── Main scoring ───

function scoreBist(
  ticker: string,
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: (number | null)[]
): ScreenerResponse {
  const price = closes[closes.length - 1] ?? 0;
  const rsi = computeRSI(closes);
  const macd = computeMACD(closes);
  const volTrend = computeVolumeTrend(volumes);
  const atr = computeATR(highs, lows, closes);

  // Short-term criteria
  const stCriteria: CriterionScore[] = [
    scoreRSI(rsi),
    scoreMACD(macd, volTrend),
    scoreSMA(closes),
    scoreATR(atr, price),
    placeholder("MKK Takas", 10),
    placeholder("Short Interest", 8),
    placeholder("Buyuk Lot", 7),
    placeholder("Analist Revizyonu", 5),
  ];

  // Long-term criteria
  const ltCriteria: CriterionScore[] = [
    scoreHistoricalBand(closes),
    scoreRealtReturn(closes),
    placeholder("FCF/GAAP Kar", 12),
    placeholder("Tahakkuk Orani", 10),
    placeholder("Calisma Sermayesi", 8),
    placeholder("ROIC/WACC", 12),
    placeholder("Geri Alim", 8),
    placeholder("Borc/EBITDA", 10),
    placeholder("Sektor FK/FDV", 10),
    placeholder("PEG Orani", 8),
  ];

  const stScore = stCriteria.reduce((a, c) => a + c.score, 0);
  const stMax = stCriteria.filter((c) => !c.isPlaceholder).reduce((a, c) => a + c.maxScore, 0);
  const ltScore = ltCriteria.reduce((a, c) => a + c.score, 0);
  const ltMax = ltCriteria.filter((c) => !c.isPlaceholder).reduce((a, c) => a + c.maxScore, 0);

  const stPct = stMax > 0 ? (stScore / stMax) * 100 : 0;
  const ltPct = ltMax > 0 ? (ltScore / ltMax) * 100 : 0;
  const composite = Math.round((stPct * 0.5 + ltPct * 0.5) * 10) / 10;

  return {
    ticker: ticker.toUpperCase(),
    assetValid: true,
    compositeScore: composite,
    compositeMax: 100,
    disclaimer: SPK_LEGAL_DISCLAIMER,
    shortTerm: { label: "Kisa Vade (1-4 hafta)", totalScore: stScore, availableMax: stMax, criteria: stCriteria },
    longTerm: { label: "Uzun Vade (3-12 ay)", totalScore: ltScore, availableMax: ltMax, criteria: ltCriteria },
  };
}

// ─── API handler ───

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const rawTickers = sp.get("tickers") ?? "";
  const minAvgVolume20 = parsePositiveNumberParam(sp.get("minAvgVolume20"), 100_000);
  const minAvgNotional20 = parsePositiveNumberParam(sp.get("minAvgNotional20"), 5_000_000);
  const tickerList = rawTickers
    .toUpperCase()
    .split(",")
    .map((t) => t.trim().replace(".IS", ""))
    .filter(Boolean)
    .slice(0, 10);

  if (!tickerList.length) {
    return NextResponse.json({ error: "tickers parametresi gerekli. Ornek: ?tickers=GARAN,AKBNK" }, { status: 400 });
  }

  const results: ScreenerResponse[] = [];

  for (const ticker of tickerList) {
    // Asset filter
    if (REJECTED.has(ticker)) {
      results.push({ ticker, assetValid: false, compositeScore: 0, compositeMax: 100, disclaimer: "", shortTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] }, longTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] }, error: `${ticker} kripto/emtia/doviz varligidir. Sadece BIST hisseleri kabul edilir.` });
      continue;
    }

    // Yahoo OHLCV
    try {
      const yahooUrl = `${YAHOO_CHART_BASE}/${ticker}.IS?range=1y&interval=1d`;
      const yResp = await fetch(yahooUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) });
      if (!yResp.ok) {
        results.push({ ticker, assetValid: false, compositeScore: 0, compositeMax: 100, disclaimer: "", shortTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] }, longTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] }, error: `Yahoo Finance veri yok (${yResp.status})` });
        continue;
      }
      const yData = await yResp.json();
      const result0 = yData?.chart?.result?.[0];
      if (!result0) {
        results.push({ ticker, assetValid: false, compositeScore: 0, compositeMax: 100, disclaimer: "", shortTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] }, longTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] }, error: "Yahoo veri yapisi beklenmedik" });
        continue;
      }

      // Validate BIST
      const meta = result0.meta ?? {};
      if (meta.quoteType !== "EQUITY" || meta.exchangeName !== "IST") {
        if (!BIST30.has(ticker)) {
          results.push({ ticker, assetValid: false, compositeScore: 0, compositeMax: 100, disclaimer: "", shortTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] }, longTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] }, error: `${ticker} BIST hissesi olarak taninamadi` });
          continue;
        }
      }

      const quotes = result0.indicators?.quote?.[0] ?? {};
      const closes: number[] = (quotes.close ?? []).filter((v: number | null): v is number => v != null);
      const highs: number[] = (quotes.high ?? []).filter((v: number | null): v is number => v != null);
      const lows: number[] = (quotes.low ?? []).filter((v: number | null): v is number => v != null);
      const volumes: (number | null)[] = quotes.volume ?? [];

      if (closes.length < 30) {
        results.push({ ticker, assetValid: false, compositeScore: 0, compositeMax: 100, disclaimer: "", shortTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] }, longTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] }, error: `Yetersiz veri (${closes.length} gun)` });
        continue;
      }

      const riskLayer = computeRiskLayer(highs, lows, closes, volumes, {
        minAvgVolume20,
        minAvgNotional20,
      });

      if (!riskLayer.liquidity.liquidityPass) {
        results.push({
          ticker,
          assetValid: false,
          compositeScore: 0,
          compositeMax: 100,
          disclaimer: "",
          shortTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] },
          longTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] },
          liquidity: riskLayer.liquidity,
          risk: riskLayer.risk,
          error: `Likidite filtresi: ${riskLayer.liquidity.reason}`,
        });
        continue;
      }

      const scored = scoreBist(ticker, closes, highs, lows, volumes);
      results.push({
        ...scored,
        liquidity: riskLayer.liquidity,
        risk: riskLayer.risk,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      results.push({ ticker, assetValid: false, compositeScore: 0, compositeMax: 100, disclaimer: "", shortTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] }, longTerm: { label: "", totalScore: 0, availableMax: 0, criteria: [] }, error: msg });
    }
  }

  return NextResponse.json({
    totalScanned: tickerList.length,
    validResults: results.filter((r) => r.assetValid).length,
    rankings: results,
  });
}
