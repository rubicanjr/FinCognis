import { correlation, mean, stdDev } from "@/components/tools/correlation/math";
import {
  AssetClass,
  buildDefaultClassDictionary,
  type AnalyzeTimeHorizon,
  type AssetCatalogItem,
  type NormalizedAsset,
  type UniversalMetrics,
} from "@/components/tools/correlation/universal-asset-comparison";
import {
  marketDataGateway,
  type MarketDataGatewayPort,
  type MarketHistoryRange,
  type MarketLiquidity,
} from "@/lib/gateways/market-data-gateway";

interface AnalyzeInputAsset {
  symbol: string;
  originalInput: string;
  class: AssetClass;
}

interface AnalyzeUniversalAssetsOptions {
  timeHorizon?: AnalyzeTimeHorizon;
  riskFreeRateAnnual?: number;
}

interface HorizonSpec {
  range: MarketHistoryRange;
  lookbackDays: number;
  minHistoryPoints: number;
}

interface ClassLiquidityThresholds {
  veryHigh: number;
  high: number;
  medium: number;
  low: number;
}

interface ClassStatBaseline {
  volatilityMean: number;
  volatilityStd: number;
  sharpeLogMean: number;
  sharpeLogStd: number;
}

interface RawAssetSeries {
  symbol: string;
  originalInput: string;
  resolvedClass: AssetClass;
  returns: number[];
  liquidity: MarketLiquidity;
}

const classBySymbol = buildDefaultClassDictionary();
const MODEL_VERSION = "analysis_engine_v2_quant";
const DEFAULT_RISK_FREE_RATE_ANNUAL = 0.12;

const HORIZON_CONFIG: Record<AnalyzeTimeHorizon, HorizonSpec> = {
  "1mo": { range: "1mo", lookbackDays: 21, minHistoryPoints: 12 },
  "1y": { range: "1y", lookbackDays: 252, minHistoryPoints: 60 },
  "5y": { range: "5y", lookbackDays: 1260, minHistoryPoints: 180 },
};

const CLASS_LIQUIDITY_THRESHOLDS: Record<AssetClass, ClassLiquidityThresholds> = {
  [AssetClass.Equity]: { veryHigh: 80_000_000, high: 20_000_000, medium: 2_000_000, low: 500_000 },
  [AssetClass.Crypto]: { veryHigh: 1_500_000_000, high: 400_000_000, medium: 150_000_000, low: 80_000_000 },
  [AssetClass.Commodity]: { veryHigh: 120_000_000, high: 30_000_000, medium: 5_000_000, low: 1_000_000 },
  [AssetClass.Index]: { veryHigh: 150_000_000, high: 40_000_000, medium: 8_000_000, low: 2_000_000 },
  [AssetClass.FX]: { veryHigh: 250_000_000, high: 80_000_000, medium: 15_000_000, low: 3_000_000 },
  [AssetClass.Bond]: { veryHigh: 90_000_000, high: 20_000_000, medium: 4_000_000, low: 1_000_000 },
  [AssetClass.Fund]: { veryHigh: 100_000_000, high: 25_000_000, medium: 4_000_000, low: 1_000_000 },
  [AssetClass.Unknown]: { veryHigh: 80_000_000, high: 20_000_000, medium: 2_000_000, low: 500_000 },
};

