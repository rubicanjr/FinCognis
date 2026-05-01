import { correlation, covariance, mean, stdDev, variance } from "@/components/tools/correlation/math";
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
  analysisMode?: "compare" | "discover";
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
  returnReturns: number[];
  riskPrices: number[];
  riskExpectedPoints: number;
  riskQualityRatio: number;
  returnExpectedPoints: number;
  returnQualityRatio: number;
  history: MarketHistory;
  liquidity: MarketLiquidity;
  returnsByDate: Record<string, number>;
}

interface PreparedRiskReturns {
  values: number[];
  qualityRatio: number;
}

interface PreparedRiskPrices {
  values: number[];
  qualityRatio: number;
}

interface SharpeComputationResult {
  annualSharpe: number;
  dailySharpe: number;
  meanExcessReturn: number;
  stdExcessReturn: number;
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

interface UniverseCalmnessSnapshot {
  volatilities: number[];
  computedAtIso: string;
}

interface UniverseCalmnessDistributionResult {
  source: "fresh_cache" | "recomputed" | "stale_cache" | "unavailable";
  volatilities: number[];
}

interface UniverseRealReturnSnapshot {
  values: number[];
  computedAtIso: string;
  medianNegative: boolean;
}

interface UniverseRealReturnDistributionResult {
  source: "fresh_cache" | "recomputed" | "stale_cache" | "unavailable";
  values: number[];
  medianNegative: boolean;
}

type DiversificationMode = "contextual" | "absolute";
type MarketRegime = "normal" | "transition" | "crisis";

interface UniverseDiversificationSnapshot {
  scores: number[];
  computedAtIso: string;
}

interface UniverseDiversificationDistributionResult {
  source: "fresh_cache" | "recomputed" | "stale_cache" | "unavailable";
  scores: number[];
}

interface InflationPoint {
  date: string;
  monthlyRate: number;
}

interface InflationSnapshot {
  points: InflationPoint[];
  estimatedLastMonth: boolean;
}

const classBySymbol = buildDefaultClassDictionary();
const MODEL_VERSION = "analysis_engine_v2_quant";
const DEFAULT_RISK_FREE_RATE_ANNUAL = 0.12;
const RISK_UNIVERSE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ENABLE_ANALYSIS_DIAGNOSTICS = process.env.FINCOGNIS_ANALYSIS_DEBUG === "true";
const riskUniverseCache = new Map<string, CacheEntry<UniverseVolatilitySnapshot>>();
const sharpeUniverseCache = new Map<string, CacheEntry<UniverseVolatilitySnapshot>>();
const liquidityUniverseCache = new Map<string, CacheEntry<UniverseLiquiditySnapshot>>();
const diversificationUniverseCache = new Map<string, CacheEntry<UniverseDiversificationSnapshot>>();
const calmnessUniverseCache = new Map<string, CacheEntry<UniverseCalmnessSnapshot>>();
const inflationCache = new Map<string, CacheEntry<InflationSnapshot>>();
const realReturnUniverseCache = new Map<string, CacheEntry<UniverseRealReturnSnapshot>>();

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

const CLASS_MEDIAN_CORRELATION: Record<AssetClass, number> = {
  [AssetClass.Equity]: 0.75,
  [AssetClass.Crypto]: 0.65,
  [AssetClass.Commodity]: 0.1,
  [AssetClass.Index]: 0.8,
  [AssetClass.FX]: -0.2,
  [AssetClass.Bond]: 0.35,
  [AssetClass.Fund]: 0.8,
  [AssetClass.Unknown]: 0.5,
};

const REGIME_MULTIPLIERS: Record<MarketRegime, number> = {
  normal: 1.0,
  transition: 0.85,
  crisis: 0.7,
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

const RETURN_MIN_POINTS_BY_HORIZON: Record<AnalyzeTimeHorizon, number> = {
  "1mo": 15,
  "1y": 200,
  "5y": 900,
};

const USD_RISK_FREE_PROXY_SYMBOL = "^IRX";
const INFLATION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const EVDS_BASE_URL = process.env.EVDS_BASE_URL ?? "https://evds2.tcmb.gov.tr/service/evds";
const EVDS_FALLBACK_BASE_URL = process.env.EVDS_FALLBACK_BASE_URL ?? "https://evds3.tcmb.gov.tr/service/evds";
const EVDS_TUFE_SERIES = process.env.EVDS_TUFE_SERIES ?? "TP.FG.J0";
const EVDS_TIMEOUT_MS = 8_000;
const DEFAULT_PROXY_INFLATION_ANNUAL = Number(process.env.FINCOGNIS_PROXY_INFLATION_ANNUAL ?? "0.35");

const CLASS_FALLBACK_METRICS: Record<AssetClass, UniversalMetrics> = {
  [AssetClass.Equity]: { risk: 5.0, return: 6.9, liquidity: 5.0, diversification: 5.9, calmness: 5.0 },
  [AssetClass.Crypto]: { risk: 5.0, return: 7.7, liquidity: 5.0, diversification: 5.0, calmness: 5.0 },
  [AssetClass.Commodity]: { risk: 5.0, return: 6.1, liquidity: 5.0, diversification: 7.7, calmness: 5.0 },
  [AssetClass.Index]: { risk: 5.0, return: 6.3, liquidity: 5.0, diversification: 7.9, calmness: 5.0 },
  [AssetClass.FX]: { risk: 5.0, return: 5.0, liquidity: 5.0, diversification: 7.0, calmness: 5.0 },
  [AssetClass.Bond]: { risk: 5.0, return: 4.6, liquidity: 5.0, diversification: 8.1, calmness: 5.0 },
  [AssetClass.Fund]: { risk: 5.0, return: 6.0, liquidity: 5.0, diversification: 7.8, calmness: 5.0 },
  [AssetClass.Unknown]: { risk: 5.0, return: 5.0, liquidity: 5.0, diversification: 5.0, calmness: 5.0 },
};

function toGuaranteedScore(
  value: number | null,
  fallbackScore: number,
  fallbackReason: string,
  fallbackReasons: string[]
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    if (!fallbackReasons.includes(fallbackReason)) fallbackReasons.push(fallbackReason);
    return clampMetric(fallbackScore);
  }
  return clampMetric(value);
}

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

function maxDrawdown(prices: number[]): number {
  if (prices.length === 0) return 0;
  let peak = prices[0];
  let maxDD = 0;

  for (const price of prices) {
    if (price > peak) peak = price;
    if (peak <= 0) continue;
    const drawdown = (peak - price) / peak;
    if (drawdown > maxDD) maxDD = drawdown;
  }
  return maxDD;
}

function getSharpeAnnualizationDays(assetClass: AssetClass): number {
  return assetClass === AssetClass.Crypto ? 365 : 252;
}

function computeSharpeFromExcessReturns(
  excessReturns: number[],
  annualizationDays: number
): SharpeComputationResult | null {
  if (excessReturns.length < 2) return null;
  const stdExcessReturn = stdDev(excessReturns);
  if (stdExcessReturn <= 1e-10) return null;
  const meanExcessReturn = mean(excessReturns);
  const dailySharpe = meanExcessReturn / stdExcessReturn;
  const annualSharpe = dailySharpe * Math.sqrt(annualizationDays);
  if (!Number.isFinite(annualSharpe)) return null;
  return { annualSharpe, dailySharpe, meanExcessReturn, stdExcessReturn };
}

function toSharpeAnnual(
  logReturns: number[],
  riskFreeRateDaily: number,
  assetClass: AssetClass
): SharpeComputationResult | null {
  if (logReturns.length < 2) return null;
  const excessReturns = logReturns.map((item) => item - riskFreeRateDaily);
  return computeSharpeFromExcessReturns(excessReturns, getSharpeAnnualizationDays(assetClass));
}

function skewness(values: number[]): number | null {
  if (values.length < 3) return null;
  const sigma = stdDev(values);
  if (sigma <= 1e-10) return null;
  const mu = mean(values);
  const n = values.length;
  const normalizedThird = values.reduce((acc, value) => acc + ((value - mu) / sigma) ** 3, 0) / n;
  return Number.isFinite(normalizedThird) ? normalizedThird : null;
}

function excessKurtosis(values: number[]): number | null {
  if (values.length < 4) return null;
  const sigma = stdDev(values);
  if (sigma <= 1e-10) return null;
  const mu = mean(values);
  const n = values.length;
  const normalizedFourth = values.reduce((acc, value) => acc + ((value - mu) / sigma) ** 4, 0) / n - 3;
  return Number.isFinite(normalizedFourth) ? normalizedFourth : null;
}

function rollingSharpeSeries(
  logReturns: number[],
  windowSize: number,
  riskFreeRateDaily: number,
  assetClass: AssetClass
): number[] {
  if (windowSize < 2 || logReturns.length < windowSize) return [];
  const values: number[] = [];
  for (let index = windowSize; index <= logReturns.length; index += 1) {
    const slice = logReturns.slice(index - windowSize, index);
    const computed = toSharpeAnnual(slice, riskFreeRateDaily, assetClass);
    if (computed) values.push(computed.annualSharpe);
  }
  return values;
}

function rollingAlphaSeries(
  assetReturns: number[],
  benchmarkReturns: number[],
  dailyRiskFree: number,
  assetClass: AssetClass,
  windowSize: number
): number[] {
  const size = Math.min(assetReturns.length, benchmarkReturns.length);
  if (windowSize < 30 || size < windowSize) return [];
  const values: number[] = [];
  for (let index = windowSize; index <= size; index += 1) {
    const left = assetReturns.slice(index - windowSize, index);
    const right = benchmarkReturns.slice(index - windowSize, index);
    const alpha = jensensAlpha(left, right, dailyRiskFree, assetClass);
    if (alpha) values.push(alpha.annualizedAlpha);
  }
  return values;
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

function toDailyRiskFreeRate(annualRate: number, assetClass: AssetClass): number {
  return (1 + annualRate) ** (1 / getSharpeAnnualizationDays(assetClass)) - 1;
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
  const lookback = getRiskLookbackDays(assetClass, horizon);
  if (lookback <= 31) return RETURN_MIN_POINTS_BY_HORIZON["1mo"];
  if (lookback <= 400) return RETURN_MIN_POINTS_BY_HORIZON["1y"];
  return RETURN_MIN_POINTS_BY_HORIZON["5y"];
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

function buildCalmnessUniverseCacheKey(assetClass: AssetClass, horizon: HorizonSpec): string {
  return `universe_calmness:${assetClass}:${horizon.range}:1d`;
}

function buildSharpeUniverseCacheKey(assetClass: AssetClass, horizon: HorizonSpec): string {
  return `universe_sharpe:${assetClass}:${horizon.range}:1d`;
}

function buildLiquidityUniverseCacheKey(assetClass: AssetClass, horizon: HorizonSpec): string {
  return `universe_liquidity:${assetClass}:${horizon.range}:1d`;
}

function buildRealReturnUniverseCacheKey(assetClass: AssetClass, horizon: HorizonSpec): string {
  return `universe_real_return:${assetClass}:${horizon.range}:1d`;
}

function buildDiversificationUniverseCacheKey(
  assetClass: AssetClass,
  benchmarkSymbol: string,
  horizon: HorizonSpec,
  regime: MarketRegime
): string {
  return `universe_diversification:${assetClass}:${benchmarkSymbol}:${horizon.range}:${regime}`;
}

function toReturnsByDate(history: MarketHistory): Record<string, number> {
  const returnsByDate: Record<string, number> = {};
  for (let index = 1; index < history.points.length; index += 1) {
    const point = history.points[index];
    const value = history.returns[index - 1];
    if (!Number.isFinite(value)) continue;
    returnsByDate[point.date] = value;
  }
  return returnsByDate;
}

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toEvdsDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function parseDateLoose(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dashMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  const dotMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  const parsed = new Date(trimmed);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function parseMonthlyRate(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw > 1) return raw / 100;
    if (raw >= -1) return raw;
    return null;
  }
  if (typeof raw !== "string") return null;
  const normalized = raw.replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  if (parsed > 1) return parsed / 100;
  if (parsed >= -1) return parsed;
  return null;
}

function fisherRealReturn(nominalReturn: number, inflationRate: number): number {
  return (1 + nominalReturn) / (1 + inflationRate) - 1;
}

function pickNominalPrice(point: MarketHistory["points"][number]): number {
  return point.adjustedClose ?? point.close;
}

function computeNominalReturn(history: MarketHistory, lookbackDays: number): number | null {
  const points = history.points.slice(-(lookbackDays + 1));
  if (points.length < 2) return null;
  const start = pickNominalPrice(points[0]);
  const end = pickNominalPrice(points[points.length - 1]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) return null;
  return end / start - 1;
}

function isTlQuotedAsset(assetClass: AssetClass, providerSymbol: string): boolean {
  if (providerSymbol.endsWith(".IS")) return true;
  if (assetClass === AssetClass.FX && providerSymbol.includes("TRY")) return true;
  return false;
}

function interpolateDailyInflation(points: InflationPoint[]): Array<{ date: string; dailyRate: number }> {
  if (points.length === 0) return [];
  const sorted = [...points].sort((left, right) => left.date.localeCompare(right.date));
  const daily: Array<{ date: string; dailyRate: number }> = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const currentDate = parseDateLoose(sorted[index].date);
    if (!currentDate) continue;
    const nextDate = index + 1 < sorted.length ? parseDateLoose(sorted[index + 1].date) : null;
    const daySpan = nextDate
      ? Math.max(1, Math.round((nextDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000)))
      : 30;
    const currentRate = sorted[index].monthlyRate;
    const nextRate = index + 1 < sorted.length ? sorted[index + 1].monthlyRate : currentRate;

    for (let day = 0; day < daySpan; day += 1) {
      const weight = daySpan <= 1 ? 0 : day / daySpan;
      const monthly = currentRate + (nextRate - currentRate) * weight;
      const dailyRate = (1 + monthly) ** (1 / 30) - 1;
      const interpolatedDate = new Date(currentDate.getTime() + day * 24 * 60 * 60 * 1000);
      daily.push({ date: toYmd(interpolatedDate), dailyRate });
    }
  }

  return daily;
}

function averageOfLast(values: number[], count: number): number | null {
  if (values.length === 0) return null;
  const sample = values.slice(-Math.max(1, count));
  return mean(sample);
}

function parseInflationPayload(payload: unknown): InflationPoint[] {
  if (typeof payload !== "object" || payload === null) return [];
  const root = payload as Record<string, unknown>;
  const candidates = [
    root.items,
    root.data,
    root.value,
    root.series,
    root.results,
  ];
  const rows = candidates.find((item) => Array.isArray(item));
  if (!Array.isArray(rows)) return [];

  const points: InflationPoint[] = [];
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const record = row as Record<string, unknown>;
    let dateValue: string | null = null;
    let rateValue: number | null = null;

    for (const [key, raw] of Object.entries(record)) {
      const lowerKey = key.toLowerCase();
      if (!dateValue && (lowerKey.includes("tarih") || lowerKey.includes("date"))) {
        if (typeof raw === "string") dateValue = raw;
      }
      if (
        rateValue === null &&
        (lowerKey.includes("tp_fg_j0") ||
          lowerKey.includes("tp.fg.j0") ||
          lowerKey.includes("value") ||
          lowerKey.includes("oran") ||
          lowerKey.includes("rate"))
      ) {
        rateValue = parseMonthlyRate(raw);
      }
    }

    if (rateValue === null) {
      const numericField = Object.values(record).map((value) => parseMonthlyRate(value)).find((value) => value !== null);
      if (numericField !== undefined) rateValue = numericField;
    }

    if (!dateValue || rateValue === null) continue;
    const parsedDate = parseDateLoose(dateValue);
    if (!parsedDate) continue;
    points.push({ date: toYmd(parsedDate), monthlyRate: rateValue });
  }

