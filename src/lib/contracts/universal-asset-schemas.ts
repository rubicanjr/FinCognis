import { z } from "zod";
import { AssetClass } from "@/components/tools/correlation/universal-asset-comparison";

export const AssetClassSchema = z.nativeEnum(AssetClass);

export const UniversalMetricsSchema = z.object({
  risk: z.number().min(1).max(10),
  return: z.number().min(1).max(10),
  liquidity: z.number().min(1).max(10),
  diversification: z.number().min(1).max(10),
});

export const NormalizedAssetSchema = z.object({
  symbol: z.string().min(1),
  originalInput: z.string().min(1),
  class: AssetClassSchema,
  metrics: UniversalMetricsSchema,
});

export const AssetParserWarningSchema = z.object({
  level: z.enum(["info", "warning"]),
  message: z.string().min(1),
});

export const AssetCatalogItemSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  class: AssetClassSchema,
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
    })
  ).max(40),
});

export const AnalyzeResponseSchema = z.object({
  assets: z.array(NormalizedAssetSchema),
  warnings: z.array(AssetParserWarningSchema),
  meta: LiveDataMetaSchema,
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
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
export type DecisionRequest = z.infer<typeof DecisionRequestSchema>;
export type DecisionResponse = z.infer<typeof DecisionResponseSchema>;
