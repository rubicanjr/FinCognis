export interface MacdVolumeResult {
  macd: number;
  signal: number;
  histogram: number;
  crossover: boolean;
  momentumIncreasing: boolean;
  volumeConfirmed: boolean;
  macdAboveSignal: boolean;
}

export interface SmaPositionResult {
  goldenCross: boolean;
  deathCross: boolean;
  priceAbove50: boolean;
  priceAbove200: boolean;
  sma50Above200: boolean;
  spreadPct: number;
  currentPrice: number;
  sma50: number;
  sma200: number;
}

export interface AtrResult {
  atr: number;
  atrPct: number;
  regime: "LOW" | "NORMAL" | "HIGH" | null;
  price: number;
}

export interface ShortTermTechnicalScore {
  technicalMomentumScore: number | null;
  achievedMax: number;
  maxPossible: 70;
  missing: Array<"rsi" | "macd" | "sma" | "atr" | "earnings" | "kap">;
  components: {
    rsi?: { score: number; weight: 15 };
    macd?: { score: number; weight: 20 };
    sma?: { score: number; weight: 15 };
    atr?: { score: number; weight: 10 };
    earnings?: { score: number; weight: 5 };
    kap?: { score: number; weight: 5 };
  };
}

function finiteValues(values: ReadonlyArray<number | null | undefined>): number[] {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ema(values: readonly number[], span: number): number[] {
  if (values.length === 0) return [];
  const alpha = 2 / (span + 1);
  const result: number[] = [values[0]];
  for (let index = 1; index < values.length; index += 1) {
    result.push(values[index] * alpha + result[index - 1] * (1 - alpha));
  }
  return result;
}

function rollingMeanAt(values: readonly number[], endIndex: number, period: number): number | null {
  const startIndex = endIndex - period + 1;
  if (startIndex < 0) return null;
  return mean(values.slice(startIndex, endIndex + 1));
}

function percentileRank(values: readonly number[], target: number): number | null {
  const clean = finiteValues(values);
  if (clean.length === 0 || !Number.isFinite(target)) return null;
  return clean.filter((value) => value <= target).length / clean.length;
}

export function calcRsi(prices: ReadonlyArray<number | null | undefined>, period = 14): number | null {
  const closes = finiteValues(prices);
  if (closes.length < period + 1) return null;

  const deltas = closes.slice(1).map((value, index) => value - closes[index]);
  const gains = deltas.map((delta) => Math.max(0, delta));
  const losses = deltas.map((delta) => Math.max(0, -delta));
  const initialGain = mean(gains.slice(0, period));
  const initialLoss = mean(losses.slice(0, period));
  if (initialGain === null || initialLoss === null) return null;

  let avgGain = initialGain;
  let avgLoss = initialLoss;
  for (let index = period; index < gains.length; index += 1) {
    avgGain = (avgGain * (period - 1) + gains[index]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[index]) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function rsiToScore(rsi: number | null): number | null {
  if (rsi === null || !Number.isFinite(rsi)) return null;
  if (rsi >= 40 && rsi <= 60) return 1.0;
  if ((rsi >= 35 && rsi < 40) || (rsi > 60 && rsi <= 65)) return 0.75;
  if ((rsi >= 30 && rsi < 35) || (rsi > 65 && rsi <= 70)) return 0.5;
  if ((rsi >= 25 && rsi < 30) || (rsi > 70 && rsi <= 75)) return 0.25;
  return 0.1;
}

export function calcMacdWithVolume(
  prices: ReadonlyArray<number | null | undefined>,
  volumes: ReadonlyArray<number | null | undefined>,
  fast = 12,
  slow = 26,
  signal = 9
): MacdVolumeResult | null {
  const closes = finiteValues(prices);
  if (closes.length < slow + signal) return null;

  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const macdLine = closes.map((_, index) => fastEma[index] - slowEma[index]);
  const signalLine = ema(macdLine, signal);
  const lastIndex = macdLine.length - 1;
  if (lastIndex < 1) return null;

  const histogram = macdLine[lastIndex] - signalLine[lastIndex];
  const previousHistogram = macdLine[lastIndex - 1] - signalLine[lastIndex - 1];
  const cleanVolumes = finiteValues(volumes);
  const recentVolume = cleanVolumes.length >= 5 ? mean(cleanVolumes.slice(-5)) : null;
  const averageVolume = cleanVolumes.length >= 20 ? mean(cleanVolumes.slice(-20)) : null;
  const volumeRatio = recentVolume !== null && averageVolume !== null && averageVolume > 0 ? recentVolume / averageVolume : null;

  return {
    macd: macdLine[lastIndex],
    signal: signalLine[lastIndex],
    histogram,
    crossover: previousHistogram < 0 && histogram > 0,
    momentumIncreasing: histogram > previousHistogram && previousHistogram > 0,
    volumeConfirmed: volumeRatio !== null && volumeRatio > 1.2,
    macdAboveSignal: macdLine[lastIndex] > signalLine[lastIndex],
  };
}

export function macdVolumeToScore(result: MacdVolumeResult | null): number | null {
  if (result === null) return null;
  if (result.crossover && result.volumeConfirmed) return 1.0;
  if (result.crossover) return 0.65;
  if (result.momentumIncreasing && result.volumeConfirmed) return 0.75;
  if (result.macdAboveSignal && result.volumeConfirmed) return 0.55;
  if (result.macdAboveSignal) return 0.35;
  return 0.1;
}

export function calcSmaPosition(prices: ReadonlyArray<number | null | undefined>): SmaPositionResult | null {
  const closes = finiteValues(prices);
  if (closes.length < 205) return null;
  const lastIndex = closes.length - 1;
  const previousIndex = closes.length - 2;
  const sma50 = rollingMeanAt(closes, lastIndex, 50);
  const sma200 = rollingMeanAt(closes, lastIndex, 200);
  const previousSma50 = rollingMeanAt(closes, previousIndex, 50);
  const previousSma200 = rollingMeanAt(closes, previousIndex, 200);
  if (sma50 === null || sma200 === null || previousSma50 === null || previousSma200 === null) return null;

  const currentPrice = closes[lastIndex];
  const spreadPct = sma200 === 0 ? 0 : (sma50 - sma200) / sma200;
  return {
    goldenCross: previousSma50 <= previousSma200 && sma50 > sma200,
    deathCross: previousSma50 >= previousSma200 && sma50 < sma200,
    priceAbove50: currentPrice > sma50,
    priceAbove200: currentPrice > sma200,
    sma50Above200: sma50 > sma200,
    spreadPct,
    currentPrice,
    sma50,
    sma200,
  };
}

export function smaToScore(result: SmaPositionResult | null): number | null {
  if (result === null) return null;
  if (result.goldenCross) return 1.0;
  if (result.sma50Above200 && result.priceAbove50) {
    if (result.spreadPct > 0.05) return 0.85;
    if (result.spreadPct > 0.02) return 0.7;
    return 0.55;
  }
  if (result.priceAbove200 && !result.sma50Above200) return 0.35;
  if (result.deathCross) return 0.05;
  return 0.2;
}

export function calcAtr(
  high: ReadonlyArray<number | null | undefined>,
  low: ReadonlyArray<number | null | undefined>,
  close: ReadonlyArray<number | null | undefined>,
  period = 14
): AtrResult | null {
  const rows = close
    .map((closeValue, index) => ({ high: high[index], low: low[index], close: closeValue }))
    .filter(
      (row): row is { high: number; low: number; close: number } =>
        typeof row.high === "number" &&
        Number.isFinite(row.high) &&
        typeof row.low === "number" &&
        Number.isFinite(row.low) &&
        typeof row.close === "number" &&
        Number.isFinite(row.close)
    );
  if (rows.length < period + 1) return null;

  const trueRanges: number[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const previousClose = rows[index - 1].close;
    trueRanges.push(Math.max(rows[index].high - rows[index].low, Math.abs(rows[index].high - previousClose), Math.abs(rows[index].low - previousClose)));
  }
  const initialAtr = mean(trueRanges.slice(0, period));
  if (initialAtr === null) return null;

  const atrSeries: number[] = [initialAtr];
  for (let index = period; index < trueRanges.length; index += 1) {
    const previousAtr = atrSeries[atrSeries.length - 1];
    atrSeries.push((previousAtr * (period - 1) + trueRanges[index]) / period);
  }

  const atr = atrSeries[atrSeries.length - 1];
  const price = rows[rows.length - 1].close;
  if (price <= 0) return null;
  const atrMean20 = atrSeries.length >= 20 ? mean(atrSeries.slice(-20)) : null;
  const regimeRatio = atrMean20 !== null && atrMean20 > 0 ? atr / atrMean20 : null;

  return {
    atr,
    atrPct: atr / price,
    regime: regimeRatio === null ? null : regimeRatio < 0.8 ? "LOW" : regimeRatio > 1.3 ? "HIGH" : "NORMAL",
    price,
  };
}

export function atrToScore(result: AtrResult | null, universeAtrPcts: readonly number[]): number | null {
  if (result === null) return null;
  const percentile = percentileRank(universeAtrPcts, result.atrPct);
  if (percentile === null) return null;
  if (percentile >= 0.25 && percentile <= 0.75) return 1.0;
  if ((percentile >= 0.15 && percentile < 0.25) || (percentile > 0.75 && percentile <= 0.85)) return 0.65;
  if ((percentile >= 0.05 && percentile < 0.15) || (percentile > 0.85 && percentile <= 0.95)) return 0.35;
  return 0.1;
}

export function calcShortTermTechnicalScore(input: {
  close: ReadonlyArray<number | null | undefined>;
  high: ReadonlyArray<number | null | undefined>;
  low: ReadonlyArray<number | null | undefined>;
  volume: ReadonlyArray<number | null | undefined>;
  universeAtrPcts: readonly number[];
  earningsScore?: number | null;
  kapScore?: number | null;
}): ShortTermTechnicalScore {
  const components: ShortTermTechnicalScore["components"] = {};
  const missing: ShortTermTechnicalScore["missing"] = [];

  const rsiScore = rsiToScore(calcRsi(input.close));
  if (rsiScore === null) missing.push("rsi");
  else components.rsi = { score: rsiScore, weight: 15 };

  const macdScore = macdVolumeToScore(calcMacdWithVolume(input.close, input.volume));
  if (macdScore === null) missing.push("macd");
  else components.macd = { score: macdScore, weight: 20 };

  const smaScore = smaToScore(calcSmaPosition(input.close));
  if (smaScore === null) missing.push("sma");
  else components.sma = { score: smaScore, weight: 15 };

  const atrScore = atrToScore(calcAtr(input.high, input.low, input.close), input.universeAtrPcts);
  if (atrScore === null) missing.push("atr");
  else components.atr = { score: atrScore, weight: 10 };

  if (typeof input.earningsScore === "number" && Number.isFinite(input.earningsScore)) {
    components.earnings = { score: Math.max(0, Math.min(1, input.earningsScore)), weight: 5 };
  } else {
    missing.push("earnings");
  }

  if (typeof input.kapScore === "number" && Number.isFinite(input.kapScore)) {
    components.kap = { score: Math.max(0, Math.min(1, input.kapScore)), weight: 5 };
  } else {
    missing.push("kap");
  }

  const scoredComponents = Object.values(components);
  const achievedMax = scoredComponents.reduce((sum, component) => sum + component.weight, 0);
  const weightedScore = scoredComponents.reduce((sum, component) => sum + component.score * component.weight, 0);

  return {
    technicalMomentumScore: achievedMax > 0 ? Number(((weightedScore / achievedMax) * 70).toFixed(1)) : null,
    achievedMax,
    maxPossible: 70,
    missing,
    components,
  };
}
