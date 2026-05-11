import type { AnalyzeRequest } from "@/lib/contracts/universal-asset-schemas";
import type { UniversalMetrics } from "@/components/tools/correlation/universal-asset-comparison";

export type StockMarketType = "BIST" | "US";

export interface AnalysisCriterion {
  id: "teknik_momentum" | "kurumsal_akis" | "katalizor_takvimi" | "kazanc_kalitesi" | "sermaye_tahsisi" | "degerleme" | "bist_ozgu";
  label: string;
  sourceMetric: keyof UniversalMetrics;
}

export interface ResolveAnalysisCriteriaInput {
  timeHorizon: AnalyzeRequest["timeHorizon"];
  marketType: StockMarketType;
}

const SHORT_TERM_CRITERIA: readonly AnalysisCriterion[] = [
  { id: "teknik_momentum", label: "Teknik Momentum", sourceMetric: "return" },
  { id: "kurumsal_akis", label: "Kurumsal Akış", sourceMetric: "liquidity" },
  { id: "katalizor_takvimi", label: "Katalizör Takvimi", sourceMetric: "calmness" },
];

const LONG_TERM_CRITERIA: readonly AnalysisCriterion[] = [
  { id: "kazanc_kalitesi", label: "Kazanç Kalitesi", sourceMetric: "return" },
  { id: "sermaye_tahsisi", label: "Sermaye Tahsisi", sourceMetric: "diversification" },
  { id: "degerleme", label: "Değerleme", sourceMetric: "risk" },
];

const BIST_EXTRA_CRITERION: AnalysisCriterion = {
  id: "bist_ozgu",
  label: "BIST Özgü",
  sourceMetric: "liquidity",
};

function baseCriteriaByHorizon(timeHorizon: AnalyzeRequest["timeHorizon"]): readonly AnalysisCriterion[] {
  return timeHorizon === "1mo" ? SHORT_TERM_CRITERIA : LONG_TERM_CRITERIA;
}

export function resolveAnalysisCriteria(input: ResolveAnalysisCriteriaInput): AnalysisCriterion[] {
  const base = [...baseCriteriaByHorizon(input.timeHorizon)];
  const shouldShowBistCriterion = input.marketType === "BIST";
  return shouldShowBistCriterion ? [...base, BIST_EXTRA_CRITERION] : base;
}