  return points.sort((left, right) => left.date.localeCompare(right.date));
}

function buildInflationCacheKey(startDate: Date, endDate: Date): string {
  return `tufe:${startDate.toISOString().slice(0, 7)}:${endDate.toISOString().slice(0, 7)}`;
}

async function fetchInflationSnapshot(startDate: Date, endDate: Date): Promise<InflationSnapshot | null> {
  const apiKey = process.env.EVDS_API_KEY;
  if (!apiKey) return null;

  const cacheKey = buildInflationCacheKey(startDate, endDate);
  const cached = inflationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const urls = [EVDS_BASE_URL, EVDS_FALLBACK_BASE_URL]
      .filter((value, index, self) => value && self.indexOf(value) === index)
      .map(
        (baseUrl) =>
          `${baseUrl}/series=${encodeURIComponent(EVDS_TUFE_SERIES)}&startDate=${toEvdsDate(startDate)}&endDate=${toEvdsDate(endDate)}&type=json&formulas=1&frequency=5&key=${encodeURIComponent(apiKey)}`
      );

    let points: InflationPoint[] = [];
    for (const url of urls) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), EVDS_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            key: apiKey,
          },
        });
        if (!response.ok) continue;
        const payload = (await response.json()) as unknown;
        points = parseInflationPayload(payload);
        if (points.length > 0) break;
      } catch {
        // try next EVDS endpoint
      } finally {
        clearTimeout(timeout);
      }
    }
    if (points.length === 0) return null;

    const monthRates = points.map((item) => item.monthlyRate);
    const estimatedLastMonthRate = averageOfLast(monthRates, 3);
    const lastPointDate = parseDateLoose(points[points.length - 1].date);
    const needsEstimatedLastMonth = Boolean(
      lastPointDate &&
        (endDate.getUTCFullYear() > lastPointDate.getUTCFullYear() ||
          endDate.getUTCMonth() > lastPointDate.getUTCMonth())
    );

    const normalizedPoints = [...points];
    if (needsEstimatedLastMonth && estimatedLastMonthRate !== null && lastPointDate) {
      const estimatedMonth = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
      normalizedPoints.push({ date: toYmd(estimatedMonth), monthlyRate: estimatedLastMonthRate });
    }

    const snapshot: InflationSnapshot = {
      points: normalizedPoints.sort((left, right) => left.date.localeCompare(right.date)),
      estimatedLastMonth: needsEstimatedLastMonth,
    };
    inflationCache.set(cacheKey, {
      expiresAt: Date.now() + INFLATION_CACHE_TTL_MS,
      value: snapshot,
    });
    return snapshot;
  } catch {
    return null;
  }
}