const CLASS_STAT_BASELINES: Record<AssetClass, ClassStatBaseline> = {
  [AssetClass.Equity]: { volatilityMean: 0.018, volatilityStd: 0.008, sharpeLogMean: 0.1, sharpeLogStd: 0.55 },
  [AssetClass.Crypto]: { volatilityMean: 0.045, volatilityStd: 0.02, sharpeLogMean: 0.05, sharpeLogStd: 0.75 },
  [AssetClass.Commodity]: { volatilityMean: 0.015, volatilityStd: 0.007, sharpeLogMean: 0.08, sharpeLogStd: 0.5 },
  [AssetClass.Index]: { volatilityMean: 0.012, volatilityStd: 0.006, sharpeLogMean: 0.1, sharpeLogStd: 0.45 },
  [AssetClass.FX]: { volatilityMean: 0.009, volatilityStd: 0.004, sharpeLogMean: 0.06, sharpeLogStd: 0.4 },
  [AssetClass.Bond]: { volatilityMean: 0.007, volatilityStd: 0.003, sharpeLogMean: 0.04, sharpeLogStd: 0.35 },
  [AssetClass.Fund]: { volatilityMean: 0.011, volatilityStd: 0.005, sharpeLogMean: 0.08, sharpeLogStd: 0.45 },
  [AssetClass.Unknown]: { volatilityMean: 0.015, volatilityStd: 0.007, sharpeLogMean: 0.07, sharpeLogStd: 0.5 },
};

const CLASS_FALLBACK_METRICS: Record<AssetClass, UniversalMetrics> = {
  [AssetClass.Equity]: { risk: 6.1, return: 6.9, liquidity: 7.1, diversification: 5.9 },
  [AssetClass.Crypto]: { risk: 3.8, return: 7.7, liquidity: 6.4, diversification: 5.0 },
  [AssetClass.Commodity]: { risk: 5.9, return: 6.1, liquidity: 6.8, diversification: 7.7 },
  [AssetClass.Index]: { risk: 7.4, return: 6.3, liquidity: 8.6, diversification: 7.9 },
  [AssetClass.FX]: { risk: 7.2, return: 5.0, liquidity: 8.8, diversification: 7.0 },
  [AssetClass.Bond]: { risk: 8.0, return: 4.6, liquidity: 6.0, diversification: 8.1 },
  [AssetClass.Fund]: { risk: 6.9, return: 6.0, liquidity: 7.9, diversification: 7.8 },
  [AssetClass.Unknown]: { risk: 5.0, return: 5.0, liquidity: 5.0, diversification: 5.0 },
};

const CLASS_DISTANCE_MATRIX: Record<AssetClass, Record<AssetClass, number>> = {
  [AssetClass.Equity]: {
    [AssetClass.Equity]: 0.15,
    [AssetClass.Crypto]: 0.72,
    [AssetClass.Commodity]: 0.64,
    [AssetClass.Index]: 0.32,
    [AssetClass.FX]: 0.58,
    [AssetClass.Bond]: 0.68,
    [AssetClass.Fund]: 0.28,
    [AssetClass.Unknown]: 0.35,
  },
  [AssetClass.Crypto]: {
    [AssetClass.Equity]: 0.72,
    [AssetClass.Crypto]: 0.18,
    [AssetClass.Commodity]: 0.6,
    [AssetClass.Index]: 0.63,
    [AssetClass.FX]: 0.55,
    [AssetClass.Bond]: 0.74,
    [AssetClass.Fund]: 0.5,
    [AssetClass.Unknown]: 0.4,
  },
  [AssetClass.Commodity]: {
    [AssetClass.Equity]: 0.64,
    [AssetClass.Crypto]: 0.6,
    [AssetClass.Commodity]: 0.2,
    [AssetClass.Index]: 0.55,
    [AssetClass.FX]: 0.5,
    [AssetClass.Bond]: 0.58,
    [AssetClass.Fund]: 0.52,
    [AssetClass.Unknown]: 0.38,
  },
  [AssetClass.Index]: {
    [AssetClass.Equity]: 0.32,
    [AssetClass.Crypto]: 0.63,
    [AssetClass.Commodity]: 0.55,
    [AssetClass.Index]: 0.2,
    [AssetClass.FX]: 0.52,
    [AssetClass.Bond]: 0.62,
    [AssetClass.Fund]: 0.25,
    [AssetClass.Unknown]: 0.34,
  },
  [AssetClass.FX]: {
    [AssetClass.Equity]: 0.58,
    [AssetClass.Crypto]: 0.55,
    [AssetClass.Commodity]: 0.5,
    [AssetClass.Index]: 0.52,
    [AssetClass.FX]: 0.18,
    [AssetClass.Bond]: 0.48,
    [AssetClass.Fund]: 0.46,
    [AssetClass.Unknown]: 0.3,
  },
  [AssetClass.Bond]: {
    [AssetClass.Equity]: 0.68,
    [AssetClass.Crypto]: 0.74,
    [AssetClass.Commodity]: 0.58,
    [AssetClass.Index]: 0.62,
    [AssetClass.FX]: 0.48,
    [AssetClass.Bond]: 0.18,
    [AssetClass.Fund]: 0.5,
    [AssetClass.Unknown]: 0.33,
  },
  [AssetClass.Fund]: {
    [AssetClass.Equity]: 0.28,
    [AssetClass.Crypto]: 0.5,
    [AssetClass.Commodity]: 0.52,
    [AssetClass.Index]: 0.25,
    [AssetClass.FX]: 0.46,
    [AssetClass.Bond]: 0.5,
    [AssetClass.Fund]: 0.2,
    [AssetClass.Unknown]: 0.32,
  },
  [AssetClass.Unknown]: {
    [AssetClass.Equity]: 0.35,
    [AssetClass.Crypto]: 0.4,
    [AssetClass.Commodity]: 0.38,
    [AssetClass.Index]: 0.34,
    [AssetClass.FX]: 0.3,
    [AssetClass.Bond]: 0.33,
    [AssetClass.Fund]: 0.32,
    [AssetClass.Unknown]: 0.25,
  },
};

