import type {
  AssetParserWarning,
  NormalizedAsset,
} from "@/components/tools/correlation/universal-asset-comparison";

export type DecisionIntent = "ADD" | "COMPARE" | "REPLACE";
export type RiskConcentrationImpact = "HIGH" | "MEDIUM" | "LOW";

export interface DecisionContext {
  intent: DecisionIntent;
  currentRiskProfile: number;
}

export interface DecisionInsight {
  primaryVerdict: string;
  riskConcentrationImpact: RiskConcentrationImpact;
  correlationNote: string;
  actionFrame: string;
}

export interface DecisionQuantData {
  baselineVolatility: number;
  projectedVolatility: number;
  riskDensityDelta: number;
  averageCorrelation: number;
  concentrationDeltaPct: number;
  riskExposureScore: number;
  benefitScore: number;
}

export interface DecisionEngineResult {
  context: DecisionContext;
  insight: DecisionInsight;
  quant: DecisionQuantData;
  assets: NormalizedAsset[];
  warnings: AssetParserWarning[];
  focusAssetSymbol: string | null;
}
