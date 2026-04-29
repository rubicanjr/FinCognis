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
  type MarketHistory,
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
  cryptoCalendarLookbackDays: number;
  minHistoryPoints: number;
}

interface ClassLiquidityThresholds {
  veryHigh: number;
  high: number;
  medium: number;
  low: number;
}

interface RawAssetSeries {
  symbol: string;
  originalInput: string;
  resolvedClass: AssetClass;
  providerSymbol: string;
  historyPoints: number;
  returns: number[];
  riskReturns: number[];
  riskExpectedPoints: number;
  riskQualityRatio: number;
  history: MarketHistory;
  liquidity: MarketLiquidity;
}

interface PreparedRiskReturns {
  values: number[];
  qualityRatio: number;
}

interface UniverseVolatilitySnapshot {
  volatilities: number[];
  computedAtIso: string;
}

interface CacheEntry<TValue> {
  expiresAt: number;
  value: TValue;
}

interface UniverseDistributionResult {
  source: "fresh_cache" | "recomputed" | "stale_cache" | "unavailable";
  volatilities: number[];
}

interface UniverseSharpeDistributionResult {
  source: "fresh_cache" | "recomputed" | "stale_cache" | "unavailable";
  sharpes: number[];
}

interface LiquidityComponents {
  avgDailyVolume: number | null;
  spreadProxy: number | null;
  amihud: number | null;
  qualityRatio: number;
}

interface UniverseLiquiditySnapshot {
  volumes: number[];
  spreads: number[];
  amihuds: number[];
  computedAtIso: string;
}

interface UniverseLiquidityDistributionResult {
  source: "fresh_cache" | "recomputed" | "stale_cache" | "unavailable";
  volumes: number[];
  spreads: number[];
  amihuds: number[];
}

const classBySymbol = buildDefaultClassDictionary();
const MODEL_VERSION = "analysis_engine_v2_quant";
const DEFAULT_RISK_FREE_RATE_ANNUAL = 0.12;
const RISK_UNIVERSE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ENABLE_ANALYSIS_DIAGNOSTICS = process.env.FINCOGNIS_ANALYSIS_DEBUG === "true";
const riskUniverseCache = new Map<string, CacheEntry<UniverseVolatilitySnapshot>>();
const sharpeUniverseCache = new Map<string, CacheEntry<UniverseVolatilitySnapshot>>();
const liquidityUniverseCache = new Map<string, CacheEntry<UniverseLiquiditySnapshot>>();

const HORIZON_CONFIG: Record<AnalyzeTimeHorizon, HorizonSpec> = {
  "1mo": { range: "1mo", lookbackDays: 21, cryptoCalendarLookbackDays: 30, minHistoryPoints: 12 },
  "1y": { range: "1y", lookbackDays: 252, cryptoCalendarLookbackDays: 365, minHistoryPoints: 60 },
  "5y": { range: "5y", lookbackDays: 1260, cryptoCalendarLookbackDays: 1825, minHistoryPoints: 180 },
};

