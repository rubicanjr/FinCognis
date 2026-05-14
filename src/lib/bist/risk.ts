export interface LiquidityThresholds {
  minAvgVolume20?: number;
  minAvgNotional20?: number;
  lookback?: number;
}

export interface LiquidityMetrics {
  avgVolume20: number;
  avgNotional20: number;
  liquidityPass: boolean;
  liquidityTier: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA";
  reason: string;
}

export interface RiskMetrics {
  atr14: number | null;
  atrPercent: number | null;
  dailyVolatility20: number | null;
  maxDrawdownPercent: number;
  riskScore: number;
  riskTier: "LOW" | "MEDIUM" | "HIGH";
  volatilityRegime: "LOW" | "NORMAL" | "HIGH";
  suggestedStopPct: number;
  suggestedTakeProfitPct: number;
  positionRiskNote: string;
}

export interface RiskLayerResult {
  liquidity: LiquidityMetrics;
  risk: RiskMetrics;
}

const DEFAULT_THRESHOLDS: Required<LiquidityThresholds> = {
  minAvgVolume20: 100_000,
  minAvgNotional20: 5_000_000,
  lookback: 20,
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function standardDeviation(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeATR14(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number | null {
  const len = Math.min(highs.length, lows.length, closes.length);
  if (len < period + 1) return null;

  const trs: number[] = [];
  for (let i = 1; i < len; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trs.push(tr);
  }

  if (trs.length < period) return null;
  const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  return Math.round(atr * 10000) / 10000;
}

export function computeMaxDrawdownPercent(closes: number[]): number {
  if (!closes.length) return 0;
  let peak = closes[0];
  let maxDrawdown = 0;

  for (const close of closes) {
    if (close > peak) peak = close;
    const dd = peak > 0 ? ((peak - close) / peak) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return round1(maxDrawdown);
}

export function computeDailyVolatilityPercent(closes: number[], lookback = 20): number | null {
  if (closes.length < lookback + 1) return null;
  const recent = closes.slice(-(lookback + 1));
  const returns: number[] = [];

  for (let i = 1; i < recent.length; i++) {
    if (recent[i - 1] <= 0) continue;
    returns.push((recent[i] - recent[i - 1]) / recent[i - 1]);
  }

  if (!returns.length) return null;
  return round2(standardDeviation(returns) * 100);
}

export function computeLiquidityMetrics(
  closes: number[],
  volumes: (number | null)[],
  thresholds: LiquidityThresholds = {}
): LiquidityMetrics {
  const { minAvgVolume20, minAvgNotional20, lookback } = {
    ...DEFAULT_THRESHOLDS,
    ...thresholds,
  };

  const len = Math.min(closes.length, volumes.length);
  if (len < Math.max(lookback, 10)) {
    return {
      avgVolume20: 0,
      avgNotional20: 0,
      liquidityPass: false,
      liquidityTier: "INSUFFICIENT_DATA",
      reason: "Likidite hesabi icin veri yetersiz",
    };
  }

  const pairs: Array<{ close: number; volume: number }> = [];
  for (let i = len - 1; i >= 0 && pairs.length < lookback; i--) {
    const close = closes[i];
    const volume = volumes[i];
    if (Number.isFinite(close) && typeof volume === "number" && volume > 0) {
      pairs.push({ close, volume });
    }
  }

  if (pairs.length < Math.floor(lookback / 2)) {
    return {
      avgVolume20: 0,
      avgNotional20: 0,
      liquidityPass: false,
      liquidityTier: "INSUFFICIENT_DATA",
      reason: "Likidite hesabi icin gecerli hacim verisi yetersiz",
    };
  }

  const avgVolume20 = pairs.reduce((s, p) => s + p.volume, 0) / pairs.length;
  const avgNotional20 = pairs.reduce((s, p) => s + p.close * p.volume, 0) / pairs.length;

  const volumePass = avgVolume20 >= minAvgVolume20;
  const notionalPass = avgNotional20 >= minAvgNotional20;
  const liquidityPass = volumePass && notionalPass;

  let liquidityTier: LiquidityMetrics["liquidityTier"] = "LOW";
  if (!liquidityPass) {
    liquidityTier = "LOW";
  } else if (avgVolume20 >= minAvgVolume20 * 3 && avgNotional20 >= minAvgNotional20 * 3) {
    liquidityTier = "HIGH";
  } else if (avgVolume20 >= minAvgVolume20 * 1.5 && avgNotional20 >= minAvgNotional20 * 1.5) {
    liquidityTier = "MEDIUM";
  }

  let reason = "Likidite yeterli";
  if (!volumePass && !notionalPass) {
    reason = `Ortalama hacim ve islem degeri esik alti (vol<${minAvgVolume20}, notional<${minAvgNotional20})`;
  } else if (!volumePass) {
    reason = `Ortalama hacim esik alti (vol<${minAvgVolume20})`;
  } else if (!notionalPass) {
    reason = `Ortalama islem degeri esik alti (notional<${minAvgNotional20})`;
  }

  return {
    avgVolume20: Math.round(avgVolume20),
    avgNotional20: Math.round(avgNotional20),
    liquidityPass,
    liquidityTier,
    reason,
  };
}

export function computeRiskLayer(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: (number | null)[],
  thresholds: LiquidityThresholds = {}
): RiskLayerResult {
  const liquidity = computeLiquidityMetrics(closes, volumes, thresholds);

  const currentPrice = closes[closes.length - 1] ?? 0;
  const atr14 = computeATR14(highs, lows, closes);
  const atrPercent = atr14 && currentPrice > 0 ? round2((atr14 / currentPrice) * 100) : null;
  const dailyVolatility20 = computeDailyVolatilityPercent(closes, 20);
  const maxDrawdownPercent = computeMaxDrawdownPercent(closes);

  const atrRisk = atrPercent == null ? 50 : clamp((atrPercent / 6) * 100, 0, 100);
  const volRisk = dailyVolatility20 == null ? 50 : clamp((dailyVolatility20 / 4.5) * 100, 0, 100);
  const ddRisk = clamp((maxDrawdownPercent / 35) * 100, 0, 100);
  const liquidityPenalty = liquidity.liquidityPass ? 0 : 15;

  const riskScore = clamp(round1(atrRisk * 0.35 + volRisk * 0.35 + ddRisk * 0.3 + liquidityPenalty), 0, 100);

  let riskTier: RiskMetrics["riskTier"] = "MEDIUM";
  if (riskScore < 35) riskTier = "LOW";
  else if (riskScore > 65) riskTier = "HIGH";

  let volatilityRegime: RiskMetrics["volatilityRegime"] = "NORMAL";
  if (atrPercent != null) {
    if (atrPercent < 1.2) volatilityRegime = "LOW";
    else if (atrPercent > 3.5) volatilityRegime = "HIGH";
  }

  const suggestedStopPct =
    atrPercent == null
      ? 5
      : round1(clamp(atrPercent * (riskTier === "HIGH" ? 2 : riskTier === "LOW" ? 1.2 : 1.6), 2, 12));

  const suggestedTakeProfitPct = round1(clamp(suggestedStopPct * 1.8, 4, 24));

  const positionRiskNote =
    riskTier === "HIGH"
      ? "Yuksek risk rejimi: kucuk pozisyon + daha sik stop takibi"
      : riskTier === "LOW"
        ? "Dusuk risk rejimi: normal pozisyonlama uygulanabilir"
        : "Orta risk rejimi: asamali giris ve disiplinli stop onerilir";

  return {
    liquidity,
    risk: {
      atr14,
      atrPercent,
      dailyVolatility20,
      maxDrawdownPercent,
      riskScore,
      riskTier,
      volatilityRegime,
      suggestedStopPct,
      suggestedTakeProfitPct,
      positionRiskNote,
    },
  };
}