function compoundInflationFromDaily(
  dailyRates: Array<{ date: string; dailyRate: number }>,
  startDate: Date,
  endDate: Date
): number | null {
  if (dailyRates.length === 0) return null;
  const startKey = toYmd(startDate);
  const endKey = toYmd(endDate);
  const relevant = dailyRates.filter((item) => item.date >= startKey && item.date <= endKey);
  if (relevant.length === 0) return null;
  let compounded = 1;
  relevant.forEach((item) => {
    compounded *= 1 + item.dailyRate;
  });
  return compounded - 1;
}

function estimateProxyInflation(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / msPerDay));
  const boundedAnnual = Number.isFinite(DEFAULT_PROXY_INFLATION_ANNUAL)
    ? Math.max(0.05, Math.min(0.95, DEFAULT_PROXY_INFLATION_ANNUAL))
    : 0.35;
  return (1 + boundedAnnual) ** (totalDays / 365) - 1;
}

function proxyRealReturnScore(realReturn: number): number {
  const bounded = Math.max(-0.5, Math.min(0.5, realReturn));
  const normalized = (bounded + 0.5) / 1.0;
  return clampMetric(1 + normalized * 9);
}

function alignReturnPairs(
  leftByDate: Record<string, number>,
  rightByDate: Record<string, number>,
  lookbackDays: number
): { left: number[]; right: number[] } {
  const commonDates = Object.keys(leftByDate).filter((date) => date in rightByDate).sort();
  const recentDates = commonDates.slice(-lookbackDays);
  const left: number[] = [];
  const right: number[] = [];
  recentDates.forEach((date) => {
    const l = leftByDate[date];
    const r = rightByDate[date];
    if (!Number.isFinite(l) || !Number.isFinite(r)) return;
    left.push(l);
    right.push(r);
  });
  return { left, right };
}

function weightedRollingCorrelation(left: number[], right: number[]): number | null {
  const size = Math.min(left.length, right.length);
  if (size < 12) return null;
  const l = left.slice(-size);
  const r = right.slice(-size);

  const longCorr = correlation(l, r);
  if (!Number.isFinite(longCorr)) return null;

  if (size < 21) return longCorr;
  const shortCorr = correlation(l.slice(-21), r.slice(-21));
  if (!Number.isFinite(shortCorr)) return longCorr;
  return shortCorr * 0.4 + longCorr * 0.6;
}

function calculateBeta(left: number[], right: number[]): number | null {
  const size = Math.min(left.length, right.length);
  if (size < 12) return null;
  const l = left.slice(-size);
  const r = right.slice(-size);
  const benchmarkVariance = variance(r);
  if (!Number.isFinite(benchmarkVariance) || benchmarkVariance <= 1e-12) return null;
  const cov = covariance(l, r);
  if (!Number.isFinite(cov)) return null;
  return cov / benchmarkVariance;
}

interface JensensAlphaResult {
  dailyAlpha: number;
  annualizedAlpha: number;
  beta: number;
  tStat: number;
  isStatisticallySignificant: boolean;
}

function jensensAlpha(
  assetReturns: number[],
  benchmarkReturns: number[],
  dailyRiskFree: number,
  assetClass: AssetClass
): JensensAlphaResult | null {
  const size = Math.min(assetReturns.length, benchmarkReturns.length);
  if (size < 30) return null;
  const asset = assetReturns.slice(-size);
  const benchmark = benchmarkReturns.slice(-size);

  const assetExcess = asset.map((value) => value - dailyRiskFree);
  const benchmarkExcess = benchmark.map((value) => value - dailyRiskFree);
  const benchmarkVariance = variance(benchmarkExcess);
  if (!Number.isFinite(benchmarkVariance) || benchmarkVariance <= 1e-12) return null;

  const beta = covariance(assetExcess, benchmarkExcess) / benchmarkVariance;
  if (!Number.isFinite(beta)) return null;

  const residuals = asset.map((assetReturn, index) => {
    const expected = dailyRiskFree + beta * (benchmark[index] - dailyRiskFree);
    return assetReturn - expected;
  });
  if (residuals.length < 30) return null;
  const dailyAlpha = mean(residuals);
  const residualStd = stdDev(residuals);
  if (!Number.isFinite(residualStd) || residualStd <= 1e-12) {
    const annualizedAlpha = dailyAlpha * getSharpeAnnualizationDays(assetClass);
    return {
      dailyAlpha,
      annualizedAlpha,
      beta,
      tStat: 0,
      isStatisticallySignificant: false,
    };
  }

  const standardError = residualStd / Math.sqrt(residuals.length);
  const tStat = standardError > 0 ? dailyAlpha / standardError : 0;
  const annualizedAlpha = dailyAlpha * getSharpeAnnualizationDays(assetClass);
  return {
    dailyAlpha,
    annualizedAlpha,
    beta,
    tStat,
    isStatisticallySignificant: Math.abs(tStat) > 1.96,
  };
}

function resolveDiversificationBenchmark(
  assetClass: AssetClass,
  symbol: string,
  providerSymbol: string
): string | null {
  const upperSymbol = symbol.toUpperCase();
  const upperProvider = providerSymbol.toUpperCase();
  const bistBankSet = new Set(["GARAN", "AKBNK", "ISCTR", "YKBNK"]);

  if (assetClass === AssetClass.Equity) {
    if (bistBankSet.has(upperSymbol)) return "XBANK.IS";
    if (upperProvider.endsWith(".IS")) return "XU100.IS";
    return providerSymbol.endsWith(".IS") ? "XU100.IS" : "SPY";
  }
  if (assetClass === AssetClass.Crypto) {
    if (upperSymbol === "BTC") return "BTC";
    if (upperSymbol === "ETH") return "ETH";
    return "BTC";
  }
  if (assetClass === AssetClass.Commodity) {
    if (upperSymbol === "XAU" || upperProvider === "XAUUSD=X") return "GC=F";
    if (upperSymbol === "WTI" || upperProvider === "CL=F") return "CL=F";
    return "GSG";
  }
  if (assetClass === AssetClass.FX) {
    if (upperProvider.includes("TRY")) return "XU100.IS";
    return "DX=F";
  }
  if (assetClass === AssetClass.Index) {
    if (upperSymbol === "NDX") return "QQQ";
    if (upperSymbol === "BIST30") return "XU100.IS";
    return "SPY";
  }
  if (assetClass === AssetClass.Bond) return "TLT";
  if (assetClass === AssetClass.Fund) return "SPY";
  return null;
}