const CLASS_BENCHMARK_UNIVERSE: Record<AssetClass, string[]> = {
  [AssetClass.Equity]: [
    "TUPRS",
    "THYAO",
    "GARAN",
    "KCHOL",
    "ASELS",
    "AKBNK.IS",
    "BIMAS.IS",
    "EREGL.IS",
    "ISCTR.IS",
    "SAHOL.IS",
    "SISE.IS",
    "YKBNK.IS",
    "AAPL",
    "MSFT",
    "NVDA",
    "AMZN",
  ],
  [AssetClass.Crypto]: [
    "BTC",
    "ETH",
    "BNB",
    "SOL",
    "XRP-USD",
    "ADA-USD",
    "DOGE-USD",
    "TRX-USD",
    "AVAX-USD",
    "DOT-USD",
    "LINK-USD",
    "TON-USD",
    "SHIB-USD",
    "LTC-USD",
    "BCH-USD",
    "XLM-USD",
    "UNI-USD",
    "SUI-USD",
    "APT-USD",
    "NEAR-USD",
  ],
  [AssetClass.Commodity]: ["XAU", "XAG", "WTI", "BRENT", "HG=F", "XPTUSD=X"],
  [AssetClass.Index]: ["SPX", "NDX", "BIST30", "SPY", "QQQ", "VTI"],
  [AssetClass.FX]: ["USDTRY", "EURUSD", "GBPUSD=X", "JPYUSD=X", "USDCAD=X", "AUDUSD=X"],
  [AssetClass.Bond]: ["EUROBOND", "^TNX", "^TYX", "IEF", "TLT", "BND"],
  [AssetClass.Fund]: ["SPY", "QQQ", "VTI", "BND", "EEM", "IWM"],
  [AssetClass.Unknown]: [],
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

const CLASS_LIQUIDITY_COMPONENT_WEIGHTS: Record<
  AssetClass,
  { volume: number; spread: number; amihud: number }
> = {
  [AssetClass.Equity]: { volume: 0.4, spread: 0.35, amihud: 0.25 },
  [AssetClass.Crypto]: { volume: 0.4, spread: 0.35, amihud: 0.25 },
  [AssetClass.Commodity]: { volume: 0.3, spread: 0.4, amihud: 0.3 },
  [AssetClass.Index]: { volume: 0.4, spread: 0.35, amihud: 0.25 },
  [AssetClass.FX]: { volume: 0.35, spread: 0.4, amihud: 0.25 },
  [AssetClass.Bond]: { volume: 0.45, spread: 0.3, amihud: 0.25 },
  [AssetClass.Fund]: { volume: 0.45, spread: 0.3, amihud: 0.25 },
  [AssetClass.Unknown]: { volume: 0.4, spread: 0.35, amihud: 0.25 },
};

const CLASS_RISK_FREE_RATE_ANNUAL: Record<AssetClass, number> = {
  [AssetClass.Equity]: 0.37,
  [AssetClass.Crypto]: 0.0,
  [AssetClass.Commodity]: 0.0364,
  [AssetClass.Index]: 0.0364,
  [AssetClass.FX]: 0.0364,
  [AssetClass.Bond]: 0.37,
  [AssetClass.Fund]: 0.0364,
  [AssetClass.Unknown]: DEFAULT_RISK_FREE_RATE_ANNUAL,
};

const CLASS_FALLBACK_METRICS: Record<AssetClass, UniversalMetrics> = {
  [AssetClass.Equity]: { risk: 5.0, return: 6.9, liquidity: null, diversification: 5.9 },
  [AssetClass.Crypto]: { risk: 5.0, return: 7.7, liquidity: null, diversification: 5.0 },
  [AssetClass.Commodity]: { risk: 5.0, return: 6.1, liquidity: null, diversification: 7.7 },
  [AssetClass.Index]: { risk: 5.0, return: 6.3, liquidity: null, diversification: 7.9 },
  [AssetClass.FX]: { risk: 5.0, return: 5.0, liquidity: null, diversification: 7.0 },
  [AssetClass.Bond]: { risk: 5.0, return: 4.6, liquidity: null, diversification: 8.1 },
  [AssetClass.Fund]: { risk: 5.0, return: 6.0, liquidity: null, diversification: 7.8 },
  [AssetClass.Unknown]: { risk: 5.0, return: 5.0, liquidity: null, diversification: 5.0 },
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

function scoreFromVolumeThreshold(volume: number | null, assetClass: AssetClass): number {
  if (volume === null || volume <= 0) return 5;
  const thresholds = CLASS_LIQUIDITY_THRESHOLDS[assetClass] ?? CLASS_LIQUIDITY_THRESHOLDS[AssetClass.Unknown];
  if (volume >= thresholds.veryHigh) return 9.4;
  if (volume >= thresholds.high) return 8.0;
  if (volume >= thresholds.medium) return 6.5;
  if (volume >= thresholds.low) return 5.2;
  return 4.0;
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

function getRiskLookbackDays(assetClass: AssetClass, horizon: HorizonSpec): number {
  return assetClass === AssetClass.Crypto ? horizon.cryptoCalendarLookbackDays : horizon.lookbackDays;
}

function getExpectedRiskPoints(assetClass: AssetClass, horizon: HorizonSpec): number {
  const lookback = getRiskLookbackDays(assetClass, horizon);
  const minimum = assetClass === AssetClass.Crypto ? 20 : 12;
  const ratio = assetClass === AssetClass.Crypto ? 0.75 : 0.55;
  return Math.max(minimum, Math.floor(lookback * ratio));
}

function getExpectedReturnPoints(assetClass: AssetClass, horizon: HorizonSpec): number {
  return getExpectedRiskPoints(assetClass, horizon);
}

function getLiquidityLookbackDays(assetClass: AssetClass, horizon: HorizonSpec): number {
  return getRiskLookbackDays(assetClass, horizon);
}

function getExpectedLiquidityPoints(assetClass: AssetClass, horizon: HorizonSpec): number {
  return getExpectedRiskPoints(assetClass, horizon);
}

function buildUniverseCacheKey(assetClass: AssetClass, horizon: HorizonSpec): string {
  return `universe_volatility:${assetClass}:${horizon.range}:1d`;
}

function buildSharpeUniverseCacheKey(assetClass: AssetClass, horizon: HorizonSpec): string {
  return `universe_sharpe:${assetClass}:${horizon.range}:1d`;
}

function buildLiquidityUniverseCacheKey(assetClass: AssetClass, horizon: HorizonSpec): string {
  return `universe_liquidity:${assetClass}:${horizon.range}:1d`;
}

function percentileRank(universe: number[], value: number): number {
  if (universe.length === 0) return 0.5;
  const below = universe.filter((candidate) => candidate < value).length;
  return below / universe.length;
}

function prepareRiskReturns(
  rawReturns: number[],
  assetClass: AssetClass,
  providerSymbol: string,
  lookbackDays: number,
  expectedPoints: number
): PreparedRiskReturns {
  const sliced = rawReturns.slice(-lookbackDays).filter((value) => Number.isFinite(value));
  const bounded = sliced.filter((value) => value > -0.95 && value < 0.95);

  let filtered = bounded;
  if (assetClass === AssetClass.Equity) {
    filtered = filtered.filter((value) => Math.abs(value) > 1e-8);
  }

  if (assetClass === AssetClass.Commodity && providerSymbol.endsWith("=F")) {
    filtered = filtered.filter((value) => Math.abs(value) <= 0.2);
  }

  const qualityRatio = expectedPoints > 0 ? filtered.length / expectedPoints : 0;
  return { values: filtered, qualityRatio };
}

function prepareReturnSeries(
  rawReturns: number[],
  assetClass: AssetClass,
  providerSymbol: string,
  lookbackDays: number,
  expectedPoints: number
): PreparedRiskReturns {
  return prepareRiskReturns(rawReturns, assetClass, providerSymbol, lookbackDays, expectedPoints);
}

function prepareLiquidityComponents(
  history: MarketHistory,
  assetClass: AssetClass,
  horizon: HorizonSpec
): LiquidityComponents {
  const lookbackDays = getLiquidityLookbackDays(assetClass, horizon);
  const expectedPoints = getExpectedLiquidityPoints(assetClass, horizon);
  const returns = history.returns.slice(-lookbackDays);
  const points = history.points.slice(-(returns.length + 1));

  const volumes: number[] = [];
  const spreads: number[] = [];
  const amihuds: number[] = [];

  const isCommodityFuture = assetClass === AssetClass.Commodity && history.providerSymbol.endsWith("=F");

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    const rawReturn = returns[index - 1];
    if (!Number.isFinite(rawReturn)) continue;

    if (assetClass === AssetClass.Equity && Math.abs(rawReturn) >= 0.095) continue;
    if (isCommodityFuture && Math.abs(rawReturn) >= 0.2) continue;

    const boundedReturn =
      assetClass === AssetClass.Crypto
        ? Math.max(-0.15, Math.min(0.15, rawReturn))
        : rawReturn;

    const close = point.close;
    const volume = point.volume;
    if (typeof volume === "number" && volume > 0) {
      volumes.push(volume);
      const tradedValue = volume * close;
      if (Number.isFinite(tradedValue) && tradedValue > 0) {
        amihuds.push(Math.abs(boundedReturn) / tradedValue);
      }
    }

    if (
      typeof point.high === "number" &&
      typeof point.low === "number" &&
      Number.isFinite(point.high) &&
      Number.isFinite(point.low) &&
      close > 0 &&
      point.high >= point.low
    ) {
      spreads.push((point.high - point.low) / close);
    }
  }

  const avgDailyVolume = volumes.length > 0 ? mean(volumes) : null;
  const spreadProxy = spreads.length > 0 ? mean(spreads) : null;
  const amihud = amihuds.length > 0 ? mean(amihuds) : null;
  const qualityRatio = expectedPoints > 0 ? returns.length / expectedPoints : 0;

  return { avgDailyVolume, spreadProxy, amihud, qualityRatio };
}

function winsorizeSharpe(value: number, assetClass: AssetClass): number {
  if (assetClass !== AssetClass.Crypto) return value;
  return Math.max(-3, Math.min(3, value));
}

async function mapWithConcurrency<TItem, TResult>(
  items: readonly TItem[],
  concurrency: number,
  worker: (item: TItem) => Promise<TResult>
): Promise<TResult[]> {
  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length));
  if (items.length === 0) return [];

  const results: TResult[] = new Array(items.length);
  let cursor = 0;

  async function runWorker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: safeConcurrency }, () => runWorker()));
  return results;
}

