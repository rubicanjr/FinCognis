import { describe, expect, it } from "vitest";
import {
  computeLiquidityMetrics,
  computeMaxDrawdownPercent,
  computeRiskLayer,
} from "@/lib/bist/risk";

function makeRange(start: number, count: number, step = 1): number[] {
  return Array.from({ length: count }, (_, i) => start + i * step);
}

describe("bist risk utilities", () => {
  it("computes max drawdown percent correctly", () => {
    const closes = [100, 120, 90, 95, 110];
    const drawdown = computeMaxDrawdownPercent(closes);
    expect(drawdown).toBeCloseTo(25, 2);
  });

  it("fails liquidity filter when average volume and notional are low", () => {
    const closes = makeRange(10, 30, 0.2);
    const volumes = Array.from({ length: 30 }, () => 10_000);

    const liq = computeLiquidityMetrics(closes, volumes, {
      minAvgVolume20: 100_000,
      minAvgNotional20: 5_000_000,
    });

    expect(liq.liquidityPass).toBe(false);
    expect(liq.avgVolume20).toBeLessThan(100_000);
  });

  it("passes liquidity filter for active tickers", () => {
    const closes = makeRange(100, 30, 0.5);
    const volumes = Array.from({ length: 30 }, () => 2_000_000);

    const liq = computeLiquidityMetrics(closes, volumes, {
      minAvgVolume20: 100_000,
      minAvgNotional20: 5_000_000,
    });

    expect(liq.liquidityPass).toBe(true);
    expect(liq.avgNotional20).toBeGreaterThan(5_000_000);
  });

  it("assigns higher risk score to volatile price series", () => {
    const stableCloses = makeRange(100, 60, 0.4);
    const stableHighs = stableCloses.map((c) => c * 1.01);
    const stableLows = stableCloses.map((c) => c * 0.99);
    const stableVolumes = Array.from({ length: 60 }, () => 1_000_000);

    const volatileCloses = [
      100, 108, 96, 115, 90, 118, 94, 125, 92, 130,
      95, 123, 88, 128, 90, 135, 96, 140, 94, 138,
      98, 145, 97, 142, 96, 147, 98, 143, 95, 150,
      99, 146, 97, 151, 101, 148, 100, 154, 102, 149,
      101, 156, 103, 152, 100, 158, 104, 153, 102, 160,
      105, 155, 103, 162, 106, 157, 104, 164, 108, 160,
    ];
    const volatileHighs = volatileCloses.map((c) => c * 1.04);
    const volatileLows = volatileCloses.map((c) => c * 0.96);
    const volatileVolumes = Array.from({ length: volatileCloses.length }, () => 1_000_000);

    const stableRisk = computeRiskLayer(stableHighs, stableLows, stableCloses, stableVolumes);
    const volatileRisk = computeRiskLayer(volatileHighs, volatileLows, volatileCloses, volatileVolumes);

    expect(volatileRisk.risk.riskScore).toBeGreaterThan(stableRisk.risk.riskScore);
  });
});
