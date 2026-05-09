import { NextResponse } from "next/server";
import {
  computeRiskLayer,
  type LiquidityMetrics,
  type RiskMetrics,
} from "@/lib/bist/risk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const BIST30 = new Set([
  "AKBNK","AKSEN","ASELS","BIMAS","EKGYO","ENKAI","EREGL","FROTO","GARAN","GUBRF",
  "HEKTS","ISCTR","KCHOL","KRDMD","MGROS","ODAS","PETKM","PGSUS","SAHOL","SASA",
  "SISE","TAVHL","TCELL","THYAO","TKFEN","TOASO","TTKOM","TUPRS","VESTL","YKBNK",
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

interface DebateArgument {
  category: string;
  criterion: string;
  stance: "bull" | "bear" | "neutral";
  strength: number;
  reasoning: string;
  evidence: string;
}

interface DebateVerdict {
  ticker: string;
  overallStance: "STRONG_BULL" | "BULL" | "NEUTRAL" | "BEAR" | "STRONG_BEAR";
  bullScore: number;
  bearScore: number;
  confidence: number;
  bullArguments: DebateArgument[];
  bearArguments: DebateArgument[];
  neutralArguments: DebateArgument[];
  keyRisks: string[];
  keyOpportunities: string[];
  summary: string;
  liquidity: LiquidityMetrics;
  risk: RiskMetrics;
}

function parsePositiveNumberParam(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

// ─── Technical computation helpers ───

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
  return Math.round((closes.slice(-period).reduce((a, b) => a + b, 0) / period) * 100) / 100;
}

function computeEMA(data: number[], span: number): number[] {
  const m = 2 / (span + 1);
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) result.push(data[i] * m + result[i - 1] * (1 - m));
  return result;
}

function computeMACD(closes: number[]): { cross: string | null; histogram: number; macdLine: number; signalLine: number } {
  if (closes.length < 35) return { cross: null, histogram: 0, macdLine: 0, signalLine: 0 };
  const macdArr = computeEMA(closes, 12).map((v, i) => v - computeEMA(closes, 26)[i]);
  const signalArr = computeEMA(macdArr, 9);
  const hist = macdArr.map((v, i) => v - signalArr[i]);
  let cross: string | null = null;
  if (hist.length >= 2) {
    if (hist[hist.length - 2] <= 0 && hist[hist.length - 1] > 0) cross = "bullish";
    else if (hist[hist.length - 2] >= 0 && hist[hist.length - 1] < 0) cross = "bearish";
  }
  return { cross, histogram: hist[hist.length - 1] ?? 0, macdLine: macdArr[macdArr.length - 1] ?? 0, signalLine: signalArr[signalArr.length - 1] ?? 0 };
}

