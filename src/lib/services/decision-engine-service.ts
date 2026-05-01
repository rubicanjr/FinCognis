import { correlation, mean, stdDev } from "@/components/tools/correlation/math";
import {
  AssetClass,
  buildDefaultClassDictionary,
  type AssetParserWarning,
  type NormalizedAsset,
} from "@/components/tools/correlation/universal-asset-comparison";
import type {
  DecisionContext,
  DecisionEngineResult,
  DecisionInsight,
  DecisionIntent,
  RiskConcentrationImpact,
} from "@/lib/contracts/decision-types";
import {
  marketDataGateway,
  type MarketDataGatewayPort,
} from "@/lib/gateways/market-data-gateway";
import { parseDecisionInput } from "@/lib/services/decision-input-parser";
import { analyzeUniversalAssets } from "@/lib/services/universal-asset-analysis-service";

interface DecisionScenario {
  baselineSymbols: string[];
  projectedSymbols: string[];
  focusSymbol: string | null;
  warnings: AssetParserWarning[];
}

const classBySymbol = buildDefaultClassDictionary();

function isLikelyEquitySymbol(symbol: string): boolean {
  if (!symbol) return false;
  if (!/^[A-Z]{1,5}$/.test(symbol)) return false;
  const blocked = new Set([
    "BTC",
    "ETH",
    "BNB",
    "SOL",
    "XAU",
    "XAG",
    "WTI",
    "BRENT",
    "SPX",
    "NDX",
    "BIST30",
    "USDTRY",
    "EURUSD",
    "QQQ",
    "SPY",
    "EUROBOND",
  ]);
  return !blocked.has(symbol);
}

const MARKET_SYMBOL_PROXY: Record<string, string> = {
  BIST30: "THYAO",
  EURUSD: "EURUSD",
  EUROBOND: "MSFT",
  NDX: "NVDA",
  QQQ: "QQQ",
  SPX: "AAPL",
  SPY: "SPY",
  USDTRY: "USDTRY",
  XAG: "XAGUSD",
  XAU: "XAUUSD",
  XPD: "XAUUSD",
};

