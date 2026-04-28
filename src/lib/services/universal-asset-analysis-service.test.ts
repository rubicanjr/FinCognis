import { describe, expect, it } from "vitest";
import { AssetClass } from "@/components/tools/correlation/universal-asset-comparison";
import type {
  AssetCatalogItem,
  MarketDataGatewayPort,
  MarketHistory,
  MarketHistoryOptions,
  MarketLiquidity,
  MarketLiquidityOptions,
  MarketQuote,
} from "@/lib/gateways/market-data-gateway";
import { analyzeUniversalAssets } from "@/lib/services/universal-asset-analysis-service";

function buildReturns(totalDays: number): number[] {
  const values: number[] = [];
  for (let index = 0; index < totalDays; index += 1) {
    if (index < totalDays - 21) {
      values.push(index % 2 === 0 ? 0.045 : -0.04);
    } else {
      values.push(index % 2 === 0 ? 0.018 : -0.001);
    }
  }
  return values;
}

function buildHistoryFromReturns(symbol: string, providerSymbol: string, returns: number[]): MarketHistory {
  let price = 100;
  const points = [{ date: "2020-01-01", close: price, volume: 1_000_000 }];
  returns.forEach((item, index) => {
    price *= 1 + item;
    points.push({
      date: `2020-01-${String(index + 2).padStart(2, "0")}`,
      close: Number(price.toFixed(6)),
      volume: 1_000_000,
    });
  });

  return {
    symbol,
    providerSymbol,
    points,
    returns,
  };
}

class MockGateway implements MarketDataGatewayPort {
  public readonly historyCalls: Array<{ symbol: string; options: MarketHistoryOptions | undefined }> = [];

  private readonly dataset = buildHistoryFromReturns("TUPRS", "TUPRS.IS", buildReturns(260));

  getSupportedAssets(): AssetCatalogItem[] {
    return [];
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    return {
      symbol,
      providerSymbol: "TUPRS.IS",
      price: 100,
      changePercent: 0,
      volume: 1_000_000,
      currency: "TRY",
      timestampIso: new Date().toISOString(),
    };
  }

  async getHistory(symbol: string, options?: MarketHistoryOptions): Promise<MarketHistory> {
    this.historyCalls.push({ symbol, options });
    return this.dataset;
  }

  async getLiquidity(symbol: string, _options?: MarketLiquidityOptions): Promise<MarketLiquidity> {
    return {
      symbol,
      providerSymbol: "TUPRS.IS",
      avgDailyVolume: 1_000_000,
      volumeBand: "medium",
      profile: {
        liquidationDays: 2,
        marginAddOn: 0.01,
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
  });
});
