export type CategoryId = "emtialar" | "kripto" | "turk_hisse" | "abd_hisse";
export type LiquidityTier = "ultra" | "high" | "medium" | "low";
export type WindowKey = "d30" | "d90" | "d250" | "y1" | "y3";

export interface CategoryOption {
  id: CategoryId;
  label: string;
  description: string;
  universeHint: string;
}

export interface AssetDefinition {
  id: string;
  ticker: string;
  name: string;
  category: CategoryId;
  topPercentile: number;
  benchmarkGroup: string;
  liquidityTier: LiquidityTier;
  baseDrift: number;
  baseVol: number;
  betaGlobal: number;
  betaCategory: number;
  jumpSensitivity: number;
  gapSensitivity: number;
}

export interface LiquidityProfile {
  liquidationDays: number;
  marginAddOn: number;
  slippageMultiplier: number;
}

export interface HistoryDataset {
  dates: string[];
  returnsByAsset: Record<string, number[]>;
  gapByAsset: Record<string, number[]>;
  marketReturns: number[];
  categoryReturns: Record<CategoryId, number[]>;
}

export interface DccGarchResult {
  latestCorrelation: number;
  effectiveCorrelation: number;
  averageCorrelation: number;
  ceilingHitRatio: number;
  conditionalVolA: number;
  conditionalVolB: number;
  rollingSeries: number[];
}

export interface TailDependenceResult {
  lowerTailDependence: number;
  upperTailDependence: number;
  tCopulaDf: number;
  jointCrashProbability: number;
  coCrashMultiplier: number;
}

export interface JumpGapRiskResult {
  jumpEventCount: number;
  jumpToDefaultProbability: number;
  gapEventCount: number;
  worstGap: number;
}

export interface BacktestResult {
  confidenceLevel: number;
  observations: number;
  exceedances: number;
  exceedanceRate: number;
  kupiecLR: number;
  kupiecPValue: number;
  pass: boolean;
}

export interface RollingPoint {
  key: WindowKey;
  label: string;
  size: number;
  correlation: number;
}

export interface CrisisReplayResult {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  periodDays: number;
  cumulativeLoss: number;
  maxDrawdown: number;
  regimeCorrelation: number;
}

export interface HeatmapCell {
  rowId: string;
  colId: string;
  value: number;
}

export interface ContagionNodeImpact {
  assetId: string;
  directImpact: number;
  propagatedImpact: number;
  totalImpact: number;
}

export interface ContagionEdge {
  sourceId: string;
  targetId: string;
  weight: number;
}

export interface ContagionMapResult {
  sourceAssetId: string;
  assumedShock: number;
  nodeImpacts: ContagionNodeImpact[];
  edges: ContagionEdge[];
}

export interface StressVarResult {
  horizonDays: number;
  simulations: number;
  var99: number;
  expectedShortfall99: number;
  maxDrawdown99: number;
}

export interface NarrativeResult {
  severity: "low" | "medium" | "high" | "critical";
  headline: string;
  summary: string;
  alternatives: string[];
  flags: string[];
}

export interface CorrelationAnalysisResult {
  pearsonCorrelation: number;
  downsideCorrelation: number;
  upsideCorrelation: number;
  downsideFlag: boolean;
  rolling: RollingPoint[];
  dccGarch: DccGarchResult;
  tail: TailDependenceResult;
  jumpGap: JumpGapRiskResult;
  backtest: BacktestResult;
  crisisReplay: CrisisReplayResult[];
  heatmap: HeatmapCell[];
  contagion: ContagionMapResult;
  stressVar: StressVarResult;
  narrative: NarrativeResult;
  liquidityProfiles: Record<string, LiquidityProfile>;
}
