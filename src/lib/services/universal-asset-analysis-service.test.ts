import { describe, expect, it } from "vitest";
import { AssetClass } from "@/components/tools/correlation/universal-asset-comparison";
import type {
  MarketDataGatewayPort,
  MarketHistory,
  MarketHistoryOptions,
  MarketLiquidity,
  MarketLiquidityOptions,
  MarketQuote,
} from "@/lib/gateways/market-data-gateway";
import { analyzeUniversalAssets } from "@/lib/services/universal-asset-analysis-service";

function stableHash(value: string): number {
  return value.split("").reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 17), 0);
}

function buildReturns(totalDays: number, amplitude: number): number[] {
  return Array.from({ length: totalDays }, (_, index) => (index % 2 === 0 ? amplitude : -amplitude * 0.82));
}

function buildHistoryFromReturns(symbol: string, providerSymbol: string, returns: number[]): MarketHistory {
  let price = 100;
  const points = [
    {
      date: "2020-01-01",
      close: price,
      adjustedClose: price,
      volume: 1_000_000,
      high: price * 1.01,
      low: price * 0.99,
    },
  ];
  returns.forEach((item, index) => {
    price *= 1 + item;
    points.push({
      date: `2020-01-${String(index + 2).padStart(2, "0")}`,
      close: Number(price.toFixed(6)),
      adjustedClose: Number(price.toFixed(6)),
      volume: 1_000_000,
      high: Number((price * 1.01).toFixed(6)),
      low: Number((price * 0.99).toFixed(6)),
    });
  });

  return {
    symbol,
    providerSymbol,
    points,
    returns,
  };
}

function providerSymbolFor(symbol: string): string {
  return symbol === "TUPRS" ? "TUPRS.IS" : symbol;
}

class MockGateway implements MarketDataGatewayPort {
  public readonly historyCalls: Array<{ symbol: string; options: MarketHistoryOptions | undefined }> = [];

  getSupportedAssets() {
    return [];
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    return {
      symbol,
      providerSymbol: providerSymbolFor(symbol),
      price: 100,
      changePercent: 0,
      volume: 1_000_000,
      currency: "TRY",
      timestampIso: new Date().toISOString(),
    };
  }

  async getHistory(symbol: string, options?: MarketHistoryOptions): Promise<MarketHistory> {
    this.historyCalls.push({ symbol, options });
    const range = options?.range ?? "1y";
    const totalDays = range === "1mo" ? 30 : range === "5y" ? 1825 : 365;
    const symbolSeed = (stableHash(symbol) % 7) + 1;
    const baseAmplitude = symbol === "TUPRS" ? (range === "1mo" ? 0.009 : 0.033) : symbolSeed * 0.0045;
    const returns = buildReturns(totalDays, baseAmplitude);
    return buildHistoryFromReturns(symbol, providerSymbolFor(symbol), returns);
  }

  async getLiquidity(symbol: string, _options?: MarketLiquidityOptions): Promise<MarketLiquidity> {
    return {
      symbol,
      providerSymbol: providerSymbolFor(symbol),
      avgDailyVolume: 1_000_000,
      volumeBand: "medium",
      profile: {
        liquidationDays: 2,
        marginAddOn: 0.01,
        slippageMultiplier: 1.1,
      },
    };
  }
}

class SparseDataGateway implements MarketDataGatewayPort {
  getSupportedAssets() {
    return [];
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    return {
      symbol,
      providerSymbol: symbol === "XAU" ? "XAUUSD=X" : `${symbol}.IS`,
      price: 100,
      changePercent: 0,
      volume: null,
      currency: "USD",
      timestampIso: new Date().toISOString(),
    };
  }

  async getHistory(symbol: string, _options?: MarketHistoryOptions): Promise<MarketHistory> {
    const providerSymbol = symbol === "XAU" ? "XAUUSD=X" : `${symbol}.IS`;
    return {
      symbol,
      providerSymbol,
      points: [],
      returns: [],
    };
  }

  async getLiquidity(symbol: string, _options?: MarketLiquidityOptions): Promise<MarketLiquidity> {
    return {
      symbol,
      providerSymbol: symbol === "XAU" ? "XAUUSD=X" : `${symbol}.IS`,
      avgDailyVolume: null,
      volumeBand: "unknown",
      profile: {
        liquidationDays: 5,
        marginAddOn: 0.02,
        slippageMultiplier: 1.2,
      },
    };
  }
}

