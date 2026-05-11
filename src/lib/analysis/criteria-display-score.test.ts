import { describe, expect, it } from "vitest";
import { AssetClass, type NormalizedAsset } from "@/components/tools/correlation/universal-asset-comparison";
import type { AnalysisCriterion } from "@/lib/analysis/analysis-criteria";
import { resolveCriterionDisplayScore } from "@/lib/analysis/criteria-display-score";

const technicalMomentumCriterion: AnalysisCriterion = {
  id: "teknik_momentum",
  label: "Teknik Momentum",
  sourceMetric: "return",
};

function buildAsset(overrides: Partial<NormalizedAsset> = {}): NormalizedAsset {
  return {
    symbol: "TUPRS",
    originalInput: "TUPRS",
    class: AssetClass.Equity,
    metrics: {
      risk: 5,
      return: 8,
      liquidity: 7,
      diversification: 6,
      calmness: 5,
    },
    ...overrides,
  };
}

describe("resolveCriterionDisplayScore", () => {
  it("uses explicit criteria score when present", () => {
    const asset = buildAsset({
      criteriaScores: {
        teknik_momentum: {
          id: "teknik_momentum",
          score: 4.2,
          rawScore: 24.9,
          available: true,
          source: "market_history",
          maxPossible: 60,
          achievedMax: 15,
          missing: ["macd", "sma", "atr"],
        },
      },
    });

    expect(resolveCriterionDisplayScore(asset, technicalMomentumCriterion)).toBe(4.2);
  });

  it("does not fall back to legacy metrics when explicit criteria score is null", () => {
    const asset = buildAsset({
      criteriaScores: {
        teknik_momentum: {
          id: "teknik_momentum",
          score: null,
          rawScore: null,
          available: false,
          source: "market_history",
          maxPossible: 60,
          achievedMax: 0,
          missing: ["rsi", "macd", "sma", "atr"],
        },
      },
    });

    expect(resolveCriterionDisplayScore(asset, technicalMomentumCriterion)).toBeNull();
  });

  it("falls back to legacy metrics only when no explicit criteria payload exists", () => {
    expect(resolveCriterionDisplayScore(buildAsset(), technicalMomentumCriterion)).toBe(8);
  });
});