function getCachedUniverseVolatilities(key: string, allowStale: boolean): UniverseDistributionResult | null {
  const existing = riskUniverseCache.get(key);
  if (!existing) return null;
  const isFresh = existing.expiresAt > Date.now();
  if (isFresh) {
    return { source: "fresh_cache", volatilities: existing.value.volatilities };
  }
  if (allowStale) {
    return { source: "stale_cache", volatilities: existing.value.volatilities };
  }
  return null;
}

function setUniverseVolatilityCache(key: string, snapshot: UniverseVolatilitySnapshot): void {
  riskUniverseCache.set(key, {
    expiresAt: Date.now() + RISK_UNIVERSE_CACHE_TTL_MS,
    value: snapshot,
  });
}

async function recomputeUniverseVolatilities(
  assetClass: AssetClass,
  horizon: HorizonSpec,
  gateway: MarketDataGatewayPort
): Promise<UniverseVolatilitySnapshot | null> {
  const symbols = Array.from(new Set(CLASS_BENCHMARK_UNIVERSE[assetClass] ?? []));
  if (symbols.length === 0) return null;

  const expectedPoints = getExpectedRiskPoints(assetClass, horizon);
  const lookbackDays = getRiskLookbackDays(assetClass, horizon);
  const computed = await mapWithConcurrency(symbols, 5, async (symbol) => {
    const history = await gateway.getHistory(symbol, { range: horizon.range, interval: "1d" });
    const prepared = prepareRiskReturns(
      history.returns,
      assetClass,
      history.providerSymbol,
      lookbackDays,
      expectedPoints
    );
    if (prepared.values.length < expectedPoints) return null;
    const volatility = stdDev(prepared.values);
    return Number.isFinite(volatility) && volatility > 0 ? volatility : null;
  });
  const volatilities = computed.filter((value): value is number => value !== null);

  if (volatilities.length === 0) return null;
  return {
    volatilities,
    computedAtIso: new Date().toISOString(),
  };
}