describe("analyzeUniversalAssets", () => {
  it("passes selected time horizon to gateway history calls", async () => {
    const gateway = new MockGateway();

    await analyzeUniversalAssets(
      [{ symbol: "TUPRS", originalInput: "TUPRS", class: AssetClass.Equity }],
      gateway,
      { timeHorizon: "1mo" }
    );

    expect(gateway.historyCalls.length).toBeGreaterThan(0);
    expect(gateway.historyCalls[0]?.options?.range).toBe("1mo");
  });

  it("changes risk and return scores when horizon changes", async () => {
    const gateway = new MockGateway();
    const input = [{ symbol: "TUPRS", originalInput: "TUPRS", class: AssetClass.Equity }];

    const oneMonth = await analyzeUniversalAssets(input, gateway, { timeHorizon: "1mo" });
    const oneYear = await analyzeUniversalAssets(input, gateway, { timeHorizon: "1y" });

    expect(oneMonth[0].metrics.risk).not.toBe(oneYear[0].metrics.risk);
    expect(oneMonth[0].metrics.return).not.toBe(oneYear[0].metrics.return);
    expect(oneMonth[0].metrics.calmness).not.toBeNull();
    expect(oneYear[0].metrics.calmness).not.toBeNull();
    expect(oneMonth[0].metrics.calmness).not.toBe(oneYear[0].metrics.calmness);
  });

  it("marks alpha as statistically insignificant when asset equals benchmark", async () => {
    const gateway = new MockGateway();
    const input = [{ symbol: "SPY", originalInput: "SPY", class: AssetClass.Fund }];

    const analyzed = await analyzeUniversalAssets(input, gateway, { timeHorizon: "1y" });
    expect(analyzed[0].computation?.fallbackReasons).toContain("alpha_not_statistically_significant");
  });

  it("never returns null metrics when data sources are sparse", async () => {
    const gateway = new SparseDataGateway();
    const input = [
      { symbol: "TUPRS", originalInput: "TUPRS", class: AssetClass.Equity },
      { symbol: "XAU", originalInput: "XAU", class: AssetClass.Commodity },
      { symbol: "BTC", originalInput: "BTC", class: AssetClass.Crypto },
    ];

    const analyzed = await analyzeUniversalAssets(input, gateway, { timeHorizon: "1y", analysisMode: "compare" });

    analyzed.forEach((asset) => {
      expect(asset.metrics.risk).toBeTypeOf("number");
      expect(asset.metrics.return).toBeTypeOf("number");
      expect(asset.metrics.liquidity).not.toBeNull();
      expect(asset.metrics.diversification).toBeTypeOf("number");
      expect(asset.metrics.calmness).not.toBeNull();
    });
  });

  it("adds null-safe short-term technical momentum criteria score without fabricating sparse data", async () => {
    const sparseGateway = new SparseDataGateway();
    const sparse = await analyzeUniversalAssets(
      [{ symbol: "TUPRS", originalInput: "TUPRS", class: AssetClass.Equity }],
      sparseGateway,
      { timeHorizon: "1mo", analysisMode: "compare" }
    );

    expect(sparse[0].criteriaScores?.teknik_momentum).toMatchObject({
      id: "teknik_momentum",
      score: null,
      rawScore: null,
      available: false,
      source: "market_history",
      missing: ["rsi", "macd", "sma", "atr", "earnings", "kap"],
    });
    expect(sparse[0].criteriaScores?.kurumsal_akis?.score).toBeTypeOf("number");
    expect(sparse[0].criteriaScores?.kurumsal_akis?.source).toBe("price-volume-proxy");
    expect(sparse[0].criteriaScores?.katalizor_takvimi?.score).toBeTypeOf("number");
    expect(sparse[0].criteriaScores?.katalizor_takvimi?.source).toBe("estimate");

    const gateway = new MockGateway();
    const analyzed = await analyzeUniversalAssets(
      [{ symbol: "TUPRS", originalInput: "TUPRS", class: AssetClass.Equity }],
      gateway,
      { timeHorizon: "1mo", analysisMode: "compare" }
    );

    expect(analyzed[0].criteriaScores?.teknik_momentum?.score).toBeTypeOf("number");
    expect(analyzed[0].criteriaScores?.teknik_momentum?.available).toBe(true);
    expect(analyzed[0].metrics.return).toBeTypeOf("number");
  });

  it("adds null-safe long-term criteria scores and only shows BIST-specific criterion for BIST equities", async () => {
    const sparseGateway = new SparseDataGateway();
    const sparse = await analyzeUniversalAssets(
      [{ symbol: "TUPRS", originalInput: "TUPRS", class: AssetClass.Equity }],
      sparseGateway,
      { timeHorizon: "1y", analysisMode: "compare" }
    );

    expect(sparse[0].criteriaScores?.kazanc_kalitesi).toMatchObject({
      id: "kazanc_kalitesi",
      available: true,
      source: "estimate",
    });
    expect(sparse[0].criteriaScores?.sermaye_tahsisi).toMatchObject({
      id: "sermaye_tahsisi",
      available: true,
      source: "estimate",
    });
    expect(sparse[0].criteriaScores?.degerleme).toMatchObject({
      id: "degerleme",
      available: true,
      source: "estimate",
    });
    expect(sparse[0].criteriaScores?.bist_ozgu).toMatchObject({
      id: "bist_ozgu",
      available: true,
      source: "proxy",
    });

    const gateway = new MockGateway();
    const analyzedBist = await analyzeUniversalAssets(
      [{ symbol: "TUPRS", originalInput: "TUPRS", class: AssetClass.Equity }],
      gateway,
      { timeHorizon: "1y", analysisMode: "compare" }
    );
    expect(analyzedBist[0].criteriaScores?.kazanc_kalitesi?.score).toBeTypeOf("number");
    expect(analyzedBist[0].criteriaScores?.sermaye_tahsisi?.score).toBeTypeOf("number");
    expect(analyzedBist[0].criteriaScores?.degerleme?.score).toBeTypeOf("number");
    expect(analyzedBist[0].criteriaScores?.bist_ozgu).toBeDefined();

    const analyzedUs = await analyzeUniversalAssets(
      [{ symbol: "AAPL", originalInput: "AAPL", class: AssetClass.Equity }],
      gateway,
      { timeHorizon: "1y", analysisMode: "compare" }
    );
    expect(analyzedUs[0].criteriaScores?.kazanc_kalitesi?.score).toBeTypeOf("number");
    expect(analyzedUs[0].criteriaScores?.sermaye_tahsisi?.score).toBeTypeOf("number");
    expect(analyzedUs[0].criteriaScores?.degerleme?.score).toBeTypeOf("number");
    expect(analyzedUs[0].criteriaScores?.bist_ozgu).toBeUndefined();
  });
});
