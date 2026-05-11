import type { NormalizedAsset } from "@/components/tools/correlation/universal-asset-comparison";
import type { AnalysisCriterion } from "@/lib/analysis/analysis-criteria";

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, value));
}

export function resolveCriterionDisplayScore(asset: NormalizedAsset, criterion: AnalysisCriterion): number | null {
  const explicitScore = asset.criteriaScores?.[criterion.id];
  if (explicitScore) {
    return typeof explicitScore.score === "number" && Number.isFinite(explicitScore.score)
      ? clampScore(explicitScore.score)
      : null;
  }

  const raw = asset.metrics[criterion.sourceMetric];
  return typeof raw === "number" && Number.isFinite(raw) ? clampScore(raw) : null;
}
