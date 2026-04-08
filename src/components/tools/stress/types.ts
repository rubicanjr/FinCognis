export type StressAssetClass =
  | "crypto"
  | "turkish_equity"
  | "us_equity"
  | "commodity"
  | "bond"
  | "fx";

export interface StressAsset {
  id: string;
  ticker: string;
  name: string;
  assetClass: StressAssetClass;
  betaMarket: number;
  dailyVol: number;
  tailScale: number;
  liquidityDays: number;
  slippageBps: number;
  jumpDefaultProb: number;
  factorLoadings: {
    fx: number;
    rate: number;
    commodity: number;
    inflation: number;
  };
}

export interface CrisisScenario {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  severityHint: number;
  assetClassShock: Partial<Record<StressAssetClass, number>>;
  benchmarkReturns: {
    bist100: number;
    gold: number;
    sp500: number;
  };
}

export interface MacroShockInput {
  rateShockPct: number;
  inflationShockPct: number;
  dxyStable: boolean;
  btcShockPct: number;
}

export interface PortfolioInput {
  portfolioValue: number;
  weights: Record<string, number>;
  selectedCrisisId: string;
  scenarioSeverity: "mild" | "medium" | "severe";
  macroShock: MacroShockInput;
  withdrawalRatePct: number;
}

export interface CrisisReplayResult {
  scenarioId: string;
  title: string;
  cumulativeReturn: number;
  maxDrawdown: number;
  recoveryMonths: number;
  benchmarkComparison: {
    bist100: number;
    gold: number;
    sp500: number;
  };
}

export interface ScenarioStressResult {
  label: string;
  shock: number;
  stressedLoss: number;
  remainingValue: number;
}

export interface MonteCarloResult {
  simulations: number;
  horizonDays: number;
  var99: number;
  cvar99: number;
  maxDrawdown99: number;
  cone: {
    day: number;
    p10: number;
    p50: number;
    p90: number;
  }[];
}

export interface DccGarchStressResult {
  currentCorrelation: number;
  stressedCorrelation: number;
  correlationCeilingHitRate: number;
  condVolPortfolio: number;
}

export interface SequenceRiskResult {
  medianTerminalWealth: number;
  p10TerminalWealth: number;
  depletionProbability: number;
  timingPenalty: number;
}

export interface FactorSensitivityResult {
  exposures: {
    fx: number;
    rate: number;
    commodity: number;
    inflation: number;
  };
  weakestFactor: "fx" | "rate" | "commodity" | "inflation";
  pcaVarianceExplained: number;
}

export interface LiquidityStressResult {
  weightedLiquidationDays: number;
  slippageLoss: number;
  gapLoss: number;
  jumpToDefaultLoss: number;
}

export interface ValidationResult {
  kupiecExceedanceRate: number;
  kupiecPass: boolean;
  kupiecPValue: number;
  phaseShuffledRobustness: number;
  overfittingRisk: "low" | "medium" | "high";
}

export interface RegulationResult {
  baselCapitalNeedPct: number;
  ccarLossPct: number;
  solvencyCapitalNeedPct: number;
  compliant: boolean;
}

export interface GuidanceResult {
  resilienceScore: number;
  headline: string;
  summary: string;
  hedgeSuggestions: string[];
  ipsDraft: string;
}

export interface StressAnalysisResult {
  crisisReplayLibrary: CrisisReplayResult[];
  selectedCrisis: CrisisReplayResult;
  scenarioSet: ScenarioStressResult[];
  monteCarlo: MonteCarloResult;
  dccGarch: DccGarchStressResult;
  sequenceRisk: SequenceRiskResult;
  factorSensitivity: FactorSensitivityResult;
  liquidityStress: LiquidityStressResult;
  validation: ValidationResult;
  regulation: RegulationResult;
  guidance: GuidanceResult;
}