function clampMetric(value: number): number {
  return Math.max(1, Math.min(10, Number(value.toFixed(1))));
}

function dedupeAssets(assets: AnalyzeInputAsset[]): AnalyzeInputAsset[] {
  return Object.values(
    assets.reduce<Record<string, AnalyzeInputAsset>>((acc, asset) => {
      if (!acc[asset.symbol]) acc[asset.symbol] = asset;
      return acc;
    }, {})
  );
}

function maxDrawdown(returns: number[]): number {
  if (returns.length === 0) return 0;
  let peak = 1;
  let wealth = 1;
  let drawdown = 0;

  for (const r of returns) {
    wealth *= 1 + r;
    if (wealth > peak) peak = wealth;
    const dd = (peak - wealth) / peak;
    if (dd > drawdown) drawdown = dd;
  }
  return drawdown;
}

function toSharpeLog(returns: number[], riskFreeRateDaily: number): number | null {
  if (returns.length < 2) return null;
  const vol = stdDev(returns);
  if (vol <= 1e-8) return null;
  const avg = mean(returns);
  const sharpeLike = (avg - riskFreeRateDaily) / vol;
  return Math.sign(sharpeLike) * Math.log1p(Math.abs(sharpeLike));
}

function computeZScore(value: number, values: number[], baselineMean: number, baselineStd: number): number {
  const localMean = values.length >= 2 ? mean(values) : baselineMean;
  const localStd = values.length >= 2 ? Math.max(stdDev(values), 1e-6) : Math.max(baselineStd, 1e-6);
  return (value - localMean) / localStd;
}

function scoreFromVolumeThreshold(volume: number | null, assetClass: AssetClass): number {
  if (volume === null || volume <= 0) return 5;
  const thresholds = CLASS_LIQUIDITY_THRESHOLDS[assetClass] ?? CLASS_LIQUIDITY_THRESHOLDS[AssetClass.Unknown];
  if (volume >= thresholds.veryHigh) return 9.4;
  if (volume >= thresholds.high) return 8.0;
  if (volume >= thresholds.medium) return 6.5;
  if (volume >= thresholds.low) return 5.2;
  return 4.0;
}

function volumeRankScore(volume: number | null, classVolumes: number[]): number {
  if (volume === null || volume <= 0) return 5;
  const filtered = classVolumes.filter((value) => value > 0);
  if (filtered.length < 2) return 5;
  const sorted = [...filtered].sort((left, right) => left - right);
  const index = sorted.findIndex((value) => value >= volume);
  const boundedIndex = index === -1 ? sorted.length - 1 : index;
  const percentile = boundedIndex / (sorted.length - 1);
  return 1 + percentile * 9;
}

