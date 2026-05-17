import { z } from "zod";
import { SPK_LEGAL_DISCLAIMER } from "@/lib/legal/spk-disclaimer";
import { AssetClass } from "@/components/tools/correlation/universal-asset-comparison";

export const AssetClassSchema = z.nativeEnum(AssetClass);
export const AssetCategorySchema = z.enum([
  "BIST_STOCK",
  "US_STOCK",
  "CRYPTO",
  "COMMODITY",
  "FX",
  "US_ETF",
]);
export const AnalyzeTimeHorizonSchema = z.enum(["1mo", "1y", "5y"]);
export const AnalyzeModeSchema = z.enum(["compare", "discover"]);

export const UniversalMetricsSchema = z.object({
  risk: z.number().min(1).max(10),
  return: z.number().min(1).max(10),
  liquidity: z.number().min(1).max(10).nullable(),
  diversification: z.number().min(1).max(10),
  calmness: z.number().min(1).max(10).nullable(),
});

export const AnalysisCriterionScoreIdSchema = z.enum([
  "teknik_momentum",
  "kurumsal_akis",
  "katalizor_takvimi",
  "kazanc_kalitesi",
  "sermaye_tahsisi",
  "degerleme",
  "bist_ozgu",
]);

export const AnalysisCriterionScorePayloadSchema = z.object({
  id: AnalysisCriterionScoreIdSchema,
  score: z.number().min(1).max(10).nullable(),
  rawScore: z.number().nullable(),
  available: z.boolean(),
  source: z.enum(["market_history", "proxy", "unavailable", "price-volume-proxy", "estimate"]),
  maxPossible: z.number().nonnegative(),
  achievedMax: z.number().nonnegative(),
  missing: z.array(z.string().min(1)),
  note: z.string().min(1).optional(),
});

export const AssetComputationMetaSchema = z.object({
  isFallback: z.boolean(),
  fallbackReasons: z.array(z.string().min(1)),
  modelVersion: z.string().min(1),
  timeHorizon: AnalyzeTimeHorizonSchema,
});

export const NormalizedAssetSchema = z.object({
  symbol: z.string().min(1),
  originalInput: z.string().min(1),
  class: AssetClassSchema,
  metrics: UniversalMetricsSchema,
  criteriaScores: z.partialRecord(AnalysisCriterionScoreIdSchema, AnalysisCriterionScorePayloadSchema).optional(),
  computation: AssetComputationMetaSchema.optional(),
});

export const AssetParserWarningSchema = z.object({
  level: z.enum(["info", "warning"]),
  message: z.string().min(1),
});

export const AssetCatalogItemSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  class: AssetClassSchema,
  category: AssetCategorySchema,
  aliases: z.array(z.string().min(1)),
});

export const LiveDataMetaSchema = z.object({
  mode: z.literal("realtime_gateway"),
  provider: z.string().min(1),
  fetchedAtIso: z.string().datetime(),
  note: z.string().min(1),
});

export const AssetsApiResponseSchema = z.object({
  assets: z.array(AssetCatalogItemSchema),
  aliasDictionary: z.record(z.string(), z.string()),
  meta: LiveDataMetaSchema.optional(),
});

export const AnalyzeRequestSchema = z.object({
  assets: z.array(
    z.object({
      symbol: z.string().min(1),
      originalInput: z.string().min(1),
      class: AssetClassSchema,
      category: AssetCategorySchema.optional(),
    })
  ).max(40),
  timeHorizon: AnalyzeTimeHorizonSchema.default("1y"),
  analysisMode: AnalyzeModeSchema.default("compare"),
});

export const AnalyzeResponseSchema = z.object({
  assets: z.array(NormalizedAssetSchema),
  warnings: z.array(AssetParserWarningSchema),
  meta: LiveDataMetaSchema,
});

export const DiscoverHorizonSchema = z.enum(["short", "long"]);

export const DiscoverProfileWeightsSchema = z.object({
  teknikMomentum: z.number().min(0).max(100).optional(),
  kurumsalAkis: z.number().min(0).max(100).optional(),
  katalizorTakvimi: z.number().min(0).max(100).optional(),
  kazancKalitesi: z.number().min(0).max(100).optional(),
  sermayeTahsisi: z.number().min(0).max(100).optional(),
  degerleme: z.number().min(0).max(100).optional(),
  bistOzgu: z.number().min(0).max(100).optional(),
});

export const DiscoverRequestSchema = z.object({
  horizon: DiscoverHorizonSchema,
  profileWeights: DiscoverProfileWeightsSchema,
  macroFilter: z.literal(true),
  minMarketCap: z.enum(["bist30", "bist100", "all"]).default("all"),
});

export const MacroSnapshotSchema = z.object({
  policyRate: z.number(),
  source: z.enum(["tcmb_evds_live", "last_known_fallback"]),
  fetchedAtIso: z.string().datetime(),
  note: z.string().min(1).optional(),
});

export const DiscoverStockResultSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  sector: z.string().min(1),
  industry: z.string().min(1).optional(),
  sectorMapped: z.boolean(),
  sectorSource: z.enum(["yahoo", "static_map", "unknown"]),
  profileFitScore: z.number().min(0).max(100),
  highlightMetric: z.string().min(1),
  macroCoefficient: z.number().positive(),
  macroPenaltyApplied: z.boolean(),
  macroPenaltyMessage: z.string().min(1).optional(),
  dataWarning: z.string().min(1).optional(),
});

export const DiscoverResponseSchema = z.object({
  results: z.array(DiscoverStockResultSchema),
  totalScanned: z.number().int().nonnegative(),
  cached: z.boolean(),
  cacheAge: z.string().min(1),
  macroSnapshot: MacroSnapshotSchema,
  disclaimer: z.string().min(1).refine((value) => value === SPK_LEGAL_DISCLAIMER),
});

export const DecisionIntentSchema = z.enum(["ADD", "COMPARE", "REPLACE"]);

export const DecisionContextSchema = z.object({
  intent: DecisionIntentSchema,
  currentRiskProfile: z.number().min(1).max(10),
});

export const DecisionInsightSchema = z.object({
  primaryVerdict: z.string().min(1),
  riskConcentrationImpact: z.enum(["HIGH", "MEDIUM", "LOW"]),
  correlationNote: z.string().min(1),
  actionFrame: z.string().min(1),
});

export const DecisionQuantDataSchema = z.object({
  baselineVolatility: z.number(),
  projectedVolatility: z.number(),
  riskDensityDelta: z.number(),
  averageCorrelation: z.number(),
  concentrationDeltaPct: z.number(),
  riskExposureScore: z.number().min(1).max(10),
  benefitScore: z.number().min(1).max(10),
});

export const DecisionRequestSchema = z.object({
  query: z.string().min(2),
  currentRiskProfile: z.number().min(1).max(10).default(5),
});

export const DecisionResponseSchema = z.object({
  context: DecisionContextSchema,
  insight: DecisionInsightSchema,
  quant: DecisionQuantDataSchema,
  focusAssetSymbol: z.string().nullable(),
  assets: z.array(NormalizedAssetSchema),
  warnings: z.array(AssetParserWarningSchema),
});

export type AssetsApiResponse = z.infer<typeof AssetsApiResponseSchema>;
export type AssetCategory = z.infer<typeof AssetCategorySchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
export type DiscoverRequest = z.infer<typeof DiscoverRequestSchema>;
export type DiscoverResponse = z.infer<typeof DiscoverResponseSchema>;
export type DecisionRequest = z.infer<typeof DecisionRequestSchema>;
export type DecisionResponse = z.infer<typeof DecisionResponseSchema>;