function computeATR(highs: number[], lows: number[], closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  if (trs.length < period) return null;
  return Math.round((trs.slice(-period).reduce((a, b) => a + b, 0) / period) * 10000) / 10000;
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

function computePriceChange(closes: number[], days: number): number | null {
  if (closes.length < days + 1) return null;
  const prev = closes[closes.length - 1 - days];
  if (!prev) return null;
  return Math.round(((closes[closes.length - 1] - prev) / prev) * 1000) / 10;
}

// ─── Debate argument generators ───

function analyzeRSIDebate(rsi: number | null): DebateArgument[] {
  if (rsi == null) return [];
  const args: DebateArgument[] = [];

  if (rsi < 30) {
    args.push({
      category: "Teknik Momentum",
      criterion: "RSI-14",
      stance: "bull",
      strength: 8,
      reasoning: "RSI asiri satim bolgesinde — teknik toparlanma potansiyeli yuksek",
      evidence: `RSI: ${rsi} (< 30 asiri satim)`,
    });
  } else if (rsi < 40) {
    args.push({
      category: "Teknik Momentum",
      criterion: "RSI-14",
      stance: "bull",
      strength: 5,
      reasoning: "RSI dusuk seviyede — alim firsati olusturabilir",
      evidence: `RSI: ${rsi} (dusuk band)`,
    });
  } else if (rsi > 70) {
    args.push({
      category: "Teknik Momentum",
      criterion: "RSI-14",
      stance: "bear",
      strength: 8,
      reasoning: "RSI asiri alim bolgesinde — duzeltme riski yuksek",
      evidence: `RSI: ${rsi} (> 70 asiri alim)`,
    });
  } else if (rsi > 60) {
    args.push({
      category: "Teknik Momentum",
      criterion: "RSI-14",
      stance: "bear",
      strength: 4,
      reasoning: "RSI yuksek seviyede — momentum yavaslamaya baslayabilir",
      evidence: `RSI: ${rsi} (yuksek band)`,
    });
  } else {
    args.push({
      category: "Teknik Momentum",
      criterion: "RSI-14",
      stance: "neutral",
      strength: 3,
      reasoning: "RSI orta bandda — belirgin yon yok",
      evidence: `RSI: ${rsi} (orta band)`,
    });
  }
  return args;
}

function analyzeMACDDebate(
  macd: { cross: string | null; histogram: number; macdLine: number; signalLine: number },
  volTrend: string
): DebateArgument[] {
  const args: DebateArgument[] = [];

  if (macd.cross === "bullish") {
    args.push({
      category: "Teknik Momentum",
      criterion: "MACD",
      stance: "bull",
      strength: volTrend === "increasing" ? 9 : 6,
      reasoning: volTrend === "increasing"
        ? "Bullish kesisim + artan hacim = guclu alim sinyali"
        : "Bullish kesisim tespit edildi ancak hacim teyidi eksik",
      evidence: `MACD bullish cross, Hacim: ${volTrend}`,
    });
  } else if (macd.cross === "bearish") {
    args.push({
      category: "Teknik Momentum",
      criterion: "MACD",
      stance: "bear",
      strength: volTrend === "increasing" ? 9 : 6,
      reasoning: volTrend === "increasing"
        ? "Bearish kesisim + artan hacim = guclu satim sinyali"
        : "Bearish kesisim tespit edildi",
      evidence: `MACD bearish cross, Hacim: ${volTrend}`,
    });
  } else if (macd.histogram > 0) {
    args.push({
      category: "Teknik Momentum",
      criterion: "MACD",
      stance: "bull",
      strength: 4,
      reasoning: "MACD histogram pozitif — yukselis momentumu devam ediyor",
      evidence: `Histogram: +${macd.histogram.toFixed(4)}`,
    });
  } else if (macd.histogram < 0) {
    args.push({
      category: "Teknik Momentum",
      criterion: "MACD",
      stance: "bear",
      strength: 4,
      reasoning: "MACD histogram negatif — dusus momentumu devam ediyor",
      evidence: `Histogram: ${macd.histogram.toFixed(4)}`,
    });
  }
  return args;
}

function analyzeSMADebate(closes: number[]): DebateArgument[] {
  const args: DebateArgument[] = [];
  const sma50 = computeSMA(closes, 50);
  const sma200 = computeSMA(closes, 200);
  const cur = closes[closes.length - 1] ?? 0;
  if (!sma50) return args;

  if (sma200 && sma50 > sma200 && cur > sma50) {
    args.push({
      category: "Teknik Momentum",
      criterion: "SMA-50/200",
      stance: "bull",
      strength: 9,
      reasoning: "Golden Cross formasyonu + fiyat SMA-50 ustunde — guclu yukselis trendi",
      evidence: `Fiyat: ${cur}, SMA50: ${sma50}, SMA200: ${sma200}`,
    });
  } else if (sma200 && sma50 < sma200 && cur < sma50) {
    args.push({
      category: "Teknik Momentum",
      criterion: "SMA-50/200",
      stance: "bear",
      strength: 9,
      reasoning: "Death Cross formasyonu + fiyat SMA-50 altinda — guclu dusus trendi",
      evidence: `Fiyat: ${cur}, SMA50: ${sma50}, SMA200: ${sma200}`,
    });
  } else if (cur > sma50) {
    args.push({
      category: "Teknik Momentum",
      criterion: "SMA-50",
      stance: "bull",
      strength: 5,
      reasoning: "Fiyat SMA-50 ustunde — kisa vadeli trend olumlu",
      evidence: `Fiyat: ${cur} > SMA50: ${sma50}`,
    });
  } else {
    args.push({
      category: "Teknik Momentum",
      criterion: "SMA-50",
      stance: "bear",
      strength: 5,
      reasoning: "Fiyat SMA-50 altinda — kisa vadeli trend olumsuz",
      evidence: `Fiyat: ${cur} < SMA50: ${sma50}`,
    });
  }
  return args;
}

function analyzeATRDebate(atr: number | null, price: number): DebateArgument[] {
  if (!atr || !price) return [];
  const pct = (atr / price) * 100;
  const args: DebateArgument[] = [];

  if (pct > 4) {
    args.push({
      category: "Volatilite",
      criterion: "ATR-14",
      stance: "bear",
      strength: 6,
      reasoning: "Yuksek volatilite — ongorulemezlik artiyor, risk yukseliyor",
      evidence: `ATR/Price: %${pct.toFixed(1)} (yuksek)`,
    });
    args.push({
      category: "Volatilite",
      criterion: "ATR-14",
      stance: "bull",
      strength: 3,
      reasoning: "Yuksek volatilite dalgalanma firsati sunabilir (swing trader icin)",
      evidence: `ATR/Price: %${pct.toFixed(1)}`,
    });
  } else if (pct >= 1 && pct <= 3) {
    args.push({
      category: "Volatilite",
      criterion: "ATR-14",
      stance: "bull",
      strength: 5,
      reasoning: "Normal volatilite — istikrarli trend devam ediyor",
      evidence: `ATR/Price: %${pct.toFixed(1)} (normal)`,
    });
  }
  return args;
}

function analyzeHistoricalBandDebate(closes: number[]): DebateArgument[] {
  const pct = computePercentile(closes);
  if (pct == null) return [];
  const args: DebateArgument[] = [];

  if (pct <= 20) {
    args.push({
      category: "Degerleme",
      criterion: "Tarihsel Band",
      stance: "bull",
      strength: 8,
      reasoning: "Fiyat tarihsel dusuklerde — deger firsati olabilir",
      evidence: `Tarihsel persentil: %${pct} (dusuk)`,
    });
  } else if (pct <= 40) {
    args.push({
      category: "Degerleme",
      criterion: "Tarihsel Band",
      stance: "bull",
      strength: 5,
      reasoning: "Fiyat tarihsel olarak dusuk-makul seviyede",
      evidence: `Tarihsel persentil: %${pct}`,
    });
  } else if (pct >= 80) {
    args.push({
      category: "Degerleme",
      criterion: "Tarihsel Band",
      stance: "bear",
      strength: 8,
      reasoning: "Fiyat tarihsel zirvelerde — duzeltme olasiligi yuksek",
      evidence: `Tarihsel persentil: %${pct} (zirveye yakin)`,
    });
  } else if (pct >= 60) {
    args.push({
      category: "Degerleme",
      criterion: "Tarihsel Band",
      stance: "bear",
      strength: 4,
      reasoning: "Fiyat tarihsel olarak yuksek seviyede",
      evidence: `Tarihsel persentil: %${pct}`,
    });
  }
  return args;
}

function analyzeRealReturnDebate(closes: number[], inflation = 3): DebateArgument[] {
  if (closes.length < 20) return [];
  const nom = ((closes[closes.length - 1] - closes[closes.length - 20]) / closes[closes.length - 20]) * 100;
  const real = nom - inflation;
  const args: DebateArgument[] = [];

  if (real > 5) {
    args.push({
      category: "Getiri",
      criterion: "TL Reel Getiri",
      stance: "bull",
      strength: 8,
      reasoning: "Guclu reel getiri — enflasyonu asarak deger kazanmis",
      evidence: `Reel: +${real.toFixed(1)}%, Nominal: +${nom.toFixed(1)}%`,
    });
  } else if (real > 0) {
    args.push({
      category: "Getiri",
      criterion: "TL Reel Getiri",
      stance: "bull",
      strength: 4,
      reasoning: "Pozitif reel getiri — enflasyonu zar zor asiyor",
      evidence: `Reel: +${real.toFixed(1)}%`,
    });
  } else if (real < -10) {
    args.push({
      category: "Getiri",
      criterion: "TL Reel Getiri",
      stance: "bear",
      strength: 9,
      reasoning: "Ciddi reel kayip — enflasyon karsisinda deger kaybetmis",
      evidence: `Reel: ${real.toFixed(1)}%`,
    });
  } else if (real < 0) {
    args.push({
      category: "Getiri",
      criterion: "TL Reel Getiri",
      stance: "bear",
      strength: 5,
      reasoning: "Negatif reel getiri — enflasyon karsisinda deger kaybi",
      evidence: `Reel: ${real.toFixed(1)}%`,
    });
  }
  return args;
}

function analyzePriceActionDebate(closes: number[]): DebateArgument[] {
  const args: DebateArgument[] = [];
  const w1 = computePriceChange(closes, 5);
  const m1 = computePriceChange(closes, 20);
  const m3 = computePriceChange(closes, 60);

  if (m3 != null && m3 > 20) {
    args.push({
      category: "Fiyat Performansi",
      criterion: "3 Aylik Degisim",
      stance: "bull",
      strength: 6,
      reasoning: "Guclu 3 aylik performans — momentum yuksek",
      evidence: `3ay: +${m3}%`,
    });
    args.push({
      category: "Fiyat Performansi",
      criterion: "3 Aylik Degisim",
      stance: "bear",
      strength: 4,
      reasoning: "Hizli yukselis sonrasi kar realizasyonu riski",
      evidence: `3ay: +${m3}% (potansiyel duzeltme)`,
    });
  } else if (m3 != null && m3 < -20) {
    args.push({
      category: "Fiyat Performansi",
      criterion: "3 Aylik Degisim",
      stance: "bear",
      strength: 7,
      reasoning: "3 ayda sert dusus — temel sorunlar olabilir",
      evidence: `3ay: ${m3}%`,
    });
    args.push({
      category: "Fiyat Performansi",
      criterion: "3 Aylik Degisim",
      stance: "bull",
      strength: 3,
      reasoning: "Asiri satilmis olabilir — teknik toparlanma potansiyeli",
      evidence: `3ay: ${m3}% (asiri satim?)`,
    });
  }

  if (w1 != null && w1 > 5) {
    args.push({
      category: "Fiyat Performansi",
      criterion: "1 Haftalik Degisim",
      stance: "bull",
      strength: 5,
      reasoning: "Kisa vadeli guclu yukselis — alim momentumu",
      evidence: `1hf: +${w1}%`,
    });
  } else if (w1 != null && w1 < -5) {
    args.push({
      category: "Fiyat Performansi",
      criterion: "1 Haftalik Degisim",
      stance: "bear",
      strength: 5,
      reasoning: "Kisa vadeli sert dusus — panik satis olabilir",
      evidence: `1hf: ${w1}%`,
    });
  }

  return args;
}

function analyzeVolumeDebate(volumes: (number | null)[], closes: number[]): DebateArgument[] {
  const volTrend = computeVolumeTrend(volumes);
  const args: DebateArgument[] = [];
  if (volTrend === "insufficient") return args;

  const cur = closes[closes.length - 1] ?? 0;
  const prev = closes.length > 5 ? closes[closes.length - 6] : cur;
  const priceUp = cur > prev;

  if (volTrend === "increasing" && priceUp) {
    args.push({
      category: "Islem Hacmi",
      criterion: "Hacim Trendi",
      stance: "bull",
      strength: 7,
      reasoning: "Artan hacimle birlikte fiyat yukseliyor — saglikli yukselis",
      evidence: "Hacim artan + fiyat yukselen",
    });
  } else if (volTrend === "increasing" && !priceUp) {
    args.push({
      category: "Islem Hacmi",
      criterion: "Hacim Trendi",
      stance: "bear",
      strength: 7,
      reasoning: "Artan hacimle birlikte fiyat dusuyor — satma baskisi guclu",
      evidence: "Hacim artan + fiyat dusen",
    });
  } else if (volTrend === "decreasing" && priceUp) {
    args.push({
      category: "Islem Hacmi",
      criterion: "Hacim Trendi",
      stance: "bear",
      strength: 4,
      reasoning: "Yukselis hacim destegi olmadan gerceklesiyor — surdurulebilir degil",
      evidence: "Hacim dusen + fiyat yukselen",
    });
  }
  return args;
}

// ─── Debate engine ───

function generateDebate(
  ticker: string,
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: (number | null)[],
  liquidity: LiquidityMetrics,
  risk: RiskMetrics
): DebateVerdict {
  const price = closes[closes.length - 1] ?? 0;
  const rsi = computeRSI(closes);
  const macd = computeMACD(closes);
  const volTrend = computeVolumeTrend(volumes);
  const atr = computeATR(highs, lows, closes);

  // Generate arguments from all analyzers
  const allArgs: DebateArgument[] = [
    ...analyzeRSIDebate(rsi),
    ...analyzeMACDDebate(macd, volTrend),
    ...analyzeSMADebate(closes),
    ...analyzeATRDebate(atr, price),
    ...analyzeHistoricalBandDebate(closes),
    ...analyzeRealReturnDebate(closes),
    ...analyzePriceActionDebate(closes),
    ...analyzeVolumeDebate(volumes, closes),
  ];

  const bullArgs = allArgs.filter((a) => a.stance === "bull").sort((a, b) => b.strength - a.strength);
  const bearArgs = allArgs.filter((a) => a.stance === "bear").sort((a, b) => b.strength - a.strength);
  const neutralArgs = allArgs.filter((a) => a.stance === "neutral");

  // Weighted scores
  const bullScore = Math.round(bullArgs.reduce((s, a) => s + a.strength, 0) * 10) / 10;
  const bearScore = Math.round(bearArgs.reduce((s, a) => s + a.strength, 0) * 10) / 10;

  // Determine overall stance
  const diff = bullScore - bearScore;
  const total = bullScore + bearScore;
  const confidence = total > 0 ? Math.round((Math.abs(diff) / total) * 100) : 0;

  let overallStance: DebateVerdict["overallStance"];
  if (diff > 15 && confidence > 50) overallStance = "STRONG_BULL";
  else if (diff > 5) overallStance = "BULL";
  else if (diff < -15 && confidence > 50) overallStance = "STRONG_BEAR";
  else if (diff < -5) overallStance = "BEAR";
  else overallStance = "NEUTRAL";

  // Key risks & opportunities
  const keyRisks = bearArgs.slice(0, 3).map((a) => `${a.criterion}: ${a.reasoning}`);
  const keyOpportunities = bullArgs.slice(0, 3).map((a) => `${a.criterion}: ${a.reasoning}`);

  // Summary
  const summary = generateSummary(ticker, overallStance, bullScore, bearScore, bullArgs, bearArgs);

  return {
    ticker,
    overallStance,
    bullScore,
    bearScore,
    confidence,
    bullArguments: bullArgs,
    bearArguments: bearArgs,
    neutralArguments: neutralArgs,
    keyRisks,
    keyOpportunities,
    summary,
    liquidity,
    risk,
  };
}

function generateSummary(
  ticker: string,
  stance: DebateVerdict["overallStance"],
  bullScore: number,
  bearScore: number,
  bullArgs: DebateArgument[],
  bearArgs: DebateArgument[]
): string {
  const stanceLabel: Record<string, string> = {
    STRONG_BULL: "GUCLU BOGA",
    BULL: "BOGA",
    NEUTRAL: "NOTER",
    BEAR: "AYI",
    STRONG_BEAR: "GUCLU AYI",
  };

  const topBull = bullArgs[0]?.criterion ?? "-";
  const topBear = bearArgs[0]?.criterion ?? "-";

  return (
    `${ticker} icin tartisma sonucu: ${stanceLabel[stance]} egilim. ` +
    `Boga puan: ${bullScore}, Ayi puan: ${bearScore}. ` +
    `En guclu bogam: ${topBull}, En guclu ayim: ${topBear}. ` +
    `Bu analiz egitim amaclidir, yatirim tavsiyesi degildir.`
  );
}

// ─── Yahoo data fetcher ───

interface YahooOHLCV {
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: (number | null)[];
  error?: string;
}

async function fetchYahooOHLCV(ticker: string): Promise<YahooOHLCV> {
  const yahooUrl = `${YAHOO_CHART_BASE}/${ticker}.IS?range=1y&interval=1d`;
  const yResp = await fetch(yahooUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) });
  if (!yResp.ok) return { closes: [], highs: [], lows: [], volumes: [], error: `Yahoo HTTP ${yResp.status}` };

  const yData = await yResp.json();
  const result0 = yData?.chart?.result?.[0];
  if (!result0) return { closes: [], highs: [], lows: [], volumes: [], error: "Yahoo veri yapisi beklenmedik" };

  const meta = result0.meta ?? {};
  if (meta.quoteType !== "EQUITY" || meta.exchangeName !== "IST") {
    if (!BIST30.has(ticker)) {
      return { closes: [], highs: [], lows: [], volumes: [], error: `${ticker} BIST hissesi olarak taninamadi` };
    }
  }

  const quotes = result0.indicators?.quote?.[0] ?? {};
  const closes: number[] = (quotes.close ?? []).filter((v: number | null): v is number => v != null);
  const highs: number[] = (quotes.high ?? []).filter((v: number | null): v is number => v != null);
  const lows: number[] = (quotes.low ?? []).filter((v: number | null): v is number => v != null);
  const volumes: (number | null)[] = quotes.volume ?? [];

  return { closes, highs, lows, volumes };
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
    .slice(0, 5);

  if (!tickerList.length) {
    return NextResponse.json(
      { error: "tickers parametresi gerekli. Ornek: ?tickers=GARAN,AKBNK" },
      { status: 400 }
    );
  }

  const verdicts: DebateVerdict[] = [];
  const errors: { ticker: string; error: string }[] = [];

  for (const ticker of tickerList) {
    if (REJECTED.has(ticker)) {
      errors.push({ ticker, error: `${ticker} kripto/emtia/doviz varligidir. Sadece BIST hisseleri.` });
      continue;
    }

    try {
      const ohlcv = await fetchYahooOHLCV(ticker);

      if (ohlcv.error) {
        errors.push({ ticker, error: ohlcv.error });
        continue;
      }

      if (ohlcv.closes.length < 30) {
        errors.push({ ticker, error: `Yetersiz veri (${ohlcv.closes.length} gun)` });
        continue;
      }

      const riskLayer = computeRiskLayer(ohlcv.highs, ohlcv.lows, ohlcv.closes, ohlcv.volumes, {
        minAvgVolume20,
        minAvgNotional20,
      });

      if (!riskLayer.liquidity.liquidityPass) {
        errors.push({ ticker, error: `Likidite filtresi: ${riskLayer.liquidity.reason}` });
        continue;
      }

      verdicts.push(
        generateDebate(
          ticker,
          ohlcv.closes,
          ohlcv.highs,
          ohlcv.lows,
          ohlcv.volumes,
          riskLayer.liquidity,
          riskLayer.risk
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      errors.push({ ticker, error: msg });
    }
  }

  return NextResponse.json({
    totalScanned: tickerList.length,
    debatesGenerated: verdicts.length,
    verdicts,
    errors,
  });
}