function detectMarketRegime(vixPrice: number | null): MarketRegime {
  if (typeof vixPrice !== "number" || !Number.isFinite(vixPrice)) return "normal";
  if (vixPrice > 30) return "crisis";
  if (vixPrice > 20) return "transition";
  return "normal";
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

function pickRiskPrice(point: MarketHistory["points"][number]): number {
  return point.adjustedClose ?? point.close;
}

function prepareRiskPrices(
  history: MarketHistory,
  assetClass: AssetClass,
  lookbackDays: number,
  expectedPoints: number
): PreparedRiskPrices {
  const points = history.points.slice(-lookbackDays);
  if (points.length === 0) return { values: [], qualityRatio: 0 };

  const prices: number[] = [];
  let previousPrice: number | null = null;
  const isCommodityFuture = assetClass === AssetClass.Commodity && history.providerSymbol.endsWith("=F");

  for (const point of points) {
    const price = pickRiskPrice(point);
    if (!Number.isFinite(price) || price <= 0) continue;
    if (previousPrice === null) {
      prices.push(price);
      previousPrice = price;
      continue;
    }

    const rawReturn = price / previousPrice - 1;
    previousPrice = price;
    if (!Number.isFinite(rawReturn)) continue;

    if (assetClass === AssetClass.Equity) {
      if (Math.abs(rawReturn) <= 1e-8) continue;
      if (Math.abs(rawReturn) >= 0.095) continue;
    }
    if (isCommodityFuture && Math.abs(rawReturn) >= 0.2) continue;
    if (assetClass === AssetClass.Crypto && Math.abs(rawReturn) >= 0.95) continue;

    prices.push(price);
  }

  const qualityRatio = expectedPoints > 0 ? prices.length / expectedPoints : 0;
  return { values: prices, qualityRatio };
}

function prepareReturnSeries(
  history: MarketHistory,
  assetClass: AssetClass,
  lookbackDays: number,
  expectedPoints: number
): PreparedRiskReturns {
  const points = history.points.slice(-lookbackDays);
  if (points.length < 2) return { values: [], qualityRatio: 0 };

  const returns: number[] = [];
  const isCommodityFuture = assetClass === AssetClass.Commodity && history.providerSymbol.endsWith("=F");

  for (let index = 1; index < points.length; index += 1) {
    const previousPrice = pickRiskPrice(points[index - 1]);
    const currentPrice = pickRiskPrice(points[index]);
    if (!Number.isFinite(previousPrice) || !Number.isFinite(currentPrice)) continue;
    if (previousPrice <= 0 || currentPrice <= 0) continue;

    const logReturn = Math.log(currentPrice / previousPrice);
    if (!Number.isFinite(logReturn)) continue;

    if (assetClass === AssetClass.Equity && Math.abs(logReturn) >= 0.099) continue;
    if (isCommodityFuture && Math.abs(logReturn) >= 0.2) continue;

    const bounded = assetClass === AssetClass.Crypto ? Math.max(-0.15, Math.min(0.15, logReturn)) : logReturn;
    returns.push(bounded);
  }

  const qualityRatio = expectedPoints > 0 ? returns.length / expectedPoints : 0;
  return { values: returns, qualityRatio };
}

function realizedVolatility(logReturns: number[], window: number, assetClass: AssetClass): number | null {
  if (window < 2 || logReturns.length < window) return null;
  const slice = logReturns.slice(-window);
  const sigma = stdDev(slice);
  if (!Number.isFinite(sigma) || sigma <= 1e-12) return null;
  return sigma * Math.sqrt(getSharpeAnnualizationDays(assetClass));
}

function ewmaVolatility(logReturns: number[], assetClass: AssetClass, lambda = 0.94): number | null {
  if (logReturns.length < 2) return null;
  let varianceEstimate = logReturns[0] ** 2;
  for (let index = 1; index < logReturns.length; index += 1) {
    const value = logReturns[index];
    varianceEstimate = lambda * varianceEstimate + (1 - lambda) * value * value;
  }
  if (!Number.isFinite(varianceEstimate) || varianceEstimate <= 1e-12) return null;
  return Math.sqrt(varianceEstimate * getSharpeAnnualizationDays(assetClass));
}

function percentileValue(values: number[], percentilePoint: number): number | null {
  if (values.length === 0) return null;
  const bounded = Math.max(0, Math.min(100, percentilePoint));
  const sorted = [...values].sort((left, right) => left - right);
  const rank = (bounded / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const weight = rank - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function winsorize(values: number[], upperPercentile: number): number[] {
  const upperBound = percentileValue(values, upperPercentile);
  if (upperBound === null) return values;
  return values.map((value) => Math.min(value, upperBound));
}

function currentVolatilitySnapshot(logReturns: number[], assetClass: AssetClass): {
  vol5d: number | null;
  vol21d: number | null;
  vol63d: number | null;
  vol252d: number | null;
  ewmaVol: number | null;
  currentVol: number | null;
} {
  const vol5d = realizedVolatility(logReturns, 5, assetClass);
  const vol21d = realizedVolatility(logReturns, 21, assetClass);
  const vol63d = realizedVolatility(logReturns, 63, assetClass);
  const vol252d = realizedVolatility(logReturns, 252, assetClass);
  const ewmaVol = ewmaVolatility(logReturns, assetClass, 0.94);
  const currentVol =
    typeof ewmaVol === "number" && typeof vol21d === "number"
      ? ewmaVol * 0.6 + vol21d * 0.4
      : ewmaVol ?? vol21d ?? vol63d ?? vol252d ?? null;
  return { vol5d, vol21d, vol63d, vol252d, ewmaVol, currentVol };
}

function volatilityTransitionState(params: {
  vol5d: number | null;
  vol21d: number | null;
  vol63d: number | null;
  vol252d: number | null;
}): "expanding_fast" | "expanding_gradual" | "contracting_fast" | "stable" {
  const { vol5d, vol21d, vol63d, vol252d } = params;
  if (
    typeof vol5d !== "number" ||
    typeof vol21d !== "number" ||
    typeof vol63d !== "number" ||
    typeof vol252d !== "number" ||
    vol21d <= 0 ||
    vol63d <= 0 ||
    vol252d <= 0
  ) {
    return "stable";
  }

  const shortTerm = vol5d / vol21d;
  const mediumTerm = vol21d / vol63d;
  if (shortTerm > 1.3 && mediumTerm > 1.1) return "expanding_fast";
  if (shortTerm > 1.1 && mediumTerm > 1.0) return "expanding_gradual";
  if (shortTerm < 0.8 && mediumTerm < 0.9) return "contracting_fast";
  return "stable";
}

function volatilityClusterStrength(logReturns: number[]): number | null {
  if (logReturns.length < 12) return null;
  const squared = logReturns.map((value) => value * value);
  const left = squared.slice(0, -1);
  const right = squared.slice(1);
  const autoCorr = correlation(left, right);
  if (!Number.isFinite(autoCorr)) return null;
  return autoCorr;
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
    const prepared = prepareRiskPrices(history, assetClass, lookbackDays, expectedPoints);
    if (prepared.values.length < expectedPoints) return null;
    const drawdown = maxDrawdown(prepared.values);
    return Number.isFinite(drawdown) && drawdown >= 0 ? drawdown : null;
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

function getCachedUniverseCalmness(
  key: string,
  allowStale: boolean
): UniverseCalmnessDistributionResult | null {
  const existing = calmnessUniverseCache.get(key);
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

function setUniverseCalmnessCache(key: string, snapshot: UniverseCalmnessSnapshot): void {
  calmnessUniverseCache.set(key, {
    expiresAt: Date.now() + RISK_UNIVERSE_CACHE_TTL_MS,
    value: snapshot,
  });
}

async function recomputeUniverseCalmness(
  assetClass: AssetClass,
  horizon: HorizonSpec,
  gateway: MarketDataGatewayPort
): Promise<UniverseCalmnessSnapshot | null> {
  const symbols = Array.from(new Set(CLASS_BENCHMARK_UNIVERSE[assetClass] ?? []));
  if (symbols.length === 0) return null;

  const expectedPoints = getExpectedReturnPoints(assetClass, horizon);
  const lookbackDays = getRiskLookbackDays(assetClass, horizon);
  const computed = await mapWithConcurrency(symbols, 5, async (symbol) => {
    const history = await gateway.getHistory(symbol, { range: horizon.range, interval: "1d" });
    const prepared = prepareReturnSeries(history, assetClass, lookbackDays, expectedPoints);
    if (prepared.values.length < expectedPoints) return null;
    const snapshot = currentVolatilitySnapshot(prepared.values, assetClass);
    return typeof snapshot.currentVol === "number" && Number.isFinite(snapshot.currentVol)
      ? snapshot.currentVol
      : null;
  });

  const rawVols = computed.filter((value): value is number => value !== null && Number.isFinite(value));
  if (rawVols.length < 5) return null;
  const normalized = assetClass === AssetClass.Equity ? winsorize(rawVols, 99) : rawVols;
  return {
    volatilities: normalized,
    computedAtIso: new Date().toISOString(),
  };
}

async function getUniverseCalmnessDistribution(
  assetClass: AssetClass,
  horizon: HorizonSpec,
  gateway: MarketDataGatewayPort
): Promise<UniverseCalmnessDistributionResult> {
  const key = buildCalmnessUniverseCacheKey(assetClass, horizon);
  const fresh = getCachedUniverseCalmness(key, false);
  if (fresh) return fresh;

  try {
    const rebuilt = await recomputeUniverseCalmness(assetClass, horizon, gateway);
    if (rebuilt) {
      setUniverseCalmnessCache(key, rebuilt);
      return { source: "recomputed", volatilities: rebuilt.volatilities };
    }
  } catch {
    // no-op
  }

  const stale = getCachedUniverseCalmness(key, true);
  if (stale) return stale;
  return { source: "unavailable", volatilities: [] };
}

async function recomputeUniverseSharpes(
  assetClass: AssetClass,
  horizon: HorizonSpec,
  gateway: MarketDataGatewayPort,
  riskFreeRateAnnual: number
): Promise<UniverseVolatilitySnapshot | null> {
  const symbols = Array.from(new Set(CLASS_BENCHMARK_UNIVERSE[assetClass] ?? []));
  if (symbols.length === 0) return null;

  const expectedPoints = getExpectedReturnPoints(assetClass, horizon);
  const lookbackDays = getRiskLookbackDays(assetClass, horizon);
  const usdAnnualRiskFreeRate = await fetchUsdAnnualRiskFreeRate(gateway);

  const computed = await mapWithConcurrency(symbols, 5, async (symbol) => {
    const history = await gateway.getHistory(symbol, { range: horizon.range, interval: "1d" });
    const prepared = prepareReturnSeries(
      history,
      assetClass,
      lookbackDays,
      expectedPoints
    );
    if (prepared.values.length < expectedPoints) return null;
    const annualRate = resolveAnnualRiskFreeRateForSymbol(
      assetClass,
      history.providerSymbol,
      riskFreeRateAnnual,
      usdAnnualRiskFreeRate
    );
    const riskFreeRateDaily = toDailyRiskFreeRate(annualRate, assetClass);
    const sharpe = toSharpeAnnual(prepared.values, riskFreeRateDaily, assetClass);
    if (sharpe === null) return null;
    return winsorizeSharpe(sharpe.annualSharpe, assetClass);
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
  riskFreeRateAnnual: number
): Promise<UniverseSharpeDistributionResult> {
  const key = buildSharpeUniverseCacheKey(assetClass, horizon);
  const fresh = getCachedUniverseVolatilitiesFrom(sharpeUniverseCache, key, false);
  if (fresh) return { source: fresh.source, sharpes: fresh.values };

  try {
    const rebuilt = await recomputeUniverseSharpes(assetClass, horizon, gateway, riskFreeRateAnnual);
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

function getCachedRealReturnDistribution(
  key: string,
  allowStale: boolean
): UniverseRealReturnDistributionResult | null {
  const existing = realReturnUniverseCache.get(key);
  if (!existing) return null;
  const isFresh = existing.expiresAt > Date.now();
  if (isFresh) {
    return {
      source: "fresh_cache",
      values: existing.value.values,
      medianNegative: existing.value.medianNegative,
    };
  }
  if (allowStale) {
    return {
      source: "stale_cache",
      values: existing.value.values,
      medianNegative: existing.value.medianNegative,
    };
  }
  return null;
}

function setRealReturnDistributionCache(key: string, snapshot: UniverseRealReturnSnapshot): void {
  realReturnUniverseCache.set(key, {
    expiresAt: Date.now() + RISK_UNIVERSE_CACHE_TTL_MS,
    value: snapshot,
  });
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

async function recomputeUniverseRealReturns(
  assetClass: AssetClass,
  horizon: HorizonSpec,
  gateway: MarketDataGatewayPort
): Promise<UniverseRealReturnSnapshot | null> {
  const symbols = Array.from(new Set(CLASS_BENCHMARK_UNIVERSE[assetClass] ?? []));
  if (symbols.length === 0) return null;

  const lookbackDays = getRiskLookbackDays(assetClass, horizon);
  const expectedPoints = getExpectedReturnPoints(assetClass, horizon);
  const now = new Date();
  const startDate = new Date(now.getTime() - Math.max(lookbackDays + 40, 60) * 24 * 60 * 60 * 1000);
  const inflationSnapshot = await fetchInflationSnapshot(startDate, now);
  if (!inflationSnapshot) return null;
  const dailyInflation = interpolateDailyInflation(inflationSnapshot.points);

  const computed = await mapWithConcurrency(symbols, 5, async (symbol) => {
    const history = await gateway.getHistory(symbol, { range: horizon.range, interval: "1d" });
    const nominalReturn = computeNominalReturn(history, lookbackDays);
    if (nominalReturn === null) return null;
    const points = history.points.slice(-(lookbackDays + 1));
    if (points.length < expectedPoints + 1) return null;
    const periodStartDate = parseDateLoose(points[0].date);
    const periodEndDate = parseDateLoose(points[points.length - 1].date);
    if (!periodStartDate || !periodEndDate) return null;

    let nominalTlReturn = nominalReturn;
    if (!isTlQuotedAsset(assetClass, history.providerSymbol)) {
      const usdtry = await gateway.getHistory("USDTRY", { range: horizon.range, interval: "1d" });
      const usdtryReturn = computeNominalReturn(usdtry, lookbackDays);
      if (usdtryReturn === null) return null;
      nominalTlReturn = (1 + nominalReturn) * (1 + usdtryReturn) - 1;
    }

    const inflationRate = compoundInflationFromDaily(dailyInflation, periodStartDate, periodEndDate);
    if (inflationRate === null) return null;
    const realReturn = fisherRealReturn(nominalTlReturn, inflationRate);
    return Number.isFinite(realReturn) ? realReturn : null;
  });

  const values = computed.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length < 5) return null;
  const med = median(values);
  return {
    values,
    medianNegative: typeof med === "number" ? med < 0 : false,
    computedAtIso: new Date().toISOString(),
  };
}

async function getUniverseRealReturnDistribution(
  assetClass: AssetClass,
  horizon: HorizonSpec,
  gateway: MarketDataGatewayPort
): Promise<UniverseRealReturnDistributionResult> {
  const key = buildRealReturnUniverseCacheKey(assetClass, horizon);
  const fresh = getCachedRealReturnDistribution(key, false);
  if (fresh) return fresh;

  try {
    const rebuilt = await recomputeUniverseRealReturns(assetClass, horizon, gateway);
    if (rebuilt && rebuilt.values.length >= 5) {
      setRealReturnDistributionCache(key, rebuilt);
      return { source: "recomputed", values: rebuilt.values, medianNegative: rebuilt.medianNegative };
    }
  } catch {
    // no-op
  }

  const stale = getCachedRealReturnDistribution(key, true);
  if (stale) return stale;
  return { source: "unavailable", values: [], medianNegative: false };
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

function getCachedUniverseDiversification(
  key: string,
  allowStale: boolean
): UniverseDiversificationDistributionResult | null {
  const existing = diversificationUniverseCache.get(key);
  if (!existing) return null;
  const isFresh = existing.expiresAt > Date.now();
  if (isFresh) {
    return { source: "fresh_cache", scores: existing.value.scores };
  }
  if (allowStale) {
    return { source: "stale_cache", scores: existing.value.scores };
  }
  return null;
}

function setDiversificationCache(key: string, snapshot: UniverseDiversificationSnapshot): void {
  diversificationUniverseCache.set(key, {
    expiresAt: Date.now() + RISK_UNIVERSE_CACHE_TTL_MS,
    value: snapshot,
  });
}

async function recomputeUniverseDiversification(
  assetClass: AssetClass,
  benchmarkSymbol: string,
  horizon: HorizonSpec,
  gateway: MarketDataGatewayPort,
  _regime: MarketRegime
): Promise<UniverseDiversificationSnapshot | null> {
  const symbols = Array.from(new Set(CLASS_BENCHMARK_UNIVERSE[assetClass] ?? []));
  if (symbols.length === 0) return null;

  const benchmarkHistory = await gateway.getHistory(benchmarkSymbol, { range: horizon.range, interval: "1d" });
  const benchmarkByDate = toReturnsByDate(benchmarkHistory);
  const lookbackDays = getRiskLookbackDays(assetClass, horizon);
  const usdAnnualRiskFreeRate = await fetchUsdAnnualRiskFreeRate(gateway);

  const rawScores = await mapWithConcurrency(symbols, 5, async (symbol) => {
    const history = await gateway.getHistory(symbol, { range: horizon.range, interval: "1d" });
    const returnsByDate = toReturnsByDate(history);
    const paired = alignReturnPairs(returnsByDate, benchmarkByDate, lookbackDays);
    if (paired.left.length < 30) return null;

    let adjustedAssetReturns = paired.left;
    if (assetClass === AssetClass.FX && history.providerSymbol.includes("TRY")) {
      const annualTrRate = getClassAnnualRiskFreeRateFallback(assetClass);
      const annualUsRate =
        typeof usdAnnualRiskFreeRate === "number" && usdAnnualRiskFreeRate > 0
          ? usdAnnualRiskFreeRate
          : getClassAnnualRiskFreeRateFallback(AssetClass.Index);
      const carryDaily = (annualTrRate - annualUsRate) / getSharpeAnnualizationDays(assetClass);
      adjustedAssetReturns = paired.left.map((value) => value + carryDaily);
    }

    const annualRate = resolveAnnualRiskFreeRateForSymbol(
      assetClass,
      history.providerSymbol,
      getClassAnnualRiskFreeRateFallback(assetClass),
      usdAnnualRiskFreeRate
    );
    const dailyRf = toDailyRiskFreeRate(annualRate, assetClass);
    const alpha = jensensAlpha(adjustedAssetReturns, paired.right, dailyRf, assetClass);
    if (!alpha) return null;
    return alpha.annualizedAlpha;
  });

  const scores = rawScores.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (scores.length < 5) return null;

  return {
    scores,
    computedAtIso: new Date().toISOString(),
  };
}

async function getUniverseDiversificationDistribution(
  assetClass: AssetClass,
  benchmarkSymbol: string,
  horizon: HorizonSpec,
  gateway: MarketDataGatewayPort,
  regime: MarketRegime
): Promise<UniverseDiversificationDistributionResult> {
  const key = buildDiversificationUniverseCacheKey(assetClass, benchmarkSymbol, horizon, regime);
  const fresh = getCachedUniverseDiversification(key, false);
  if (fresh) return fresh;

  try {
    const rebuilt = await recomputeUniverseDiversification(assetClass, benchmarkSymbol, horizon, gateway, regime);
    if (rebuilt) {
      setDiversificationCache(key, rebuilt);
      return { source: "recomputed", scores: rebuilt.scores };
    }
  } catch {
    // no-op
  }

  const stale = getCachedUniverseDiversification(key, true);
  if (stale) return stale;

  return { source: "unavailable", scores: [] };
}

function logAnalysisDiagnostics(params: {
  symbol: string;
  providerSymbol: string;
  lookbackDays: number;
  historyPoints: number;
  returnsLength: number;
  riskReturnsLength: number;
  riskPricesLength: number;
  riskExpectedPoints: number;
  riskUniverseSize: number;
  riskUniverseSource: UniverseDistributionResult["source"];
  returnUniverseSize: number;
  returnUniverseSource: UniverseSharpeDistributionResult["source"];
  returnSharpeAnnual: number | null;
  returnSkewness: number | null;
  returnExcessKurtosis: number | null;
  returnRegimeShift: boolean;
  liquidityUniverseVolumeSize: number;
  liquidityUniverseSpreadSize: number;
  liquidityUniverseAmihudSize: number;
  liquidityUniverseSource: UniverseLiquidityDistributionResult["source"];
  liquidityHasPartialData: boolean;
  diversificationMode: DiversificationMode;
  marketRegime: MarketRegime;
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

function getClassAnnualRiskFreeRateFallback(assetClass: AssetClass, overrideAnnualRiskFree?: number): number {
  if (typeof overrideAnnualRiskFree === "number" && Number.isFinite(overrideAnnualRiskFree)) {
    return overrideAnnualRiskFree;
  }
  return CLASS_RISK_FREE_RATE_ANNUAL[assetClass] ?? DEFAULT_RISK_FREE_RATE_ANNUAL;
}

function normalizeQuotedAnnualRate(rawPrice: number): number | null {
  if (!Number.isFinite(rawPrice) || rawPrice <= 0) return null;
  // ^IRX is usually quoted as percent points (e.g., 5.2 -> %5.2)
  if (rawPrice > 1) return rawPrice / 100;
  return rawPrice;
}

async function fetchUsdAnnualRiskFreeRate(gateway: MarketDataGatewayPort): Promise<number | null> {
  const quote = await gateway.getQuote(USD_RISK_FREE_PROXY_SYMBOL);
  if (!quote || typeof quote.price !== "number") return null;
  return normalizeQuotedAnnualRate(quote.price);
}

function resolveAnnualRiskFreeRateForSymbol(
  assetClass: AssetClass,
  providerSymbol: string,
  defaultAnnualRate: number,
  usdAnnualRate: number | null
): number {
  if (assetClass === AssetClass.Crypto) return defaultAnnualRate;
  if (providerSymbol.endsWith(".IS")) return defaultAnnualRate;
  if (assetClass === AssetClass.FX && providerSymbol.includes("TRY")) return defaultAnnualRate;
  if (typeof usdAnnualRate === "number" && Number.isFinite(usdAnnualRate) && usdAnnualRate > 0) {
    return usdAnnualRate;
  }
  return defaultAnnualRate;
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
  const diversificationMode: DiversificationMode = options.analysisMode === "discover" ? "absolute" : "contextual";
  const vixQuote = await gateway.getQuote("^VIX");
  const marketRegime = detectMarketRegime(vixQuote?.price ?? null);

  const classes = Array.from(new Set(resolvedAssets.map((asset) => asset.resolvedClass)));
  const usdAnnualRiskFreeRate = await fetchUsdAnnualRiskFreeRate(gateway);
  const universeDistributionByClass = new Map<AssetClass, UniverseDistributionResult>();
  const sharpeDistributionByClass = new Map<AssetClass, UniverseSharpeDistributionResult>();
  const calmnessDistributionByClass = new Map<AssetClass, UniverseCalmnessDistributionResult>();
  const realReturnDistributionByClass = new Map<AssetClass, UniverseRealReturnDistributionResult>();
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
      const annualRate = getClassAnnualRiskFreeRateFallback(assetClass, options.riskFreeRateAnnual);
      return {
        assetClass,
        distribution: await getUniverseSharpeDistribution(assetClass, horizon, gateway, annualRate),
      };
    })
  );
  sharpeDistributionList.forEach((item) => {
    sharpeDistributionByClass.set(item.assetClass, item.distribution);
  });
  const calmnessDistributionList = await Promise.all(
    classes.map(async (assetClass) => ({
      assetClass,
      distribution: await getUniverseCalmnessDistribution(assetClass, horizon, gateway),
    }))
  );
  calmnessDistributionList.forEach((item) => {
    calmnessDistributionByClass.set(item.assetClass, item.distribution);
  });
  const realReturnDistributionList = await Promise.all(
    classes.map(async (assetClass) => ({
      assetClass,
      distribution: await getUniverseRealReturnDistribution(assetClass, horizon, gateway),
    }))
  );
  realReturnDistributionList.forEach((item) => {
    realReturnDistributionByClass.set(item.assetClass, item.distribution);
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
      const returnExpectedPoints = getExpectedReturnPoints(asset.resolvedClass, horizon);
      const preparedRiskReturns = prepareRiskReturns(
        history.returns,
        asset.resolvedClass,
        history.providerSymbol,
        riskLookbackDays,
        riskExpectedPoints
      );
      const preparedReturnReturns = prepareReturnSeries(
        history,
        asset.resolvedClass,
        riskLookbackDays,
        returnExpectedPoints
      );
      const preparedRiskPrices = prepareRiskPrices(
        history,
        asset.resolvedClass,
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
        returnReturns: preparedReturnReturns.values,
        riskPrices: preparedRiskPrices.values,
        riskExpectedPoints,
        riskQualityRatio: Math.min(preparedRiskReturns.qualityRatio, preparedRiskPrices.qualityRatio),
        returnExpectedPoints,
        returnQualityRatio: preparedReturnReturns.qualityRatio,
        history,
        liquidity,
        returnsByDate: toReturnsByDate(history),
      };
    })
  );

  const benchmarkByAsset = new Map<string, string>();
  const benchmarkReturnsByContext = new Map<string, Record<string, number>>();
  const diversificationUniverseByContext = new Map<string, UniverseDiversificationDistributionResult>();

  const contextMap = new Map<string, { assetClass: AssetClass; benchmarkSymbol: string }>();
  series.forEach((row) => {
    const benchmarkSymbol = resolveDiversificationBenchmark(row.resolvedClass, row.symbol, row.providerSymbol);
    if (!benchmarkSymbol) return;
    benchmarkByAsset.set(row.symbol, benchmarkSymbol);
    const contextKey = `${row.resolvedClass}:${benchmarkSymbol}`;
    if (!contextMap.has(contextKey)) {
      contextMap.set(contextKey, { assetClass: row.resolvedClass, benchmarkSymbol });
    }
  });

  const contextResults = await Promise.all(
    Array.from(contextMap.entries()).map(async ([contextKey, context]) => {
      const [benchmarkHistory, universe] = await Promise.all([
        gateway.getHistory(context.benchmarkSymbol, { range: horizon.range, interval: "1d" }),
        getUniverseDiversificationDistribution(
          context.assetClass,
          context.benchmarkSymbol,
          horizon,
          gateway,
          marketRegime
        ),
      ]);
      return {
        contextKey,
        benchmarkReturnsByDate: toReturnsByDate(benchmarkHistory),
        universe,
      };
    })
  );

  contextResults.forEach((result) => {
    benchmarkReturnsByContext.set(result.contextKey, result.benchmarkReturnsByDate);
    diversificationUniverseByContext.set(result.contextKey, result.universe);
  });

  const maxLookbackDays = Math.max(
    ...resolvedAssets.map((asset) => getRiskLookbackDays(asset.resolvedClass, horizon)),
    horizon.lookbackDays
  );
  const inflationEndDate = new Date();
  const inflationStartDate = new Date(inflationEndDate.getTime() - (maxLookbackDays + 60) * 24 * 60 * 60 * 1000);
  const inflationSnapshot = await fetchInflationSnapshot(inflationStartDate, inflationEndDate);
  const dailyInflation = inflationSnapshot ? interpolateDailyInflation(inflationSnapshot.points) : [];

  return series.map((row) => {
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
    const calmnessUniverse = calmnessDistributionByClass.get(row.resolvedClass) ?? {
      source: "unavailable" as const,
      volatilities: [] as number[],
    };
    const realReturnUniverse = realReturnDistributionByClass.get(row.resolvedClass) ?? {
      source: "unavailable" as const,
      values: [] as number[],
      medianNegative: false,
    };
    const defaultAnnualRiskFreeRate = getClassAnnualRiskFreeRateFallback(
      row.resolvedClass,
      options.riskFreeRateAnnual
    );
    const annualRiskFreeRate = resolveAnnualRiskFreeRateForSymbol(
      row.resolvedClass,
      row.providerSymbol,
      defaultAnnualRiskFreeRate,
      usdAnnualRiskFreeRate
    );
    const classRiskFreeRateDaily = toDailyRiskFreeRate(annualRiskFreeRate, row.resolvedClass);

    let riskScore = fallbackMetrics.risk;
    let returnScore = fallbackMetrics.return;
    let liquidityScore: number | null = fallbackMetrics.liquidity;
    let diversificationScore = fallbackMetrics.diversification;
    let calmnessScore: number | null = fallbackMetrics.calmness;
    let returnSharpeAnnual: number | null = null;
    let returnSkewnessValue: number | null = null;
    let returnExcessKurtosisValue: number | null = null;
    let returnRegimeShift = false;

    const hasTargetRiskSeries = row.riskPrices.length >= row.riskExpectedPoints;
    const hasUniverseRiskSeries = riskUniverse.volatilities.length >= 5;

    if (hasTargetRiskSeries && hasUniverseRiskSeries) {
      const targetDrawdown = maxDrawdown(row.riskPrices);
      const percentile = percentileRank(riskUniverse.volatilities, targetDrawdown);
      riskScore = clampMetric(10 - percentile * 9);
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

    const hasTargetReturnSeries = row.returnReturns.length >= row.returnExpectedPoints;
    const hasUniverseReturnSeries = returnUniverse.sharpes.length >= 5;
    if (hasTargetReturnSeries && hasUniverseReturnSeries) {
      const targetSharpe = toSharpeAnnual(row.returnReturns, classRiskFreeRateDaily, row.resolvedClass);
      if (targetSharpe === null) {
        fallbackReasons.push("return_strength_insufficient_volatility");
      } else {
        returnSharpeAnnual = targetSharpe.annualSharpe;
        const boundedSharpe = winsorizeSharpe(targetSharpe.annualSharpe, row.resolvedClass);
        const percentile = percentileRank(returnUniverse.sharpes, boundedSharpe);
        returnScore = clampMetric(1 + percentile * 9);
        returnSkewnessValue = skewness(row.returnReturns);
        returnExcessKurtosisValue = excessKurtosis(row.returnReturns);
        const rolling90 = rollingSharpeSeries(row.returnReturns, 90, classRiskFreeRateDaily, row.resolvedClass);
        const rolling252 = rollingSharpeSeries(row.returnReturns, 252, classRiskFreeRateDaily, row.resolvedClass);
        if (rolling90.length > 0 && rolling252.length > 0) {
          const delta = Math.abs(rolling90[rolling90.length - 1] - rolling252[rolling252.length - 1]);
          returnRegimeShift = delta > 0.5;
        }
        if (returnUniverse.source === "stale_cache") {
          fallbackReasons.push("return_universe_stale_cache");
        }
      }
    } else if (hasUniverseReturnSeries) {
      returnScore = 5.0;
      fallbackReasons.push("return_target_insufficient_history");
      if (row.returnQualityRatio < 0.8) fallbackReasons.push("return_low_data_quality");
      if (returnUniverse.source === "stale_cache") {
        fallbackReasons.push("return_universe_stale_cache");
      }
    } else {
      returnScore = 5.0;
      fallbackReasons.push("return_data_unavailable");
    }

    const calmnessSnapshot = currentVolatilitySnapshot(row.returnReturns, row.resolvedClass);
    const hasCalmnessTargetSeries = row.returnReturns.length >= row.returnExpectedPoints;
    const hasCalmnessUniverseSeries = calmnessUniverse.volatilities.length >= 5;

    if (
      hasCalmnessTargetSeries &&
      hasCalmnessUniverseSeries &&
      typeof calmnessSnapshot.currentVol === "number" &&
      Number.isFinite(calmnessSnapshot.currentVol)
    ) {
      const p10 = percentileValue(calmnessUniverse.volatilities, 10);
      const percentile = 1 - percentileRank(calmnessUniverse.volatilities, calmnessSnapshot.currentVol);
      const rawScore = clampMetric(1 + percentile * 9);
      const fragilityPenalty =
        typeof p10 === "number" && calmnessSnapshot.currentVol < p10 ? 0.8 : 1.0;
      calmnessScore = clampMetric(rawScore * fragilityPenalty);

      const transition = volatilityTransitionState({
        vol5d: calmnessSnapshot.vol5d,
        vol21d: calmnessSnapshot.vol21d,
        vol63d: calmnessSnapshot.vol63d,
        vol252d: calmnessSnapshot.vol252d,
      });
      const clusterStrength = volatilityClusterStrength(row.returnReturns);
      if (
        transition === "expanding_fast" ||
        (transition === "expanding_gradual" && clusterStrength !== null && clusterStrength > 0.3) ||
        marketRegime === "crisis"
      ) {
        calmnessScore = clampMetric(calmnessScore - 0.4);
      }
      if (calmnessUniverse.source === "stale_cache") {
        fallbackReasons.push("calmness_universe_stale_cache");
      }
    } else if (hasCalmnessUniverseSeries) {
      calmnessScore = 5.0;
      fallbackReasons.push("calmness_target_insufficient_history");
      if (calmnessUniverse.source === "stale_cache") {
        fallbackReasons.push("calmness_universe_stale_cache");
      }
    } else {
      calmnessScore = 5.0;
      fallbackReasons.push("calmness_data_unavailable");
    }

    const realNominalReturn = computeNominalReturn(row.history, getRiskLookbackDays(row.resolvedClass, horizon));
    const periodPoints = row.history.points.slice(-(getRiskLookbackDays(row.resolvedClass, horizon) + 1));
    const periodStartDate = periodPoints.length > 0 ? parseDateLoose(periodPoints[0].date) : null;
    const periodEndDate =
      periodPoints.length > 0 ? parseDateLoose(periodPoints[periodPoints.length - 1].date) : null;
    let nominalTlReturn: number | null = realNominalReturn;

    if (
      nominalTlReturn !== null &&
      !isTlQuotedAsset(row.resolvedClass, row.providerSymbol) &&
      row.history.returns.length >= row.returnExpectedPoints
    ) {
      const usdtryPeer = series.find((peer) => peer.symbol === "USDTRY");
      if (usdtryPeer) {
        const usdtryNominal = computeNominalReturn(usdtryPeer.history, getRiskLookbackDays(AssetClass.FX, horizon));
        if (usdtryNominal !== null) {
          nominalTlReturn = (1 + nominalTlReturn) * (1 + usdtryNominal) - 1;
        }
      } else {
        fallbackReasons.push("real_return_fx_layer_missing");
      }
    }

    const inflationRate =
      periodStartDate && periodEndDate
        ? compoundInflationFromDaily(dailyInflation, periodStartDate, periodEndDate)
        : null;

    const inflationFallbackRate =
      inflationRate === null && periodStartDate && periodEndDate
        ? estimateProxyInflation(periodStartDate, periodEndDate)
        : null;
    const effectiveInflationRate = inflationRate ?? inflationFallbackRate;

    if (
      nominalTlReturn !== null &&
      effectiveInflationRate !== null &&
      realReturnUniverse.values.length >= 5 &&
      Number.isFinite(nominalTlReturn)
    ) {
      const realReturnValue = fisherRealReturn(nominalTlReturn, effectiveInflationRate);
      const percentile = percentileRank(realReturnUniverse.values, realReturnValue);
      liquidityScore = clampMetric(1 + percentile * 9);
      if (realReturnUniverse.medianNegative) {
        fallbackReasons.push("real_return_universe_mostly_negative");
      }
      if (inflationRate === null && inflationFallbackRate !== null) {
        fallbackReasons.push("real_return_inflation_proxy_fallback");
      }
      if (inflationSnapshot?.estimatedLastMonth) {
        fallbackReasons.push("inflation_last_month_estimated");
      }
      if (realReturnUniverse.source === "stale_cache") {
        fallbackReasons.push("real_return_universe_stale_cache");
      }
    } else if (nominalTlReturn !== null && effectiveInflationRate !== null) {
      const realReturnValue = fisherRealReturn(nominalTlReturn, effectiveInflationRate);
      liquidityScore = proxyRealReturnScore(realReturnValue);
      fallbackReasons.push("real_return_universe_proxy_scoring");
      if (inflationRate === null && inflationFallbackRate !== null) {
        fallbackReasons.push("real_return_inflation_proxy_fallback");
      } else {
        fallbackReasons.push("real_return_universe_insufficient");
      }
    } else {
      liquidityScore = 5.0;
      fallbackReasons.push("real_return_data_unavailable");
    }

    const benchmarkSymbol = benchmarkByAsset.get(row.symbol);
    const contextKey = benchmarkSymbol ? `${row.resolvedClass}:${benchmarkSymbol}` : null;
    const benchmarkReturnsByDate = contextKey ? benchmarkReturnsByContext.get(contextKey) : undefined;
    const alphaUniverse = contextKey
      ? diversificationUniverseByContext.get(contextKey) ?? { source: "unavailable", scores: [] }
      : { source: "unavailable" as const, scores: [] as number[] };

    if (benchmarkSymbol && benchmarkReturnsByDate && alphaUniverse.scores.length >= 5) {
      const paired = alignReturnPairs(row.returnsByDate, benchmarkReturnsByDate, horizon.lookbackDays);
      if (paired.left.length >= 30) {
        let alphaAssetReturns = paired.left;
        if (row.resolvedClass === AssetClass.FX && row.providerSymbol.includes("TRY")) {
          const annualTrRate = getClassAnnualRiskFreeRateFallback(row.resolvedClass, options.riskFreeRateAnnual);
          const annualUsRate =
            typeof usdAnnualRiskFreeRate === "number" && usdAnnualRiskFreeRate > 0
              ? usdAnnualRiskFreeRate
              : getClassAnnualRiskFreeRateFallback(AssetClass.Index, options.riskFreeRateAnnual);
          const carryDaily = (annualTrRate - annualUsRate) / getSharpeAnnualizationDays(row.resolvedClass);
          alphaAssetReturns = paired.left.map((value) => value + carryDaily);
        }

        const alphaResult = jensensAlpha(alphaAssetReturns, paired.right, classRiskFreeRateDaily, row.resolvedClass);
        if (alphaResult && alphaResult.isStatisticallySignificant) {
          const percentile = percentileRank(alphaUniverse.scores, alphaResult.annualizedAlpha);
          diversificationScore = clampMetric(1 + percentile * 9);
          const rolling63 = rollingAlphaSeries(
            alphaAssetReturns,
            paired.right,
            classRiskFreeRateDaily,
            row.resolvedClass,
            63
          );
          const positiveRatio =
            rolling63.length > 0
              ? rolling63.filter((value) => value > 0).length / rolling63.length
              : 0;
          if (rolling63.length > 0 && positiveRatio < 0.5) {
            fallbackReasons.push("alpha_consistency_weak");
          }
          if (alphaUniverse.source === "stale_cache") {
            fallbackReasons.push("alpha_universe_stale_cache");
          }
          if (row.resolvedClass === AssetClass.Crypto) {
            fallbackReasons.push("alpha_crypto_survivorship_bias_notice");
          }
        } else {
          diversificationScore = classFallbackMetrics(row.resolvedClass).diversification;
          fallbackReasons.push("alpha_not_statistically_significant");
        }
      } else {
        diversificationScore = classFallbackMetrics(row.resolvedClass).diversification;
        fallbackReasons.push("alpha_insufficient_observations");
      }
    } else {
      diversificationScore = classFallbackMetrics(row.resolvedClass).diversification;
      fallbackReasons.push("alpha_benchmark_data_unavailable");
    }

    const guaranteedRisk = toGuaranteedScore(
      riskScore,
      fallbackMetrics.risk,
      "risk_score_sanitized_fallback",
      fallbackReasons
    );
    const guaranteedReturn = toGuaranteedScore(
      returnScore,
      fallbackMetrics.return,
      "return_score_sanitized_fallback",
      fallbackReasons
    );
    const guaranteedLiquidity = toGuaranteedScore(
      liquidityScore,
      fallbackMetrics.liquidity ?? 5.0,
      "real_return_score_sanitized_fallback",
      fallbackReasons
    );
    const guaranteedDiversification = toGuaranteedScore(
      diversificationScore,
      fallbackMetrics.diversification,
      "alpha_score_sanitized_fallback",
      fallbackReasons
    );
    const guaranteedCalmness = toGuaranteedScore(
      calmnessScore,
      fallbackMetrics.calmness ?? 5.0,
      "calmness_score_sanitized_fallback",
      fallbackReasons
    );

    logAnalysisDiagnostics({
      symbol: row.symbol,
      providerSymbol: row.providerSymbol,
      lookbackDays: getRiskLookbackDays(row.resolvedClass, horizon),
      historyPoints: row.historyPoints,
      returnsLength: row.returns.length,
      riskReturnsLength: row.riskReturns.length,
      riskPricesLength: row.riskPrices.length,
      riskExpectedPoints: row.riskExpectedPoints,
      riskUniverseSize: riskUniverse.volatilities.length,
      riskUniverseSource: riskUniverse.source,
      returnUniverseSize: returnUniverse.sharpes.length,
      returnUniverseSource: returnUniverse.source,
      returnSharpeAnnual,
      returnSkewness: returnSkewnessValue,
      returnExcessKurtosis: returnExcessKurtosisValue,
      returnRegimeShift,
      liquidityUniverseVolumeSize: realReturnUniverse.values.length,
      liquidityUniverseSpreadSize: 0,
      liquidityUniverseAmihudSize: 0,
      liquidityUniverseSource: realReturnUniverse.source,
      liquidityHasPartialData: false,
      diversificationMode,
      marketRegime,
      usingFallback: fallbackReasons.length > 0,
      fallbackReasons,
    });

    return {
      symbol: row.symbol,
      originalInput: row.originalInput,
      class: row.resolvedClass,
      metrics: {
        risk: guaranteedRisk,
        return: guaranteedReturn,
        liquidity: guaranteedLiquidity,
        diversification: guaranteedDiversification,
        calmness: guaranteedCalmness,
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