function diversificationFallbackByClassDistance(assetClass: AssetClass, allClasses: AssetClass[]): number {
  const peers = allClasses.filter((peer) => peer !== assetClass);
  if (peers.length === 0) return CLASS_FALLBACK_METRICS[assetClass].diversification;
  const avgDistance = mean(
    peers.map((peer) => CLASS_DISTANCE_MATRIX[assetClass][peer] ?? CLASS_DISTANCE_MATRIX[assetClass][AssetClass.Unknown])
  );
  return clampMetric(1 + avgDistance * 9);
}

function classFallbackMetrics(assetClass: AssetClass): UniversalMetrics {
  return CLASS_FALLBACK_METRICS[assetClass] ?? CLASS_FALLBACK_METRICS[AssetClass.Unknown];
}

function getHorizonSpec(timeHorizon: AnalyzeTimeHorizon | undefined): HorizonSpec {
  const key = timeHorizon ?? "1y";
  return HORIZON_CONFIG[key];
}

function toDailyRiskFreeRate(annualRate: number): number {
  return (1 + annualRate) ** (1 / 252) - 1;
}

export function getUniversalAssetCatalog(
  gateway: MarketDataGatewayPort = marketDataGateway
): AssetCatalogItem[] {
  return gateway.getSupportedAssets();
}