async function getUniverseDistribution(
  assetClass: AssetClass,
  horizon: HorizonSpec,
  gateway: MarketDataGatewayPort
): Promise<UniverseDistributionResult> {
  const key = buildUniverseCacheKey(assetClass, horizon);
  const fresh = getCachedUniverseVolatilities(key, false);
  if (fresh) return fresh;

  try {
    const rebuilt = await recomputeUniverseVolatilities(assetClass, horizon, gateway);
    if (rebuilt && rebuilt.volatilities.length >= 5) {
      setUniverseVolatilityCache(key, rebuilt);
      return { source: "recomputed", volatilities: rebuilt.volatilities };
    }
  } catch {
    // Intentional no-op: fallback below covers degraded data mode.
  }

  const stale = getCachedUniverseVolatilities(key, true);
  if (stale) return stale;

  return { source: "unavailable", volatilities: [] };
}

async function recomputeUniverseSharpes(
  assetClass: AssetClass,
  horizon: HorizonSpec,
  gateway: MarketDataGatewayPort,
  riskFreeRateDaily: number
): Promise<UniverseVolatilitySnapshot | null> {
  const symbols = Array.from(new Set(CLASS_BENCHMARK_UNIVERSE[assetClass] ?? []));
  if (symbols.length === 0) return null;

  const expectedPoints = getExpectedReturnPoints(assetClass, horizon);
  const lookbackDays = getRiskLookbackDays(assetClass, horizon);

  const computed = await mapWithConcurrency(symbols, 5, async (symbol) => {
    const history = await gateway.getHistory(symbol, { range: horizon.range, interval: "1d" });
    const prepared = prepareReturnSeries(
      history.returns,
      assetClass,
      history.providerSymbol,
      lookbackDays,
      expectedPoints
    );
    if (prepared.values.length < expectedPoints) return null;
    const sharpeLog = toSharpeLog(prepared.values, riskFreeRateDaily);
    if (sharpeLog === null || !Number.isFinite(sharpeLog)) return null;
    return winsorizeSharpe(sharpeLog, assetClass);
  });

  const sharpes = computed.filter((value): value is number => value !== null);
  if (sharpes.length === 0) return null;
  return {
    volatilities: sharpes,
    computedAtIso: new Date().toISOString(),
  };
}

