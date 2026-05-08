import { describe, expect, it } from "vitest";
import {
  buildSystemSafetyCertificate,
  calculateAlphaVsBenchmarkDetailed,
  calculateAlphaVsBenchmark,
  calculateHitRate,
  calculateMaxDrawdown,
  calculateSharpeRatio,
  calculateTStat,
  createHourlyCandlesFromDaily,
  evaluatePaperTradingReadiness,
  generateWalkForwardWindows,
  runWalkForwardBacktest,
  simulateTradeExecutor,
  type MarketCandle,
  type TradeSignal,
} from "@/validation/backtest-engine";

function buildDailyCandles(days: number, drift = 0.001, volatility = 0.01): MarketCandle[] {
  let close = 100;
  return Array.from({ length: days }, (_, index) => {
    const wave = Math.sin(index / 8) * volatility;
    const dailyReturn = drift + wave;
    const open = close;
    close = Math.max(1, open * (1 + dailyReturn));
    return {
      symbol: "TUPRS.IS",
      timeframe: "1d",
      timestamp: new Date(Date.UTC(2024, 0, 1 + index)).getTime(),
      open,
      high: close * 1.01,
      low: close * 0.99,
      close,
      volume: 1_000_000 + index * 100,
    };
  });
}

function buildSignals(candles: MarketCandle[]): TradeSignal[] {
  return candles.map((candle, index) => ({
    timestamp: candle.timestamp,
    signal: index % 7 === 0 ? "LONG" : "HOLD",
    confidence: 0.72,
    reason: "layer4-layer5",
  }));
}

describe("backtest-engine", () => {
  it("creates walk-forward windows from 2-year daily data", () => {
    const candles = buildDailyCandles(730);
    const windows = generateWalkForwardWindows(candles, {
      trainDays: 180,
      testDays: 60,
      stepDays: 60,
    });

    expect(windows.length).toBeGreaterThan(0);
    expect(windows[0]?.train.length).toBe(180);
    expect(windows[0]?.test.length).toBe(60);
  });

  it("simulates transaction costs and slippage", () => {
    const prices = [100, 102, 101, 105, 104];
    const withCosts = simulateTradeExecutor(prices, {
      commissionBps: 8,
      slippageBps: 12,
      taxBps: 10,
      initialCapital: 100_000,
    });
    const noCosts = simulateTradeExecutor(prices, {
      commissionBps: 0,
      slippageBps: 0,
      taxBps: 0,
      initialCapital: 100_000,
    });

    expect(withCosts.finalEquity).toBeLessThan(noCosts.finalEquity);
  });

  it("computes performance suite metrics", () => {
    const returns = [0.02, -0.01, 0.015, 0.008, -0.004, 0.01];
    const benchmark = [0.01, -0.008, 0.007, 0.004, -0.003, 0.005];

    expect(calculateHitRate(returns)).toBeCloseTo(0.666, 2);
    expect(calculateSharpeRatio(returns, 252, 0.0)).toBeTypeOf("number");
    expect(calculateMaxDrawdown([100, 110, 90, 95, 87])).toBeCloseTo(0.209, 2);
    expect(calculateAlphaVsBenchmark(returns, benchmark)).toBeTypeOf("number");
    expect(calculateTStat(returns)).toBeTypeOf("number");
  });

  it("builds system safety certificate with hard thresholds", () => {
    const denied = buildSystemSafetyCertificate({
      sharpeRatio: 0.8,
      maxDrawdown: 0.24,
      hitRate: 0.52,
      alphaVsBenchmark: -0.04,
      alphaReason: "OK",
      returnsTStat: 1.2,
      isStatisticallySignificant: false,
      significanceThreshold: 1.96,
    });
    const approved = buildSystemSafetyCertificate({
      sharpeRatio: 1.4,
      maxDrawdown: 0.14,
      hitRate: 0.58,
      alphaVsBenchmark: 0.03,
      alphaReason: "OK",
      returnsTStat: 2.4,
      isStatisticallySignificant: true,
      significanceThreshold: 1.96,
    });

    expect(denied.approved).toBe(false);
    expect(denied.reasons.length).toBeGreaterThan(0);
    expect(approved.approved).toBe(true);
  });

  it("returns alpha reason when benchmark data is insufficient", () => {
    const result = calculateAlphaVsBenchmarkDetailed([0.01, 0.02, -0.01], []);
    expect(result.value).toBeNull();
    expect(result.reason).toBe("BENCHMARK_DATA_INSUFFICIENT");
  });

  it("enforces minimum 3-month paper-trading requirement", () => {
    const startAt = new Date("2026-01-01T00:00:00.000Z").getTime();
    const tooEarly = evaluatePaperTradingReadiness(startAt, new Date("2026-03-20T00:00:00.000Z").getTime());
    const mature = evaluatePaperTradingReadiness(startAt, new Date("2026-04-15T00:00:00.000Z").getTime());

    expect(tooEarly.ready).toBe(false);
    expect(mature.ready).toBe(true);
  });

  it("runs end-to-end walk-forward validation and creates chart payloads", () => {
    const daily = buildDailyCandles(730);
    const hourly = createHourlyCandlesFromDaily(daily, 7);
    const signals = buildSignals(hourly);
    const benchmarkSignals = buildSignals(daily);

    const result = runWalkForwardBacktest({
      symbol: "TUPRS.IS",
      dailyCandles: daily,
      hourlyCandles: hourly,
      signals,
      benchmarkSignals,
      config: {
        trainDays: 180,
        testDays: 60,
        stepDays: 60,
        annualizationPeriods: 252,
        commissionBps: 10,
        slippageBps: 8,
        taxBps: 10,
      },
    });

    expect(result.windows.length).toBeGreaterThan(0);
    expect(result.metrics.sharpeRatio).not.toBeNull();
    expect(result.metrics.significanceThreshold).toBe(1.96);
    expect(result.visualization.equityCurve.length).toBeGreaterThan(10);
    expect(result.visualization.drawdownSeries.length).toBe(result.visualization.equityCurve.length);
  });

  it("marks certificate as not significant when t-stat is below threshold", () => {
    const result = buildSystemSafetyCertificate({
      hitRate: 0.6,
      sharpeRatio: 1.3,
      maxDrawdown: 0.1,
      alphaVsBenchmark: 0.02,
      alphaReason: "OK",
      returnsTStat: 1.4,
      isStatisticallySignificant: false,
      significanceThreshold: 1.96,
    });

    expect(result.approved).toBe(false);
    expect(result.reasons.some((reason) => reason.includes("istatistiksel"))).toBe(true);
  });

  it("approves certificate when sharpe/mdd and t-stat conditions are all valid", () => {
    const result = buildSystemSafetyCertificate({
      hitRate: 0.6,
      sharpeRatio: 1.3,
      maxDrawdown: 0.1,
      alphaVsBenchmark: 0.02,
      alphaReason: "OK",
      returnsTStat: 2.3,
      isStatisticallySignificant: true,
      significanceThreshold: 1.96,
    });

    expect(result.approved).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("returns null sharpe when annualization period is invalid", () => {
    expect(calculateSharpeRatio([0.01, 0.02, -0.01], 0)).toBeNull();
  });
});
