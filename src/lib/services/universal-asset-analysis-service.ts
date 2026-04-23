import { mean, stdDev } from "@/components/tools/correlation/math";
import {
  AssetClass,
  buildDefaultClassDictionary,
  type AssetCatalogItem,
  type NormalizedAsset,
  type UniversalMetrics,
} from "@/components/tools/correlation/universal-asset-comparison";
import {
  marketDataGateway,
  type MarketDataGatewayPort,
  type MarketLiquidity,
} from "@/lib/gateways/market-data-gateway";

interface AnalyzeInputAsset {
  symbol: string;
  originalInput: string;
  class: AssetClass;
}

const classBySymbol = buildDefaultClassDictionary();

function clampMetric(value: number): number {
  return Math.max(1, Math.min(10, Number(value.toFixed(1))));
}

function classFallbackMetrics(assetClass: AssetClass): UniversalMetrics {
  const defaults: Record<AssetClass, UniversalMetrics> = {
    [AssetClass.Equity]: { risk: 6.4, return: 7.1, liquidity: 7.1, diversification: 6.1 },
    [AssetClass.Crypto]: { risk: 3.9, return: 8.4, liquidity: 8.0, diversification: 5.1 },
    [AssetClass.Commodity]: { risk: 5.8, return: 6.3, liquidity: 7.2, diversification: 8.1 },
    [AssetClass.Index]: { risk: 7.2, return: 6.8, liquidity: 9.1, diversification: 8.3 },
    [AssetClass.FX]: { risk: 7.0, return: 5.1, liquidity: 9.2, diversification: 7.2 },
    [AssetClass.Bond]: { risk: 8.1, return: 4.8, liquidity: 6.3, diversification: 8.2 },
    [AssetClass.Fund]: { risk: 7.0, return: 6.2, liquidity: 8.4, diversification: 8.0 },
    [AssetClass.Unknown]: { risk: 5.0, return: 5.0, liquidity: 5.0, diversification: 5.0 },
  };
  return defaults[assetClass];
}

function liquidityScore(liquidity: MarketLiquidity, fallback: number): number {
  const profileScore = 10 - liquidity.profile.liquidationDays * 0.7 - liquidity.profile.marginAddOn * 18;
  const volumeBonus =
    liquidity.volumeBand === "very_high"
      ? 0.8
      : liquidity.volumeBand === "high"
        ? 0.5
        : liquidity.volumeBand === "medium"
          ? 0.2
          : liquidity.volumeBand === "low"
            ? -0.3
            : 0;

  return clampMetric(profileScore + volumeBonus || fallback);
}

function riskReturnScoreFromHistory(
  returns: number[],
  fallback: UniversalMetrics,
  liquidity: MarketLiquidity
): UniversalMetrics {
  if (returns.length < 2) {
    return {
      ...fallback,
      liquidity: liquidityScore(liquidity, fallback.liquidity),
    };
  }

  const volatility = stdDev(returns);
  const avgReturn = mean(returns);
  const risk = clampMetric(10 - volatility * 220);
  const ret = clampMetric(5 + avgReturn * 8000);

  return {
    ...fallback,
    risk,
    return: ret,
    liquidity: liquidityScore(liquidity, fallback.liquidity),
  };
}

function computeDiversification(assetClass: AssetClass, classCount: number, baseScore: number): number {
  const crowdPenalty = Math.max(0, classCount - 1) * 0.9;
  const classBonus = classCount === 1 && assetClass !== AssetClass.Unknown ? 0.8 : 0;
  return clampMetric(baseScore - crowdPenalty + classBonus);
}

function dedupeAssets(assets: AnalyzeInputAsset[]): AnalyzeInputAsset[] {
  return Object.values(
    assets.reduce<Record<string, AnalyzeInputAsset>>((acc, asset) => {
      if (!acc[asset.symbol]) acc[asset.symbol] = asset;
      return acc;
    }, {})
  );
}

function initializeClassCounts(): Record<AssetClass, number> {
  return {
    [AssetClass.Equity]: 0,
    [AssetClass.Crypto]: 0,
    [AssetClass.Commodity]: 0,
    [AssetClass.Index]: 0,
    [AssetClass.FX]: 0,
    [AssetClass.Bond]: 0,
    [AssetClass.Fund]: 0,
    [AssetClass.Unknown]: 0,
  };
}

export function getUniversalAssetCatalog(
  gateway: MarketDataGatewayPort = marketDataGateway
): AssetCatalogItem[] {
  return gateway.getSupportedAssets();
}

export async function analyzeUniversalAssets(
  inputAssets: AnalyzeInputAsset[],
  gateway: MarketDataGatewayPort = marketDataGateway
): Promise<NormalizedAsset[]> {
  const deduped = dedupeAssets(inputAssets);
  const resolvedAssets = deduped.map((asset) => ({
    ...asset,
    symbol: asset.symbol.toUpperCase(),
    resolvedClass: classBySymbol[asset.symbol.toUpperCase()] ?? asset.class,
  }));

  const classCounts = initializeClassCounts();
  resolvedAssets.forEach((asset) => {
    classCounts[asset.resolvedClass] += 1;
  });

  return Promise.all(
    resolvedAssets.map(async (asset) => {
      const [history, liquidity] = await Promise.all([
        gateway.getHistory(asset.symbol, { range: "1y", interval: "1d" }),
        gateway.getLiquidity(asset.symbol),
      ]);
      const resolvedClass = asset.resolvedClass;

      const baseMetrics = classFallbackMetrics(resolvedClass);
      const riskReturnLiquidity = riskReturnScoreFromHistory(history.returns.slice(-252), baseMetrics, liquidity);
      return {
        symbol: asset.symbol,
        originalInput: asset.originalInput,
        class: resolvedClass,
        metrics: {
          ...riskReturnLiquidity,
          diversification: computeDiversification(
            resolvedClass,
            classCounts[resolvedClass] ?? 1,
            riskReturnLiquidity.diversification
          ),
        },
      };
    })
  );
}