async function getUniverseSharpeDistribution(
  assetClass: AssetClass,
  horizon: HorizonSpec,
  gateway: MarketDataGatewayPort,
  riskFreeRateDaily: number
): Promise<UniverseSharpeDistributionResult> {
  const key = buildSharpeUniverseCacheKey(assetClass, horizon);
  const fresh = getCachedUniverseVolatilitiesFrom(sharpeUniverseCache, key, false);
  if (fresh) return { source: fresh.source, sharpes: fresh.values };

  try {
    const rebuilt = await recomputeUniverseSharpes(assetClass, horizon, gateway, riskFreeRateDaily);
    if (rebuilt && rebuilt.volatilities.length >= 5) {
      setUniverseVolatilityCacheTo(sharpeUniverseCache, key, rebuilt);
      return { source: "recomputed", sharpes: rebuilt.volatilities };
    }
  } catch {
    // no-op
  }

  const stale = getCachedUniverseVolatilitiesFrom(sharpeUniverseCache, key, true);
  if (stale) return { source: stale.source, sharpes: stale.values };

  return { source: "unavailable", sharpes: [] };
}

function getCachedLiquidityDistribution(
  key: string,
  allowStale: boolean
): UniverseLiquidityDistributionResult | null {
  const existing = liquidityUniverseCache.get(key);
  if (!existing) return null;
  const isFresh = existing.expiresAt > Date.now();
  if (isFresh) {
    return {
      source: "fresh_cache",
      volumes: existing.value.volumes,
      spreads: existing.value.spreads,
      amihuds: existing.value.amihuds,
    };
  }
  if (allowStale) {
    return {
      source: "stale_cache",
      volumes: existing.value.volumes,
      spreads: existing.value.spreads,
      amihuds: existing.value.amihuds,
    };
  }
  return null;
}

function setLiquidityDistributionCache(key: string, snapshot: UniverseLiquiditySnapshot): void {
  liquidityUniverseCache.set(key, {
    expiresAt: Date.now() + RISK_UNIVERSE_CACHE_TTL_MS,
    value: snapshot,
  });
}

async function recomputeUniverseLiquidity(
  assetClass: AssetClass,
  horizon: HorizonSpec,
  gateway: MarketDataGatewayPort
): Promise<UniverseLiquiditySnapshot | null> {
  const symbols = Array.from(new Set(CLASS_BENCHMARK_UNIVERSE[assetClass] ?? []));
  if (symbols.length === 0) return null;

  const computed = await mapWithConcurrency(symbols, 5, async (symbol) => {
    const history = await gateway.getHistory(symbol, { range: horizon.range, interval: "1d" });
    const components = prepareLiquidityComponents(history, assetClass, horizon);
    return components;
  });

  const volumes = computed
    .map((entry) => entry.avgDailyVolume)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const spreads = computed
    .map((entry) => entry.spreadProxy)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const amihuds = computed
    .map((entry) => entry.amihud)
    .filter((value): value is number => typeof value === "number" && value > 0);

  if (volumes.length < 5) return null;
  return {
    volumes,
    spreads,
    amihuds,
    computedAtIso: new Date().toISOString(),
  };
}

async function getUniverseLiquidityDistribution(
  assetClass: AssetClass,
  horizon: HorizonSpec,
  gateway: MarketDataGatewayPort
): Promise<UniverseLiquidityDistributionResult> {
  const key = buildLiquidityUniverseCacheKey(assetClass, horizon);
  const fresh = getCachedLiquidityDistribution(key, false);
  if (fresh) return fresh;

  try {
    const rebuilt = await recomputeUniverseLiquidity(assetClass, horizon, gateway);
    if (rebuilt) {
      setLiquidityDistributionCache(key, rebuilt);
      return {
        source: "recomputed",
        volumes: rebuilt.volumes,
        spreads: rebuilt.spreads,
        amihuds: rebuilt.amihuds,
      };
    }
  } catch {
    // no-op
  }

  const stale = getCachedLiquidityDistribution(key, true);
  if (stale) return stale;

  return { source: "unavailable", volumes: [], spreads: [], amihuds: [] };
}

