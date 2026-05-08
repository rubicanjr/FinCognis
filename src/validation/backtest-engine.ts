export type SignalDirection = "LONG" | "HOLD" | "EXIT";
export type CandleTimeframe = "1d" | "1h";

export interface MarketCandle {
  symbol: string;
  timeframe: CandleTimeframe;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeSignal {
  timestamp: number;
  signal: SignalDirection;
  confidence: number | null;
  reason: string;
}

export interface WalkForwardConfig {
  trainDays: number;
  testDays: number;
  stepDays: number;
  annualizationPeriods: number;
  commissionBps: number;
  slippageBps: number;
  taxBps: number;
  initialCapital?: number;
}

export interface TradeExecutorConfig {
  commissionBps: number;
  slippageBps: number;
  taxBps: number;
  initialCapital: number;
}

export interface TradeExecutorResult {
  equityCurve: number[];
  periodReturns: number[];
  tradeReturns: number[];
  finalEquity: number;
}

export interface WalkForwardWindow {
  train: MarketCandle[];
  test: MarketCandle[];
  startTimestamp: number;
  endTimestamp: number;
}

export interface AlphaComputationResult {
  value: number | null;
  reason: "OK" | "BENCHMARK_DATA_INSUFFICIENT" | "INVALID_ANNUALIZATION_PERIOD" | "INVALID_RETURNS";
}

export interface ValidationMetrics {
  hitRate: number | null;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  alphaVsBenchmark: number | null;
  alphaReason: AlphaComputationResult["reason"];
  returnsTStat: number | null;
  isStatisticallySignificant: boolean;
  significanceThreshold: number;
}

export interface BacktestWindowResult {
  windowIndex: number;
  metrics: ValidationMetrics;
  equityCurve: number[];
}

export interface SystemSafetyCertificate {
  approved: boolean;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  returnsTStat: number | null;
  statisticallySignificant: boolean;
  reasons: string[];
}

export interface PaperTradingReadiness {
  ready: boolean;
  elapsedDays: number;
  requiredDays: number;
}

export interface ChartTrace {
  name: string;
  x: number[];
  y: number[];
}

export interface ValidationVisualization {
  equityCurve: number[];
  drawdownSeries: number[];
  equityCurveTrace: ChartTrace;
  drawdownTrace: ChartTrace;
}

export interface BacktestResult {
  symbol: string;
  windows: BacktestWindowResult[];
  metrics: ValidationMetrics;
  visualization: ValidationVisualization;
  certificate: SystemSafetyCertificate;
  report: {
    generatedAt: string;
    methodology: "walk_forward";
    disclaimer: string;
  };
}

export interface RunWalkForwardBacktestInput {
  symbol: string;
  dailyCandles: MarketCandle[];
  hourlyCandles: MarketCandle[];
  signals: TradeSignal[];
  benchmarkSignals: TradeSignal[];
  config: WalkForwardConfig;
}

const MIN_OBSERVATIONS = 2;
const PAPER_TRADING_MIN_DAYS = 90;
const DEFAULT_INITIAL_CAPITAL = 100_000;
const T_STAT_THRESHOLD = 1.96;
const DISCLAIMER =
  "Bu analiz eğitim amaçlıdır. Yatırım tavsiyesi değildir. SPK lisanslı bir danışmana başvurunuz.";

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function stdDev(values: number[]): number | null {
  if (values.length < MIN_OBSERVATIONS) return null;
  const avg = mean(values);
  if (avg === null) return null;
  const variance =
    values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / (values.length - 1);
  return variance > 0 ? Math.sqrt(variance) : 0;
}

function toDailyReturns(prices: number[]): number[] {
  if (prices.length < MIN_OBSERVATIONS) return [];
  return prices.slice(1).map((price, index) => {
    const previous = prices[index];
    if (previous <= 0 || !Number.isFinite(previous) || !Number.isFinite(price)) return 0;
    return price / previous - 1;
  });
}

function clampBps(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function isValidAnnualizationPeriods(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function alignSignals(candles: MarketCandle[], signals: TradeSignal[]): SignalDirection[] {
  const signalMap = new Map<number, SignalDirection>();
  signals.forEach((signal) => signalMap.set(signal.timestamp, signal.signal));
  return candles.map((candle) => signalMap.get(candle.timestamp) ?? "HOLD");
}

function computeDrawdownSeries(equityCurve: number[]): number[] {
  let peak = Number.NEGATIVE_INFINITY;
  return equityCurve.map((equity) => {
    peak = Math.max(peak, equity);
    if (peak <= 0) return 0;
    return (peak - equity) / peak;
  });
}

function buildBenchmarkReturns(candles: MarketCandle[], benchmarkSignals: TradeSignal[]): number[] {
  if (candles.length < MIN_OBSERVATIONS) return [];
  const closes = candles.map((candle) => candle.close);
  const baseReturns = toDailyReturns(closes);
  const alignedSignals = alignSignals(candles.slice(1), benchmarkSignals);
  return baseReturns.map((value, index) => (alignedSignals[index] === "EXIT" ? 0 : value));
}

function makeChartTrace(name: string, points: number[]): ChartTrace {
  const x = points.map((_, index) => index);
  return { name, x, y: points };
}

export function createHourlyCandlesFromDaily(dailyCandles: MarketCandle[], hourlyBars = 7): MarketCandle[] {
  return dailyCandles.flatMap((daily) => {
    const bars = Math.max(1, hourlyBars);
    const stepMs = Math.floor((24 * 60 * 60 * 1000) / bars);
    const spread = (daily.high - daily.low) / bars;

    return Array.from({ length: bars }, (_, index) => {
      const drift = spread * (index / Math.max(1, bars - 1));
      const close = Math.max(0.01, daily.open + drift);

      return {
        ...daily,
        timeframe: "1h",
        timestamp: daily.timestamp + index * stepMs,
        open: Math.max(0.01, close - spread * 0.4),
        high: close + spread * 0.4,
        low: Math.max(0.01, close - spread * 0.4),
        close,
      };
    });
  });
}

export function generateWalkForwardWindows(
  candles: MarketCandle[],
  config: Pick<WalkForwardConfig, "trainDays" | "testDays" | "stepDays">
): WalkForwardWindow[] {
  const ordered = [...candles].sort((a, b) => a.timestamp - b.timestamp);
  const minimumLength = config.trainDays + config.testDays;
  if (ordered.length < minimumLength || config.stepDays <= 0) return [];

  const windows: WalkForwardWindow[] = [];
  let trainStart = 0;

  while (trainStart + minimumLength <= ordered.length) {
    const trainEnd = trainStart + config.trainDays;
    const testEnd = trainEnd + config.testDays;
    const train = ordered.slice(trainStart, trainEnd);
    const test = ordered.slice(trainEnd, testEnd);

    windows.push({
      train,
      test,
      startTimestamp: train[0]?.timestamp ?? 0,
      endTimestamp: test[test.length - 1]?.timestamp ?? 0,
    });

    trainStart += config.stepDays;
  }

  return windows;
}

export function simulateTradeExecutor(prices: number[], config: TradeExecutorConfig): TradeExecutorResult {
  const periodReturns = toDailyReturns(prices);
  const friction =
    (clampBps(config.commissionBps) + clampBps(config.slippageBps) + clampBps(config.taxBps)) /
    10_000;

  let equity = config.initialCapital;
  const equityCurve = [equity];
  const tradeReturns: number[] = [];

  periodReturns.forEach((periodReturn) => {
    const gross = 1 + periodReturn;
    const net = Math.max(0, gross - friction);
    equity *= net;
    tradeReturns.push(net - 1);
    equityCurve.push(equity);
  });

  return { equityCurve, periodReturns, tradeReturns, finalEquity: equity };
}

export function calculateHitRate(tradeReturns: number[]): number | null {
  if (tradeReturns.length === 0) return null;
  const profitableCount = tradeReturns.filter((value) => value > 0).length;
  return profitableCount / tradeReturns.length;
}

export function calculateSharpeRatio(
  tradeReturns: number[],
  annualizationPeriods: number,
  riskFreeRate = 0
): number | null {
  if (tradeReturns.length < MIN_OBSERVATIONS) return null;
  if (!isValidAnnualizationPeriods(annualizationPeriods)) return null;
  const rfPerPeriod = riskFreeRate / annualizationPeriods;
  const excessReturns = tradeReturns.map((value) => value - rfPerPeriod);
  const avg = mean(excessReturns);
  const sigma = stdDev(excessReturns);
  if (avg === null || sigma === null || sigma <= 0) return null;
  if (!Number.isFinite(avg) || !Number.isFinite(sigma)) return null;
  return (avg / sigma) * Math.sqrt(annualizationPeriods);
}

export function calculateMaxDrawdown(equityCurve: number[]): number | null {
  if (equityCurve.length < MIN_OBSERVATIONS) return null;
  const drawdowns = computeDrawdownSeries(equityCurve);
  return drawdowns.length === 0 ? null : Math.max(...drawdowns);
}

export function calculateAlphaVsBenchmarkDetailed(
  strategyReturns: number[],
  benchmarkReturns: number[],
  annualizationPeriods = 252
): AlphaComputationResult {
  if (!isValidAnnualizationPeriods(annualizationPeriods)) {
    return { value: null, reason: "INVALID_ANNUALIZATION_PERIOD" };
  }

  const sampleSize = Math.min(strategyReturns.length, benchmarkReturns.length);
  if (sampleSize < MIN_OBSERVATIONS) {
    return { value: null, reason: "BENCHMARK_DATA_INSUFFICIENT" };
  }

  const relativeReturns = strategyReturns
    .slice(0, sampleSize)
    .map((value, index) => value - benchmarkReturns[index]);
  const alphaPerPeriod = mean(relativeReturns);
  if (alphaPerPeriod === null || !Number.isFinite(alphaPerPeriod)) {
    return { value: null, reason: "INVALID_RETURNS" };
  }

  return { value: alphaPerPeriod * annualizationPeriods, reason: "OK" };
}

export function calculateAlphaVsBenchmark(
  strategyReturns: number[],
  benchmarkReturns: number[],
  annualizationPeriods = 252
): number | null {
  return calculateAlphaVsBenchmarkDetailed(strategyReturns, benchmarkReturns, annualizationPeriods).value;
}

export function calculateTStat(returns: number[]): number | null {
  if (returns.length < MIN_OBSERVATIONS) return null;
  const avg = mean(returns);
  const sigma = stdDev(returns);
  if (avg === null || sigma === null || sigma <= 0) return null;
  if (!Number.isFinite(avg) || !Number.isFinite(sigma)) return null;
  const standardError = sigma / Math.sqrt(returns.length);
  if (!Number.isFinite(standardError) || standardError <= 0) return null;
  return avg / standardError;
}

export function buildSystemSafetyCertificate(metrics: ValidationMetrics): SystemSafetyCertificate {
  const reasons: string[] = [];

  if (metrics.sharpeRatio === null || metrics.sharpeRatio < 1.0) {
    reasons.push("Sharpe oranı 1.0 altında.");
  }
  if (metrics.maxDrawdown === null || metrics.maxDrawdown > 0.2) {
    reasons.push("Maksimum drawdown %20 sınırını aşıyor.");
  }
  if (!metrics.isStatisticallySignificant || metrics.returnsTStat === null) {
    reasons.push(
      `Getiri serisi istatistiksel olarak anlamlı değil (|t| < ${metrics.significanceThreshold}).`
    );
  }

  return {
    approved: reasons.length === 0,
    sharpeRatio: metrics.sharpeRatio,
    maxDrawdown: metrics.maxDrawdown,
    returnsTStat: metrics.returnsTStat,
    statisticallySignificant: metrics.isStatisticallySignificant,
    reasons,
  };
}

export function evaluatePaperTradingReadiness(
  startTimestamp: number,
  nowTimestamp: number
): PaperTradingReadiness {
  const elapsedMs = Math.max(0, nowTimestamp - startTimestamp);
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));

  return {
    ready: elapsedDays >= PAPER_TRADING_MIN_DAYS,
    elapsedDays,
    requiredDays: PAPER_TRADING_MIN_DAYS,
  };
}

function simulateSignalsOnCandles(
  candles: MarketCandle[],
  signals: TradeSignal[],
  config: Pick<TradeExecutorConfig, "commissionBps" | "slippageBps" | "taxBps">,
  initialCapital: number
): TradeExecutorResult {
  if (candles.length < MIN_OBSERVATIONS) {
    return {
      equityCurve: [initialCapital],
      periodReturns: [],
      tradeReturns: [],
      finalEquity: initialCapital,
    };
  }

  const signalDirections = alignSignals(candles.slice(1), signals);
  const closePrices = candles.map((candle) => candle.close);
  const baseReturns = toDailyReturns(closePrices);
  const strategyReturns = baseReturns.map((ret, index) =>
    signalDirections[index] === "LONG" ? ret : 0
  );

  const pseudoPrices = strategyReturns.reduce<number[]>(
    (series, ret) => [...series, Math.max(0.01, series[series.length - 1] * (1 + ret))],
    [100]
  );

  return simulateTradeExecutor(pseudoPrices, { ...config, initialCapital });
}

function aggregateWindowMetrics(
  strategyReturns: number[],
  benchmarkReturns: number[],
  annualizationPeriods: number
): ValidationMetrics {
  const alphaComputation = calculateAlphaVsBenchmarkDetailed(
    strategyReturns,
    benchmarkReturns,
    annualizationPeriods
  );
  const returnsTStat = calculateTStat(strategyReturns);
  const isStatisticallySignificant =
    returnsTStat !== null && Number.isFinite(returnsTStat) && Math.abs(returnsTStat) >= T_STAT_THRESHOLD;

  const equityCurve = strategyReturns.reduce<number[]>(
    (curve, item) => [...curve, curve[curve.length - 1] * (1 + item)],
    [1]
  );

  return {
    hitRate: calculateHitRate(strategyReturns),
    sharpeRatio: calculateSharpeRatio(strategyReturns, annualizationPeriods, 0),
    maxDrawdown: calculateMaxDrawdown(equityCurve),
    alphaVsBenchmark: alphaComputation.value,
    alphaReason: alphaComputation.reason,
    returnsTStat,
    isStatisticallySignificant,
    significanceThreshold: T_STAT_THRESHOLD,
  };
}

export function runWalkForwardBacktest(input: RunWalkForwardBacktestInput): BacktestResult {
  const initialCapital = input.config.initialCapital ?? DEFAULT_INITIAL_CAPITAL;
  const dailyCandles = [...input.dailyCandles].sort((a, b) => a.timestamp - b.timestamp);
  const windows = generateWalkForwardWindows(dailyCandles, input.config);

  const windowResults: BacktestWindowResult[] = [];
  const aggregateReturns: number[] = [];
  const aggregateBenchmarkReturns: number[] = [];
  const globalEquityCurve: number[] = [initialCapital];

  let rollingCapital = initialCapital;

  windows.forEach((window, windowIndex) => {
    const strategy = simulateSignalsOnCandles(window.test, input.signals, input.config, rollingCapital);
    const benchmarkReturns = buildBenchmarkReturns(window.test, input.benchmarkSignals);
    const metrics = aggregateWindowMetrics(strategy.tradeReturns, benchmarkReturns, input.config.annualizationPeriods);

    strategy.tradeReturns.forEach((ret) => {
      rollingCapital *= 1 + ret;
      aggregateReturns.push(ret);
      globalEquityCurve.push(rollingCapital);
    });

    benchmarkReturns.forEach((ret) => aggregateBenchmarkReturns.push(ret));

    windowResults.push({
      windowIndex,
      metrics,
      equityCurve: strategy.equityCurve,
    });
  });

  const globalMetrics = aggregateWindowMetrics(
    aggregateReturns,
    aggregateBenchmarkReturns,
    input.config.annualizationPeriods
  );
  const certificate = buildSystemSafetyCertificate(globalMetrics);
  const drawdownSeries = computeDrawdownSeries(globalEquityCurve);

  return {
    symbol: input.symbol,
    windows: windowResults,
    metrics: globalMetrics,
    visualization: {
      equityCurve: globalEquityCurve,
      drawdownSeries,
      equityCurveTrace: makeChartTrace("equity_curve", globalEquityCurve),
      drawdownTrace: makeChartTrace("drawdown", drawdownSeries),
    },
    certificate,
    report: {
      generatedAt: new Date().toISOString(),
      methodology: "walk_forward",
      disclaimer: DISCLAIMER,
    },
  };
}
