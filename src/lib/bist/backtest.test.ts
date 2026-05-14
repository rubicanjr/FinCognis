import { describe, expect, it } from "vitest";
import { runRiskAwareBacktest } from "@/lib/bist/backtest";

function makeTimestamps(length: number): number[] {
  const start = Date.UTC(2025, 0, 1);
  return Array.from({ length }, (_, i) => start + i * 24 * 60 * 60 * 1000);
}

describe("risk-aware backtest", () => {
  it("does not execute rejected entries when liquidity gate fails", () => {
    const len = 80;
    const closes = Array.from({ length: len }, (_, i) => 100 + i * 0.4);
    const highs = closes.map((c) => c * 1.01);
    const lows = closes.map((c) => c * 0.99);
    const volumes = Array.from({ length: len }, () => 1_000); // very low liquidity
    const signals = Array.from({ length: len }, (_, i) => (i % 10 === 0 ? "LONG" : "HOLD" as const));

    const result = runRiskAwareBacktest({
      ticker: "TEST",
      timestamps: makeTimestamps(len),
      closes,
      highs,
      lows,
      volumes,
      signals,
      initialCapital: 100_000,
      liquidityThresholds: {
        minAvgVolume20: 100_000,
        minAvgNotional20: 5_000_000,
      },
      riskThresholds: {
        maxRiskScore: 70,
        blockHighVolatilityRegime: true,
      },
      costConfig: {
        tailRiskHedgePercent: 0,
      },
    });

    expect(result.tradeCount).toBe(0);
    expect(result.rejectedEntryCount).toBeGreaterThan(0);
    expect(result.finalEquity).toBe(100_000);
    expect(result.rejectedEntryCount).toBe(result.rejectionBreakdown.total);
    expect(result.rejectionBreakdown.liquidity).toBeGreaterThan(0);
    expect(result.survival.survivalProbabilityPercent).toBeGreaterThanOrEqual(0);
    expect(result.survival.survivalProbabilityPercent).toBeLessThanOrEqual(100);
  });

  it("blocks entries under strict tail-risk threshold", () => {
    const closes = [
      100, 112, 91, 118, 88, 125, 90, 132, 87, 140,
      92, 136, 85, 145, 89, 152, 91, 149, 86, 158,
      90, 154, 88, 162, 92, 159, 87, 168, 94, 164,
      90, 172, 96, 168, 92, 176, 99, 171, 94, 180,
      101, 175, 96, 184, 103, 178, 98, 188, 105, 182,
      100, 192, 108, 186, 102, 196, 110, 189, 104, 200,
    ];
    const len = closes.length;
    const highs = closes.map((c) => c * 1.04);
    const lows = closes.map((c) => c * 0.96);
    const volumes = Array.from({ length: len }, () => 2_000_000);
    const signals = Array.from({ length: len }, (_, i) => (i % 8 === 0 ? "LONG" : "HOLD" as const));

    const strict = runRiskAwareBacktest({
      ticker: "TEST",
      timestamps: makeTimestamps(len),
      closes,
      highs,
      lows,
      volumes,
      signals,
      initialCapital: 100_000,
      liquidityThresholds: {
        minAvgVolume20: 100_000,
        minAvgNotional20: 5_000_000,
      },
      riskThresholds: {
        maxRiskScore: 35,
        blockHighVolatilityRegime: true,
      },
    });

    expect(strict.rejectedEntryCount).toBeGreaterThan(0);
    expect(strict.tradeCount).toBe(0);
    expect(strict.rejectedEntryCount).toBe(strict.rejectionBreakdown.total);
    expect(strict.rejectionBreakdown.riskScore + strict.rejectionBreakdown.volatilityRegime + strict.rejectionBreakdown.drawdown).toBeGreaterThan(0);
  });

  it("executes trades when risk and liquidity gates pass", () => {
    const len = 120;
    const closes = Array.from({ length: len }, (_, i) => 100 + i * 0.25 + Math.sin(i / 7));
    const highs = closes.map((c) => c * 1.008);
    const lows = closes.map((c) => c * 0.992);
    const volumes = Array.from({ length: len }, () => 2_500_000);
    const signals = Array.from({ length: len }, (_, i) => {
      if (i % 24 === 0) return "LONG" as const;
      if (i % 24 === 12) return "EXIT" as const;
      return "HOLD" as const;
    });

    const result = runRiskAwareBacktest({
      ticker: "TEST",
      timestamps: makeTimestamps(len),
      closes,
      highs,
      lows,
      volumes,
      signals,
      initialCapital: 100_000,
      liquidityThresholds: {
        minAvgVolume20: 100_000,
        minAvgNotional20: 5_000_000,
      },
      riskThresholds: {
        maxRiskScore: 85,
        blockHighVolatilityRegime: false,
      },
    });

    expect(result.tradeCount).toBeGreaterThan(0);
    expect(result.rejectedEntryCount).toBe(0);
    expect(result.finalEquity).toBeGreaterThan(0);
    expect(typeof result.trackingErrorPercent).toBe("number");
  });

  it("tracks invalid-price rejections in breakdown", () => {
    const len = 70;
    const closes = Array.from({ length: len }, (_, i) => 100 + i * 0.3);
    closes[40] = 0;
    const highs = closes.map((c) => Math.max(0.01, c) * 1.01);
    const lows = closes.map((c) => Math.max(0.01, c) * 0.99);
    const volumes = Array.from({ length: len }, () => 3_000_000);
    const signals = Array.from({ length: len }, (_, i) => (i === 40 ? "LONG" : "HOLD" as const));

    const result = runRiskAwareBacktest({
      ticker: "TEST",
      timestamps: makeTimestamps(len),
      closes,
      highs,
      lows,
      volumes,
      signals,
      initialCapital: 100_000,
      liquidityThresholds: {
        minAvgVolume20: 100_000,
        minAvgNotional20: 5_000_000,
      },
      riskThresholds: {
        maxRiskScore: 95,
        blockHighVolatilityRegime: false,
        warmupBars: 30,
      },
    });

    expect(result.rejectionBreakdown.invalidPrice).toBeGreaterThan(0);
    expect(result.rejectedEntryCount).toBe(result.rejectionBreakdown.total);
  });

  it("models black swan hedge as explicit survival cost", () => {
    const len = 140;
    const closes = Array.from({ length: len }, (_, i) => 100 + i * 0.18);
    const highs = closes.map((c) => c * 1.006);
    const lows = closes.map((c) => c * 0.994);
    const volumes = Array.from({ length: len }, () => 3_000_000);
    const signals = Array.from({ length: len }, (_, i) => (i === 0 ? "LONG" : "HOLD" as const));

    const noHedge = runRiskAwareBacktest({
      ticker: "TEST",
      timestamps: makeTimestamps(len),
      closes,
      highs,
      lows,
      volumes,
      signals,
      initialCapital: 100_000,
      liquidityThresholds: {
        minAvgVolume20: 100_000,
        minAvgNotional20: 5_000_000,
      },
      riskThresholds: {
        maxRiskScore: 95,
        blockHighVolatilityRegime: false,
        warmupBars: 1,
      },
      costConfig: {
        commissionBps: 0,
        slippageBps: 0,
        taxBps: 0,
        tailRiskHedgePercent: 0,
      },
    });

    const withHedge = runRiskAwareBacktest({
      ticker: "TEST",
      timestamps: makeTimestamps(len),
      closes,
      highs,
      lows,
      volumes,
      signals,
      initialCapital: 100_000,
      liquidityThresholds: {
        minAvgVolume20: 100_000,
        minAvgNotional20: 5_000_000,
      },
      riskThresholds: {
        maxRiskScore: 95,
        blockHighVolatilityRegime: false,
        warmupBars: 1,
      },
      costConfig: {
        commissionBps: 0,
        slippageBps: 0,
        taxBps: 0,
        tailRiskHedgePercent: 2,
      },
    });

    expect(withHedge.blackSwan.tailRiskHedgePercent).toBe(2);
    expect(withHedge.blackSwan.hedgeCostAmount).toBeGreaterThan(0);
    expect(withHedge.blackSwan.hedgePayoffAmount).toBe(0);
    expect(withHedge.blackSwan.netCostAmount).toBeGreaterThan(0);
    expect(withHedge.finalEquity).toBeLessThan(noHedge.finalEquity);
  });

  it("tracks regime shift response timeline and IR/TE metrics", () => {
    const closes = [
      100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
      110, 111, 112, 113, 114, 115, 116, 117, 118, 119,
      120, 118, 116, 114, 112, 110, 98, 94, 90, 92,
      95, 97, 100, 102, 103, 104, 106, 108, 107, 106,
      105, 104, 103, 102, 101, 100, 101, 102, 103, 104,
      105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
    ];
    const len = closes.length;
    const highs = closes.map((c) => c * 1.015);
    const lows = closes.map((c) => c * 0.985);
    const volumes = Array.from({ length: len }, () => 2_500_000);
    const signals = Array.from({ length: len }, (_, i) => {
      if (i % 7 === 0) return "LONG" as const;
      if (i % 11 === 0) return "EXIT" as const;
      return "HOLD" as const;
    });

    const result = runRiskAwareBacktest({
      ticker: "TEST",
      timestamps: makeTimestamps(len),
      closes,
      highs,
      lows,
      volumes,
      signals,
      initialCapital: 100_000,
      liquidityThresholds: {
        minAvgVolume20: 100_000,
        minAvgNotional20: 5_000_000,
      },
      riskThresholds: {
        maxRiskScore: 65,
        blockHighVolatilityRegime: true,
        maxDrawdownGatePercent: 22,
        warmupBars: 15,
      },
      costConfig: {
        commissionBps: 0,
        slippageBps: 0,
        taxBps: 0,
        tailRiskHedgePercent: 1.5,
      },
    });

    expect(typeof result.trackingErrorPercent).toBe("number");
    expect(result.informationRatio === null || Number.isFinite(result.informationRatio)).toBe(true);
    expect(result.annualizedActiveReturnPercent).toBeTypeOf("number");

    const hasRegimeTimeline = result.rejectionTimeline.some((e) => e.category === "REGIME_SHIFT");
    expect(hasRegimeTimeline).toBe(true);

    expect(result.regimeShiftAnalysis.highRiskShiftCount).toBeGreaterThanOrEqual(0);
    expect(result.regimeShiftAnalysis.respondedShiftCount).toBeGreaterThanOrEqual(0);

    const hasAdversarialOrMargin = result.rejectionTimeline.some(
      (e) => e.category === "ADVERSARIAL_RISK" || e.category === "MARGIN_DYNAMICS"
    );
    expect(hasAdversarialOrMargin).toBe(true);
  });

  // ── P3: isCertified & killSwitchTriggered contract tests ──

  it("sets isCertified=false and killSwitchTriggered=true when drawdown breaches gate", () => {
    // Create a price series with a large drawdown to breach maxDrawdownGatePercent=15
    // Peak at 200, trough at 140 → 30% drawdown > 15% gate
    const closes = [
      100, 110, 130, 150, 170, 190, 200, 180, 160, 140,
      145, 150, 155, 160, 165, 170, 175, 180, 185, 190,
      195, 200, 195, 190, 185, 180, 175, 170, 165, 160,
      155, 150, 155, 160, 165, 170, 175, 180, 185, 190,
      195, 200, 195, 190, 185, 180, 175, 170, 165, 160,
      155, 150, 155, 160, 165, 170, 175, 180, 185, 190,
      195, 200, 195, 190, 185, 180, 175, 170, 165, 160,
    ];
    const len = closes.length;
    const highs = closes.map((c) => c * 1.015);
    const lows = closes.map((c) => c * 0.985);
    const volumes = Array.from({ length: len }, () => 3_000_000);
    // Generate LONG signals after warmup
    const signals = Array.from({ length: len }, (_, i) =>
      i > 35 && i % 10 === 0 ? ("LONG" as const) : ("HOLD" as const)
    );

    const result = runRiskAwareBacktest({
      ticker: "TEST",
      timestamps: makeTimestamps(len),
      closes,
      highs,
      lows,
      volumes,
      signals,
      initialCapital: 100_000,
      liquidityThresholds: {
        minAvgVolume20: 100_000,
        minAvgNotional20: 5_000_000,
      },
      riskThresholds: {
        maxRiskScore: 95,
        blockHighVolatilityRegime: false,
        maxDrawdownGatePercent: 15,
        warmupBars: 30,
      },
      costConfig: {
        tailRiskHedgePercent: 0,
      },
    });

    // Contract assertions
    expect(result.isCertified).toBe(false);
    expect(result.killSwitchTriggered).toBe(true);
    // Evidence: drawdown rejection must have occurred
    expect(result.rejectionBreakdown.drawdown).toBeGreaterThan(0);
  });

  it("sets isCertified=true and killSwitchTriggered=false for calm upward-trending data", () => {
    const len = 120;
    const closes = Array.from({ length: len }, (_, i) => 100 + i * 0.5);
    const highs = closes.map((c) => c * 1.005);
    const lows = closes.map((c) => c * 0.995);
    const volumes = Array.from({ length: len }, () => 3_000_000);
    const signals = Array.from({ length: len }, (_, i) =>
      i % 20 === 0 ? ("LONG" as const) : ("HOLD" as const)
    );

    const result = runRiskAwareBacktest({
      ticker: "TEST",
      timestamps: makeTimestamps(len),
      closes,
      highs,
      lows,
      volumes,
      signals,
      initialCapital: 100_000,
      liquidityThresholds: {
        minAvgVolume20: 100_000,
        minAvgNotional20: 5_000_000,
      },
      riskThresholds: {
        maxRiskScore: 95,
        blockHighVolatilityRegime: false,
        maxDrawdownGatePercent: 25,
        warmupBars: 20,
      },
      costConfig: {
        tailRiskHedgePercent: 0,
      },
    });

    expect(result.isCertified).toBe(true);
    expect(result.killSwitchTriggered).toBe(false);
    expect(result.rejectionBreakdown.drawdown).toBe(0);
  });

  it("sets isCertified=true and killSwitchTriggered=false on early return (len < 2)", () => {
    const result = runRiskAwareBacktest({
      ticker: "TEST",
      timestamps: [Date.UTC(2025, 0, 1)],
      closes: [100],
      highs: [101],
      lows: [99],
      volumes: [1_000_000],
      signals: ["HOLD"],
      initialCapital: 100_000,
    });

    expect(result.isCertified).toBe(true);
    expect(result.killSwitchTriggered).toBe(false);
    expect(result.tradeCount).toBe(0);
  });
});