function logAnalysisDiagnostics(params: {
  symbol: string;
  providerSymbol: string;
  lookbackDays: number;
  historyPoints: number;
  returnsLength: number;
  riskReturnsLength: number;
  riskExpectedPoints: number;
  riskUniverseSize: number;
  riskUniverseSource: UniverseDistributionResult["source"];
  returnUniverseSize: number;
  returnUniverseSource: UniverseSharpeDistributionResult["source"];
  liquidityUniverseVolumeSize: number;
  liquidityUniverseSpreadSize: number;
  liquidityUniverseAmihudSize: number;
  liquidityUniverseSource: UniverseLiquidityDistributionResult["source"];
  liquidityHasPartialData: boolean;
  usingFallback: boolean;
  fallbackReasons: string[];
}): void {
  if (!ENABLE_ANALYSIS_DIAGNOSTICS) return;
  console.info("[analysis_engine_v2_quant]", params);
}

function getCachedUniverseVolatilitiesFrom(
  cache: Map<string, CacheEntry<UniverseVolatilitySnapshot>>,
  key: string,
  allowStale: boolean
): { source: "fresh_cache" | "stale_cache"; values: number[] } | null {
  const existing = cache.get(key);
  if (!existing) return null;
  const isFresh = existing.expiresAt > Date.now();
  if (isFresh) {
    return { source: "fresh_cache", values: existing.value.volatilities };
  }
  if (allowStale) {
    return { source: "stale_cache", values: existing.value.volatilities };
  }
  return null;
}

function setUniverseVolatilityCacheTo(
  cache: Map<string, CacheEntry<UniverseVolatilitySnapshot>>,
  key: string,
  snapshot: UniverseVolatilitySnapshot
): void {
  cache.set(key, {
    expiresAt: Date.now() + RISK_UNIVERSE_CACHE_TTL_MS,
    value: snapshot,
  });
}