const CLASS_LABEL_TR: Record<AssetClass, string> = {
  [AssetClass.Equity]: "hisse",
  [AssetClass.Crypto]: "kripto",
  [AssetClass.Commodity]: "emtia",
  [AssetClass.Index]: "endeks",
  [AssetClass.FX]: "döviz",
  [AssetClass.Bond]: "tahvil",
  [AssetClass.Fund]: "fon",
  [AssetClass.Unknown]: "tanımsız",
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function dedupeSymbols(symbols: string[]): string[] {
  return symbols.reduce<string[]>((acc, symbol) => (acc.includes(symbol) ? acc : [...acc, symbol]), []);
}

function getBaselineSymbols(currentRiskProfile: number): string[] {
  if (currentRiskProfile <= 3) return ["MSFT", "XAUUSD", "THYAO"];
  if (currentRiskProfile <= 6) return ["THYAO", "XAUUSD", "GARAN", "AAPL"];
  return ["BTC", "ETH", "THYAO", "XAUUSD"];
}

function buildScenario(intent: DecisionIntent, symbols: string[], currentRiskProfile: number): DecisionScenario {
  const baseline = getBaselineSymbols(currentRiskProfile);

  if (intent === "COMPARE") {
    return symbols.length >= 2
      ? {
          baselineSymbols: [symbols[0]],
          projectedSymbols: [symbols[1]],
          focusSymbol: symbols[1],
          warnings: [],
        }
      : {
          baselineSymbols: baseline,
          projectedSymbols: dedupeSymbols([...baseline, ...symbols]),
          focusSymbol: symbols[0] ?? null,
          warnings: [{ level: "info", message: "Karşılaştırma için iki varlık girmeniz önerilir." }],
        };
  }

  if (intent === "REPLACE") {
    return symbols.length >= 2
      ? {
          baselineSymbols: dedupeSymbols([...baseline, symbols[0]]),
          projectedSymbols: dedupeSymbols([...baseline.filter((symbol) => symbol !== symbols[0]), symbols[1]]),
          focusSymbol: symbols[1],
          warnings: [],
        }
      : {
          baselineSymbols: baseline,
          projectedSymbols: dedupeSymbols([...baseline, ...symbols]),
          focusSymbol: symbols[0] ?? null,
          warnings: [{ level: "info", message: "Yer değiştirme analizi için iki varlık girmeniz önerilir." }],
        };
  }

  return {
    baselineSymbols: baseline,
    projectedSymbols: symbols[0] ? dedupeSymbols([...baseline, symbols[0]]) : baseline,
    focusSymbol: symbols[0] ?? null,
    warnings:
      symbols.length === 0
        ? [{ level: "info", message: "Varlık sembolü bulunamadı. Örnek: BTC eklemeli miyim?" }]
        : [],
  };
}

async function analyzeBySymbols(
  symbols: string[],
  gateway: MarketDataGatewayPort
): Promise<NormalizedAsset[]> {
  return analyzeUniversalAssets(
    symbols.map((symbol) => ({
      symbol,
      originalInput: symbol,
      class: classBySymbol[symbol] ?? (isLikelyEquitySymbol(symbol) ? AssetClass.Equity : AssetClass.Unknown),
    })),
    gateway
  );
}

function resolveHistorySymbol(symbol: string): string {
  return MARKET_SYMBOL_PROXY[symbol] ?? symbol;
}

function alignReturns(left: number[], right: number[]): { left: number[]; right: number[] } {
  const size = Math.min(left.length, right.length);
  if (size < 2) return { left: [], right: [] };
  return {
    left: left.slice(-size),
    right: right.slice(-size),
  };
}

async function riskDensity(symbols: string[], gateway: MarketDataGatewayPort): Promise<number> {
  const histories = await Promise.all(
    dedupeSymbols(symbols)
      .map(resolveHistorySymbol)
      .map((symbol) => gateway.getHistory(symbol, { range: "1y", interval: "1d" }))
  );

  const series = histories
    .map((history) => history.returns.slice(-252))
    .filter((returns) => returns.length >= 2);

  if (series.length === 0) return 0;

  const alignedSize = series.reduce(
    (size, returns) => Math.min(size, returns.length),
    Number.POSITIVE_INFINITY
  );
  if (!Number.isFinite(alignedSize) || alignedSize < 2) return 0;

  const aligned = series.map((returns) => returns.slice(-alignedSize));
  const weighted = Array.from({ length: alignedSize }, (_, index) =>
    aligned.reduce((sum, returns) => sum + returns[index] / aligned.length, 0)
  );

  const annualizedVol = stdDev(weighted) * Math.sqrt(252) * 100;
  const densityIndex = Math.log1p(Math.max(annualizedVol, 0)) * 10;
  return round(clamp(densityIndex, 0, 100));
}

async function averageCorrelation(
  focusSymbol: string | null,
  baselineSymbols: string[],
  gateway: MarketDataGatewayPort
): Promise<number> {
  if (!focusSymbol) return 0;

  const focusHistory = await gateway.getHistory(resolveHistorySymbol(focusSymbol), {
    range: "1y",
    interval: "1d",
  });
  const focusReturns = focusHistory.returns.slice(-252);
  if (focusReturns.length < 2) return 0;

  const baselineHistories = await Promise.all(
    dedupeSymbols(baselineSymbols)
      .map(resolveHistorySymbol)
      .map((symbol) => gateway.getHistory(symbol, { range: "1y", interval: "1d" }))
  );

  const correlations = baselineHistories
    .map((history) => alignReturns(focusReturns, history.returns.slice(-252)))
    .filter((pair) => pair.left.length >= 2 && pair.right.length >= 2)
    .map((pair) => correlation(pair.left, pair.right))
    .filter((value) => Number.isFinite(value));

  return correlations.length > 0 ? round(mean(correlations), 3) : 0;
}

function classShare(symbols: string[], assetClass: AssetClass): number {
  const uniqueSymbols = dedupeSymbols(symbols);
  if (uniqueSymbols.length === 0) return 0;

  const count = uniqueSymbols.reduce(
    (total, symbol) => total + ((classBySymbol[symbol] ?? AssetClass.Unknown) === assetClass ? 1 : 0),
    0
  );

  return count / uniqueSymbols.length;
}

function impactLevel(delta: number): RiskConcentrationImpact {
  const absolute = Math.abs(delta);
  if (absolute >= 2) return "HIGH";
  if (absolute >= 0.8) return "MEDIUM";
  return "LOW";
}

function buildInsight(
  focusAsset: NormalizedAsset | null,
  riskDelta: number,
  avgCorrelation: number,
  concentrationDeltaPct: number
): DecisionInsight {
  const direction = riskDelta > 0.25 ? "artar" : riskDelta < -0.25 ? "azalır" : "dengeye yakın kalır";
  const concentrationDirection = concentrationDeltaPct >= 0 ? "artırır" : "azaltır";
  const assetClassLabel = focusAsset ? CLASS_LABEL_TR[focusAsset.class] : "varlık";

  const corrTone =
    avgCorrelation >= 0.65
      ? "Portföy ile birlikte hareket olasılığı yüksektir."
      : avgCorrelation >= 0.35
        ? "Portföy ile orta düzey eş yönlü hareket görülebilir."
        : "Portföy ile korelasyon sınırlı kalabilir.";

  return {
    primaryVerdict: `Risk yoğunluğu ${direction}. Bu çıktı yatırım tavsiyesi değildir, yalnızca risk yükü değerlendirmesidir.`,
    riskConcentrationImpact: impactLevel(riskDelta),
    correlationNote: `${corrTone} Ortalama korelasyon: ${avgCorrelation.toFixed(2)}.`,
    actionFrame: `Bu varlık portföyünüzdeki ${assetClassLabel} yoğunluğunu %${Math.abs(
      concentrationDeltaPct
    ).toFixed(1)} ${concentrationDirection}.`,
  };
}

function resolveFocusAsset(assets: NormalizedAsset[], focusSymbol: string | null): NormalizedAsset | null {
  if (!focusSymbol) return null;
  return assets.find((asset) => asset.symbol === focusSymbol) ?? null;
}

export class DecisionEngineService {
  constructor(private readonly gateway: MarketDataGatewayPort = marketDataGateway) {}

  async runDecisionQuery(
    rawQuery: string,
    currentRiskProfile: number
  ): Promise<DecisionEngineResult> {
    const parsedInput = parseDecisionInput(rawQuery);
    const context: DecisionContext = {
      intent: parsedInput.intent.intent,
      currentRiskProfile: clamp(currentRiskProfile, 1, 10),
    };

    const scenario = buildScenario(
      context.intent,
      parsedInput.assets.symbols,
      context.currentRiskProfile
    );

    const [
      baselineVolatility,
      projectedVolatility,
      avgCorrelation,
      baselineAnalyzed,
      projectedAnalyzed,
    ] = await Promise.all([
      riskDensity(scenario.baselineSymbols, this.gateway),
      riskDensity(scenario.projectedSymbols, this.gateway),
      averageCorrelation(scenario.focusSymbol, scenario.baselineSymbols, this.gateway),
      analyzeBySymbols(scenario.baselineSymbols, this.gateway),
      analyzeBySymbols(scenario.projectedSymbols, this.gateway),
    ]);

    const riskDensityDelta = round(projectedVolatility - baselineVolatility);
    const focusAsset = resolveFocusAsset(projectedAnalyzed, scenario.focusSymbol);
    const focusClass = focusAsset?.class ?? AssetClass.Unknown;

    const concentrationDeltaPct = round(
      (classShare(scenario.projectedSymbols, focusClass) - classShare(scenario.baselineSymbols, focusClass)) * 100
    );

    const riskExposureScore = focusAsset ? round(clamp(11 - focusAsset.metrics.risk, 1, 10), 1) : 5;
    const benefitScore = focusAsset
      ? round(clamp((focusAsset.metrics.return + focusAsset.metrics.diversification) / 2, 1, 10), 1)
      : 5;

    return {
      context,
      insight: buildInsight(focusAsset, riskDensityDelta, avgCorrelation, concentrationDeltaPct),
      quant: {
        baselineVolatility,
        projectedVolatility,
        riskDensityDelta,
        averageCorrelation: avgCorrelation,
        concentrationDeltaPct,
        riskExposureScore,
        benefitScore,
      },
      focusAssetSymbol: focusAsset?.symbol ?? null,
      assets: projectedAnalyzed.length > 0 ? projectedAnalyzed : baselineAnalyzed,
      warnings: [...parsedInput.assets.warnings, ...scenario.warnings],
    };
  }
}

export const decisionEngineService = new DecisionEngineService();