export async function analyzeUniversalAssets(
  inputAssets: AnalyzeInputAsset[],
  gateway: MarketDataGatewayPort = marketDataGateway,
  options: AnalyzeUniversalAssetsOptions = {}
): Promise<NormalizedAsset[]> {
  const deduped = dedupeAssets(inputAssets);
  const resolvedAssets = deduped.map((asset) => ({
    ...asset,
    symbol: asset.symbol.toUpperCase(),
    resolvedClass: classBySymbol[asset.symbol.toUpperCase()] ?? asset.class,
  }));

  const horizonKey = options.timeHorizon ?? "1y";
  const horizon = getHorizonSpec(horizonKey);
  const riskFreeRateDaily = toDailyRiskFreeRate(options.riskFreeRateAnnual ?? DEFAULT_RISK_FREE_RATE_ANNUAL);

  const series = await Promise.all(
    resolvedAssets.map(async (asset): Promise<RawAssetSeries> => {
      const [history, liquidity] = await Promise.all([
        gateway.getHistory(asset.symbol, { range: horizon.range, interval: "1d" }),
        gateway.getLiquidity(asset.symbol, { range: horizon.range, interval: "1d" }),
      ]);

      const returns = history.returns.slice(-horizon.lookbackDays);
      return {
        symbol: asset.symbol,
        originalInput: asset.originalInput,
        resolvedClass: asset.resolvedClass,
        returns,
        liquidity,
      };
    })
  );

  const volatilityByClass = new Map<AssetClass, number[]>();
  const sharpeLogByClass = new Map<AssetClass, number[]>();
  const volumeByClass = new Map<AssetClass, number[]>();

  series.forEach((row) => {
    const classVols = volatilityByClass.get(row.resolvedClass) ?? [];
    const classSharpe = sharpeLogByClass.get(row.resolvedClass) ?? [];
    const classVolumes = volumeByClass.get(row.resolvedClass) ?? [];

    if (row.returns.length >= horizon.minHistoryPoints) {
      classVols.push(stdDev(row.returns));
      const sharpeLog = toSharpeLog(row.returns, riskFreeRateDaily);
      if (sharpeLog !== null) classSharpe.push(sharpeLog);
    }

    if (typeof row.liquidity.avgDailyVolume === "number" && row.liquidity.avgDailyVolume > 0) {
      classVolumes.push(row.liquidity.avgDailyVolume);
    }

    volatilityByClass.set(row.resolvedClass, classVols);
    sharpeLogByClass.set(row.resolvedClass, classSharpe);
    volumeByClass.set(row.resolvedClass, classVolumes);
  });

  return series.map((row, rowIndex) => {
    const fallbackMetrics = classFallbackMetrics(row.resolvedClass);
    const fallbackReasons: string[] = [];
    const classBaseline = CLASS_STAT_BASELINES[row.resolvedClass] ?? CLASS_STAT_BASELINES[AssetClass.Unknown];

    let riskScore = fallbackMetrics.risk;
    let returnScore = fallbackMetrics.return;
    let liquidityScore = fallbackMetrics.liquidity;
    let diversificationScore = fallbackMetrics.diversification;

    if (row.returns.length >= horizon.minHistoryPoints) {
      const volatility = stdDev(row.returns);
      const classVols = volatilityByClass.get(row.resolvedClass) ?? [];
      const volZ = computeZScore(volatility, classVols, classBaseline.volatilityMean, classBaseline.volatilityStd);
      const mdd = maxDrawdown(row.returns);
      const mddPenalty = mdd > 0.2 ? Math.min(4, (mdd - 0.2) * 15) : 0;
      riskScore = clampMetric(10 - volZ * 1.8 - mddPenalty);

      const sharpeLog = toSharpeLog(row.returns, riskFreeRateDaily);
      if (sharpeLog === null) {
        fallbackReasons.push("return_strength_insufficient_volatility");
      } else {
        const classSharpe = sharpeLogByClass.get(row.resolvedClass) ?? [];
        const sharpeZ = computeZScore(sharpeLog, classSharpe, classBaseline.sharpeLogMean, classBaseline.sharpeLogStd);
        returnScore = clampMetric(5 + sharpeZ * 1.9);
      }
    } else {
      fallbackReasons.push("risk_return_insufficient_history");
    }

    const classVolumes = volumeByClass.get(row.resolvedClass) ?? [];
    const thresholdScore = scoreFromVolumeThreshold(row.liquidity.avgDailyVolume, row.resolvedClass);
    const rankScore = volumeRankScore(row.liquidity.avgDailyVolume, classVolumes);
    const profilePenalty = row.liquidity.profile.liquidationDays * 0.22 + row.liquidity.profile.marginAddOn * 12;
    liquidityScore = clampMetric(thresholdScore * 0.55 + rankScore * 0.45 - profilePenalty);
    if ((row.liquidity.avgDailyVolume ?? 0) <= 0) {
      fallbackReasons.push("liquidity_missing_volume");
      liquidityScore = clampMetric((liquidityScore + fallbackMetrics.liquidity) / 2);
    }

    const peerCorrelations: number[] = [];
    for (let peerIndex = 0; peerIndex < series.length; peerIndex += 1) {
      if (peerIndex === rowIndex) continue;
      const peer = series[peerIndex];
      const commonSize = Math.min(row.returns.length, peer.returns.length, horizon.lookbackDays);
      if (commonSize < horizon.minHistoryPoints) continue;

      const left = row.returns.slice(-commonSize);
      const right = peer.returns.slice(-commonSize);
      const corr = correlation(left, right);
      if (Number.isFinite(corr)) peerCorrelations.push(corr);
    }

    if (peerCorrelations.length > 0) {
      const avgCorrelation = mean(peerCorrelations);
      diversificationScore = clampMetric(10 - avgCorrelation * 10);
    } else {
      fallbackReasons.push("diversification_insufficient_history");
      diversificationScore = diversificationFallbackByClassDistance(
        row.resolvedClass,
        series.map((item) => item.resolvedClass)
      );
    }

    return {
      symbol: row.symbol,
      originalInput: row.originalInput,
      class: row.resolvedClass,
      metrics: {
        risk: riskScore,
        return: returnScore,
        liquidity: liquidityScore,
        diversification: diversificationScore,
      },
      computation: {
        isFallback: fallbackReasons.length > 0,
        fallbackReasons,
        modelVersion: MODEL_VERSION,
        timeHorizon: horizonKey,
      },
    };
  });
}