function getClassAnnualRiskFreeRate(assetClass: AssetClass, overrideAnnualRiskFree?: number): number {
  if (typeof overrideAnnualRiskFree === "number" && Number.isFinite(overrideAnnualRiskFree)) {
    return overrideAnnualRiskFree;
  }
  return CLASS_RISK_FREE_RATE_ANNUAL[assetClass] ?? DEFAULT_RISK_FREE_RATE_ANNUAL;
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

  const classes = Array.from(new Set(resolvedAssets.map((asset) => asset.resolvedClass)));
  const universeDistributionByClass = new Map<AssetClass, UniverseDistributionResult>();
  const sharpeDistributionByClass = new Map<AssetClass, UniverseSharpeDistributionResult>();
  const liquidityDistributionByClass = new Map<AssetClass, UniverseLiquidityDistributionResult>();
  const universeDistributionList = await Promise.all(
    classes.map(async (assetClass) => ({
      assetClass,
      distribution: await getUniverseDistribution(assetClass, horizon, gateway),
    }))
  );
  universeDistributionList.forEach((item) => {
    universeDistributionByClass.set(item.assetClass, item.distribution);
  });
  const sharpeDistributionList = await Promise.all(
    classes.map(async (assetClass) => {
      const annualRate = getClassAnnualRiskFreeRate(assetClass, options.riskFreeRateAnnual);
      const dailyRate = toDailyRiskFreeRate(annualRate);
      return {
        assetClass,
        distribution: await getUniverseSharpeDistribution(assetClass, horizon, gateway, dailyRate),
      };
    })
  );
  sharpeDistributionList.forEach((item) => {
    sharpeDistributionByClass.set(item.assetClass, item.distribution);
  });
  const liquidityDistributionList = await Promise.all(
    classes.map(async (assetClass) => ({
      assetClass,
      distribution: await getUniverseLiquidityDistribution(assetClass, horizon, gateway),
    }))
  );
  liquidityDistributionList.forEach((item) => {
    liquidityDistributionByClass.set(item.assetClass, item.distribution);
  });

  const series = await Promise.all(
    resolvedAssets.map(async (asset): Promise<RawAssetSeries> => {
      const [history, liquidity] = await Promise.all([
        gateway.getHistory(asset.symbol, { range: horizon.range, interval: "1d" }),
        gateway.getLiquidity(asset.symbol, { range: horizon.range, interval: "1d" }),
      ]);

      const returns = history.returns.slice(-horizon.lookbackDays);
      const riskLookbackDays = getRiskLookbackDays(asset.resolvedClass, horizon);
      const riskExpectedPoints = getExpectedRiskPoints(asset.resolvedClass, horizon);
      const preparedRiskReturns = prepareRiskReturns(
        history.returns,
        asset.resolvedClass,
        history.providerSymbol,
        riskLookbackDays,
        riskExpectedPoints
      );

      return {
        symbol: asset.symbol,
        originalInput: asset.originalInput,
        resolvedClass: asset.resolvedClass,
        providerSymbol: history.providerSymbol,
        historyPoints: history.points.length,
        returns,
        riskReturns: preparedRiskReturns.values,
        riskExpectedPoints,
        riskQualityRatio: preparedRiskReturns.qualityRatio,
        history,
        liquidity,
      };
    })
  );

  return series.map((row, rowIndex) => {
    const fallbackMetrics = classFallbackMetrics(row.resolvedClass);
    const fallbackReasons: string[] = [];
    const riskUniverse = universeDistributionByClass.get(row.resolvedClass) ?? {
      source: "unavailable",
      volatilities: [],
    };
    const returnUniverse = sharpeDistributionByClass.get(row.resolvedClass) ?? {
      source: "unavailable",
      sharpes: [],
    };
    const liquidityUniverse = liquidityDistributionByClass.get(row.resolvedClass) ?? {
      source: "unavailable",
      volumes: [],
      spreads: [],
      amihuds: [],
    };
    const classRiskFreeRateDaily = toDailyRiskFreeRate(
      getClassAnnualRiskFreeRate(row.resolvedClass, options.riskFreeRateAnnual)
    );

    let riskScore = fallbackMetrics.risk;
    let returnScore = fallbackMetrics.return;
    let liquidityScore: number | null = fallbackMetrics.liquidity;
    let diversificationScore = fallbackMetrics.diversification;

    const hasTargetRiskSeries = row.riskReturns.length >= row.riskExpectedPoints;
    const hasUniverseRiskSeries = riskUniverse.volatilities.length >= 5;

    if (hasTargetRiskSeries && hasUniverseRiskSeries) {
      const targetVolatility = stdDev(row.riskReturns);
      const percentile = percentileRank(riskUniverse.volatilities, targetVolatility);
      const percentileScore = 10 - percentile * 9;
      const mdd = maxDrawdown(row.riskReturns);
      const mddPenalty = mdd > 0.2 ? Math.min(4, (mdd - 0.2) * 15) : 0;
      riskScore = clampMetric(percentileScore - mddPenalty);
      if (riskUniverse.source === "stale_cache") {
        fallbackReasons.push("risk_universe_stale_cache");
      }
    } else if (hasUniverseRiskSeries) {
      riskScore = 5.0;
      fallbackReasons.push("risk_target_insufficient_history");
      if (row.riskQualityRatio < 0.6) fallbackReasons.push("risk_low_data_quality");
      if (riskUniverse.source === "stale_cache") {
        fallbackReasons.push("risk_universe_stale_cache");
      }
    } else {
      riskScore = 5.0;
      fallbackReasons.push("risk_data_unavailable");
    }

    const hasTargetReturnSeries = row.riskReturns.length >= row.riskExpectedPoints;
    const hasUniverseReturnSeries = returnUniverse.sharpes.length >= 5;
    if (hasTargetReturnSeries && hasUniverseReturnSeries) {
      const targetSharpe = toSharpeLog(row.riskReturns, classRiskFreeRateDaily);
      if (targetSharpe === null) {
        fallbackReasons.push("return_strength_insufficient_volatility");
      } else {
        const boundedSharpe = winsorizeSharpe(targetSharpe, row.resolvedClass);
        const percentile = percentileRank(returnUniverse.sharpes, boundedSharpe);
        returnScore = clampMetric(1 + percentile * 9);
        if (returnUniverse.source === "stale_cache") {
          fallbackReasons.push("return_universe_stale_cache");
        }
      }
    } else if (hasUniverseReturnSeries) {
      returnScore = 5.0;
      fallbackReasons.push("return_target_insufficient_history");
      if (row.riskQualityRatio < 0.8) fallbackReasons.push("return_low_data_quality");
      if (returnUniverse.source === "stale_cache") {
        fallbackReasons.push("return_universe_stale_cache");
      }
    } else {
      returnScore = 5.0;
      fallbackReasons.push("return_data_unavailable");
    }

    const liquidityComponents = prepareLiquidityComponents(row.history, row.resolvedClass, horizon);
    const volumeReady =
      typeof liquidityComponents.avgDailyVolume === "number" &&
      liquidityComponents.avgDailyVolume > 0 &&
      liquidityUniverse.volumes.length >= 5;
    const spreadReady =
      typeof liquidityComponents.spreadProxy === "number" &&
      liquidityComponents.spreadProxy > 0 &&
      liquidityUniverse.spreads.length >= 5;
    const amihudReady =
      typeof liquidityComponents.amihud === "number" &&
      liquidityComponents.amihud > 0 &&
      liquidityUniverse.amihuds.length >= 5;
    const allLiquidityComponentsReady = volumeReady && spreadReady && amihudReady;
    const hasPartialLiquidity = volumeReady && !allLiquidityComponentsReady;

    if (allLiquidityComponentsReady) {
      const weights =
        CLASS_LIQUIDITY_COMPONENT_WEIGHTS[row.resolvedClass] ??
        CLASS_LIQUIDITY_COMPONENT_WEIGHTS[AssetClass.Unknown];
      const volumePct = percentileRank(liquidityUniverse.volumes, liquidityComponents.avgDailyVolume as number);
      const spreadPct = 1 - percentileRank(liquidityUniverse.spreads, liquidityComponents.spreadProxy as number);
      const amihudPct = 1 - percentileRank(liquidityUniverse.amihuds, liquidityComponents.amihud as number);
      const weighted =
        volumePct * weights.volume + spreadPct * weights.spread + amihudPct * weights.amihud;
      const thresholdScore = scoreFromVolumeThreshold(liquidityComponents.avgDailyVolume, row.resolvedClass);
      const profilePenalty = row.liquidity.profile.liquidationDays * 0.18 + row.liquidity.profile.marginAddOn * 8;
      liquidityScore = clampMetric(weighted * 9 + 1);
      liquidityScore = clampMetric((liquidityScore * 0.85 + thresholdScore * 0.15) - profilePenalty);
      if (liquidityUniverse.source === "stale_cache") {
        fallbackReasons.push("liquidity_universe_stale_cache");
      }
    } else if (hasPartialLiquidity) {
      const volumePct = percentileRank(liquidityUniverse.volumes, liquidityComponents.avgDailyVolume as number);
      liquidityScore = clampMetric(1 + volumePct * 9);
      fallbackReasons.push("liquidity_partial_components_missing");
      if (liquidityUniverse.source === "stale_cache") {
        fallbackReasons.push("liquidity_universe_stale_cache");
      }
    } else {
      liquidityScore = null;
      fallbackReasons.push("liquidity_data_unavailable");
      if (liquidityComponents.qualityRatio < 0.6) {
        fallbackReasons.push("liquidity_low_data_quality");
      }
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

    logAnalysisDiagnostics({
      symbol: row.symbol,
      providerSymbol: row.providerSymbol,
      lookbackDays: getRiskLookbackDays(row.resolvedClass, horizon),
      historyPoints: row.historyPoints,
      returnsLength: row.returns.length,
      riskReturnsLength: row.riskReturns.length,
      riskExpectedPoints: row.riskExpectedPoints,
      riskUniverseSize: riskUniverse.volatilities.length,
      riskUniverseSource: riskUniverse.source,
      returnUniverseSize: returnUniverse.sharpes.length,
      returnUniverseSource: returnUniverse.source,
      liquidityUniverseVolumeSize: liquidityUniverse.volumes.length,
      liquidityUniverseSpreadSize: liquidityUniverse.spreads.length,
      liquidityUniverseAmihudSize: liquidityUniverse.amihuds.length,
      liquidityUniverseSource: liquidityUniverse.source,
      liquidityHasPartialData: hasPartialLiquidity,
      usingFallback: fallbackReasons.length > 0,
      fallbackReasons,
    });

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
