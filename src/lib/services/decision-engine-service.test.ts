import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DecisionIntentSchema } from "@/lib/contracts/universal-asset-schemas";
import type {
  MarketDataGatewayPort,
  MarketHistory,
  MarketHistoryOptions,
  MarketLiquidity,
  MarketQuote,
} from "@/lib/gateways/market-data-gateway";
import { DecisionEngineService } from "@/lib/services/decision-engine-service";

const LOW_VOL = [0.001, -0.0008, 0.0012, -0.0007, 0.0011, -0.0009, 0.0008, -0.0006];
const MEDIUM_VOL = [0.006, -0.0045, 0.007, -0.0038, 0.0064, -0.0042, 0.0051, -0.0036];
const HIGH_VOL = [0.024, -0.018, 0.027, -0.015, 0.022, -0.017, 0.025, -0.016];
const VERY_HIGH_VOL = [0.038, -0.03, 0.041, -0.027, 0.036, -0.029, 0.039, -0.028];

const returnsBySymbol: Record<string, number[]> = {
  AAPL: MEDIUM_VOL,
  BTC: VERY_HIGH_VOL,
  ETH: HIGH_VOL,
  EURUSD: LOW_VOL,
  GARAN: MEDIUM_VOL,
  MSFT: LOW_VOL,
  QQQ: HIGH_VOL,
  SPY: MEDIUM_VOL,
  THYAO: MEDIUM_VOL,
  TUPRS: MEDIUM_VOL,
  USDTRY: MEDIUM_VOL,
  XAGUSD: LOW_VOL,
  XAU: LOW_VOL,
  XAUUSD: LOW_VOL,
};

function historyFromReturns(symbol: string, returns: number[]): MarketHistory {
  const points: MarketHistory["points"] = [];
  let close = 100;
  points.push({ date: "2026-01-01", close, volume: 10_000_000 });
  returns.forEach((ret, index) => {
    close = close * (1 + ret);
    points.push({
      date: `2026-01-${String(index + 2).padStart(2, "0")}`,
      close,
      volume: 10_000_000,
    });
  });
  return {
    symbol,
    providerSymbol: symbol,
    points,
    returns,
  };
}

const mockGateway: MarketDataGatewayPort = {
  async getQuote(symbol: string): Promise<MarketQuote | null> {
    return {
      symbol,
      providerSymbol: symbol,
      price: 100,
      changePercent: 0.5,
      volume: 10_000_000,
      currency: "USD",
      timestampIso: new Date("2026-01-10T10:00:00.000Z").toISOString(),
    };
  },
  async getHistory(symbol: string, _options?: MarketHistoryOptions): Promise<MarketHistory> {
    const returns = returnsBySymbol[symbol] ?? LOW_VOL;
    return historyFromReturns(symbol, returns);
  },
  async getLiquidity(symbol: string): Promise<MarketLiquidity> {
    return {
      symbol,
      providerSymbol: symbol,
      profile: {
        liquidationDays: 2,
        marginAddOn: 0.02,
        slippageMultiplier: 1.05,
      },
      avgDailyVolume: 10_000_000,
      volumeBand: "high",
    };
  },
  getSupportedAssets() {
    return [];
  },
};

const decisionEngineService = new DecisionEngineService(mockGateway);

const RiskDeltaExpectationSchema = z.enum(["positive", "negative", "neutral", "any"]);

const ValidationScenarioSchema = z.object({
  id: z.string().min(1),
  query: z.string().min(2),
  currentRiskProfile: z.number().int().min(1).max(10),
  expectedIntent: DecisionIntentSchema,
  expectedFocusAsset: z.string().nullable(),
  expectedRiskDelta: RiskDeltaExpectationSchema,
});

const ValidationMatrixSchema = z.array(ValidationScenarioSchema).length(15);

const ValidationResultSchema = z.object({
  intent: DecisionIntentSchema,
  focusAssetSymbol: z.string().nullable(),
  riskDensityDelta: z.number().finite(),
});

