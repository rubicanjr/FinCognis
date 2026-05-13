import type {
  MarketDataGatewayPort,
  MarketHistory,
  MarketHistoryOptions,
  MarketLiquidityOptions,
  MarketLiquidity,
  MarketQuote,
} from "@/lib/gateways/market-data-gateway";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockLatencyGateway(
  baseGateway: MarketDataGatewayPort,
  delayMs = 26_000
): MarketDataGatewayPort {
  return {
    async getHistory(symbol: string, options: MarketHistoryOptions = {}): Promise<MarketHistory> {
      await sleep(delayMs);
      return baseGateway.getHistory(symbol, options);
    },
    async getQuote(symbol: string): Promise<MarketQuote | null> {
      await sleep(delayMs);
      return baseGateway.getQuote(symbol);
    },
    async getLiquidity(symbol: string, options: MarketLiquidityOptions = {}): Promise<MarketLiquidity> {
      await sleep(delayMs);
      return baseGateway.getLiquidity(symbol, options);
    },
    getSupportedAssets() {
      return baseGateway.getSupportedAssets();
    },
  };
}