const decisionValidationMatrix = ValidationMatrixSchema.parse([
  {
    id: "s01",
    query: "BTC eklemeli miyim?",
    currentRiskProfile: 6,
    expectedIntent: "ADD",
    expectedFocusAsset: "BTC",
    expectedRiskDelta: "positive",
  },
  {
    id: "s02",
    query: "ETH eklemeli miyim?",
    currentRiskProfile: 5,
    expectedIntent: "ADD",
    expectedFocusAsset: "ETH",
    expectedRiskDelta: "positive",
  },
  {
    id: "s03",
    query: "MSFT eklemeli miyim?",
    currentRiskProfile: 8,
    expectedIntent: "ADD",
    expectedFocusAsset: "MSFT",
    expectedRiskDelta: "negative",
  },
  {
    id: "s04",
    query: "XAU ve BTC karsilastir",
    currentRiskProfile: 5,
    expectedIntent: "COMPARE",
    expectedFocusAsset: "BTC",
    expectedRiskDelta: "positive",
  },
  {
    id: "s05",
    query: "BTC ve XAU karsilastir",
    currentRiskProfile: 5,
    expectedIntent: "COMPARE",
    expectedFocusAsset: "XAU",
    expectedRiskDelta: "negative",
  },
  {
    id: "s06",
    query: "TUPRS ve BTC karşılaştır",
    currentRiskProfile: 5,
    expectedIntent: "COMPARE",
    expectedFocusAsset: "BTC",
    expectedRiskDelta: "positive",
  },
  {
    id: "s07",
    query: "BTC yerine XAU nasil?",
    currentRiskProfile: 5,
    expectedIntent: "REPLACE",
    expectedFocusAsset: "XAU",
    expectedRiskDelta: "negative",
  },
  {
    id: "s08",
    query: "XAU yerine BTC nasil?",
    currentRiskProfile: 5,
    expectedIntent: "REPLACE",
    expectedFocusAsset: "BTC",
    expectedRiskDelta: "positive",
  },
  {
    id: "s09",
    query: "ETH yerine MSFT",
    currentRiskProfile: 5,
    expectedIntent: "REPLACE",
    expectedFocusAsset: "MSFT",
    expectedRiskDelta: "negative",
  },
  {
    id: "s10",
    query: "Sadece karsilastir",
    currentRiskProfile: 5,
    expectedIntent: "COMPARE",
    expectedFocusAsset: null,
    expectedRiskDelta: "neutral",
  },
  {
    id: "s11",
    query: "BilinmeyenCoin eklemeli miyim?",
    currentRiskProfile: 5,
    expectedIntent: "ADD",
    expectedFocusAsset: null,
    expectedRiskDelta: "any",
  },
  {
    id: "s12",
    query: "SPY ve QQQ compare",
    currentRiskProfile: 5,
    expectedIntent: "COMPARE",
    expectedFocusAsset: "SPY",
    expectedRiskDelta: "any",
  },
  {
    id: "s13",
    query: "USDTRY yerine BTC",
    currentRiskProfile: 4,
    expectedIntent: "REPLACE",
    expectedFocusAsset: "BTC",
    expectedRiskDelta: "positive",
  },
  {
    id: "s14",
    query: "Altin yerine ETH karsilastir",
    currentRiskProfile: 5,
    expectedIntent: "REPLACE",
    expectedFocusAsset: "ETH",
    expectedRiskDelta: "positive",
  },
  {
    id: "s15",
    query: "AAPL ve MSFT compare",
    currentRiskProfile: 5,
    expectedIntent: "COMPARE",
    expectedFocusAsset: "AAPL",
    expectedRiskDelta: "any",
  },
]);

function assertRiskDeltaExpectation(
  value: number,
  expectation: z.infer<typeof RiskDeltaExpectationSchema>
): void {
  if (expectation === "any") {
    expect(Number.isFinite(value)).toBe(true);
    return;
  }
  if (expectation === "positive") {
    expect(value).toBeGreaterThan(0.1);
    return;
  }
  if (expectation === "negative") {
    expect(value).toBeLessThan(-0.1);
    return;
  }
  expect(Math.abs(value)).toBeLessThanOrEqual(0.1);
}

describe("DecisionEngineService validation matrix", () => {
  it("validates 15 decision scenarios with typed matrix checks", async () => {
    for (const scenario of decisionValidationMatrix) {
      const result = await decisionEngineService.runDecisionQuery(
        scenario.query,
        scenario.currentRiskProfile
      );
      const validated = ValidationResultSchema.parse({
        intent: result.context.intent,
        focusAssetSymbol: result.focusAssetSymbol,
        riskDensityDelta: result.quant.riskDensityDelta,
      });

      expect(validated.intent).toBe(scenario.expectedIntent);
      expect(validated.focusAssetSymbol).toBe(scenario.expectedFocusAsset);
      assertRiskDeltaExpectation(validated.riskDensityDelta, scenario.expectedRiskDelta);
    }
  });
});
