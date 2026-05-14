import type { AnalyzeTimeHorizon, AnalysisCriteriaScores, AnalysisCriterionScorePayload } from "@/components/tools/correlation/universal-asset-comparison";
import type { MarketHistory } from "@/lib/gateways/market-data-gateway";
import { calcShortTermTechnicalScore } from "@/lib/analysis/technical-indicators";

type DataSource = AnalysisCriterionScorePayload["source"];

interface EquityCriteriaInput {
  symbol: string;
  providerSymbol: string;
  timeHorizon: AnalyzeTimeHorizon;
  history: MarketHistory;
}

interface InstitutionalProxyResult {
  score: number | null;
  source: DataSource;
  missing: string[];
  note: string;
}

interface FallbackResult {
  score: number | null;
  source: DataSource;
  missing: string[];
  note: string;
}

const BIST_FX_PROFILE: Record<string, "EXPORTER" | "MIXED" | "DOMESTIC" | "FINANCIAL" | "IMPORTER" | "UNKNOWN"> = {
  EREGL: "EXPORTER",
  ARCLK: "MIXED",
  FROTO: "EXPORTER",
  TOASO: "EXPORTER",
  TUPRS: "MIXED",
  AKBNK: "FINANCIAL",
  GARAN: "FINANCIAL",
  ISCTR: "FINANCIAL",
  HALKB: "FINANCIAL",
  YKBNK: "FINANCIAL",
  THYAO: "MIXED",
  PGSUS: "MIXED",
  AKSEN: "IMPORTER",
  ASELS: "DOMESTIC",
};

const BIST_RATE_SENSITIVITY: Record<string, number> = {
  EKGYO: 0.55,
  AKBNK: 0.6,
  GARAN: 0.6,
  ISCTR: 0.6,
  HALKB: 0.6,
  YKBNK: 0.6,
  ASELS: 0.65,
  EREGL: 0.65,
  TUPRS: 0.6,
  THYAO: 0.6,
};

const LONG_TERM_QUALITY_BASELINE: Record<string, number> = {
  TUPRS: 0.56,
  THYAO: 0.52,
  ASELS: 0.64,
  AAPL: 0.72,
  NVDA: 0.68,
  MSFT: 0.74,
};

const LONG_TERM_CAPITAL_BASELINE: Record<string, number> = {
  TUPRS: 0.54,
  THYAO: 0.5,
  ASELS: 0.6,
  AAPL: 0.7,
  NVDA: 0.66,
  MSFT: 0.73,
};

function baseSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/\.IS$/, "");
}

function isBistEquity(symbol: string, providerSymbol: string): boolean {
  const normalized = baseSymbol(symbol);
  return (
    providerSymbol.toUpperCase().endsWith(".IS") ||
    Boolean(BIST_FX_PROFILE[normalized]) ||
    Boolean(BIST_RATE_SENSITIVITY[normalized])
  );
}

function toDisplayScore(score01: number | null): number | null {
  if (score01 === null || !Number.isFinite(score01)) return null;
  const bounded = Math.max(0, Math.min(1, score01));
  return Number((1 + bounded * 9).toFixed(1));
}

function toTechnicalDisplayScore(rawScore70: number | null): number | null {
  if (rawScore70 === null || !Number.isFinite(rawScore70)) return null;
  const bounded = Math.max(0, Math.min(70, rawScore70));
  return Number((1 + (bounded / 70) * 9).toFixed(1));
}

function payload(input: {
  id: keyof AnalysisCriteriaScores;
  score: number | null;
  rawScore: number | null;
  source: DataSource;
  maxPossible: number;
  achievedMax: number;
  missing: string[];
  note: string;
}): AnalysisCriterionScorePayload {
  return {
    id: input.id,
    score: input.score,
    rawScore: input.rawScore,
    available: input.score !== null,
    source: input.source,
    maxPossible: input.maxPossible,
    achievedMax: input.achievedMax,
    missing: input.missing,
    note: input.note,
  };
}

function finite(values: ReadonlyArray<number | null | undefined>): number[] {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoreMkkTakasProxy(close: readonly number[], volume: readonly number[]): InstitutionalProxyResult {
  if (close.length < 20 || volume.length < 20) {
    return {
      score: null,
      source: "unavailable",
      missing: ["mkk_takas_proxy", "short_interest"],
      note: "MKK takas API verisi yok; birincil proxy için en az 20 günlük fiyat/hacim gerekir.",
    };
  }

  const priceChange5d = close[close.length - 1] / close[close.length - 5] - 1;
  const recentVolume = mean(volume.slice(-5));
  const averageVolume = mean(volume.slice(-20));
  const volumeRatio5d =
    recentVolume !== null && averageVolume !== null && averageVolume > 0
      ? recentVolume / averageVolume
      : null;

  let score = 0.5;
  if (volumeRatio5d !== null) {
    if (volumeRatio5d > 1.5) score += 0.25;
    else if (volumeRatio5d > 1.2) score += 0.15;
    else if (volumeRatio5d < 0.8) score -= 0.15;
  }

  if (priceChange5d > 0.03) score += 0.15;
  else if (priceChange5d > 0.01) score += 0.05;
  else if (priceChange5d < -0.03) score -= 0.15;

  return {
    score: Math.max(0, Math.min(1, score)),
    source: "proxy",
    missing: ["short_interest"],
    note: "MKK takas verisi API ile alınamıyor; yüksek hacim + fiyat hareketi proxy olarak kullanıldı.",
  };
}

function calculateKurumsalAkisFallback(close: readonly number[], volume: readonly number[]): InstitutionalProxyResult {
  const primary = scoreMkkTakasProxy(close, volume);
  if (primary.score !== null) return primary;

  if (close.length >= 5 && volume.length >= 5) {
    const priceMomentum = close[close.length - 1] / close[close.length - 5] - 1;
    const recentVolume = mean(volume.slice(-5));
    const averageVolume = mean(volume);
    const relativeVolume =
      recentVolume !== null && averageVolume !== null && averageVolume > 0
        ? recentVolume / averageVolume
        : 1;
    const momentumComponent = Math.max(-0.1, Math.min(0.1, priceMomentum * 2));
    const volumeComponent = Math.max(-0.1, Math.min(0.1, (relativeVolume - 1) * 0.2));
    const weakScore = Math.max(0, Math.min(1, 0.45 + momentumComponent + volumeComponent));

    return {
      score: weakScore,
      source: "price-volume-proxy",
      missing: ["mkk_takas_proxy", "short_interest"],
      note: "Kurumsal akış için ikincil proxy kullanıldı (göreceli hacim + fiyat momentumu).",
    };
  }

  return {
    score: 0.45,
    source: "price-volume-proxy",
    missing: ["mkk_takas_proxy", "short_interest"],
    note: "Birincil kurumsal veri yok; düşük güvenli nötr price-volume proxy skoru üretildi.",
  };
}

function calculateCatalystFallback(history: MarketHistory): FallbackResult {
  const points = history.points;
  const latestDateRaw = points[points.length - 1]?.date;
  const latestDate = latestDateRaw ? new Date(latestDateRaw) : new Date();
  const month = Number.isFinite(latestDate.getTime()) ? latestDate.getUTCMonth() + 1 : new Date().getUTCMonth() + 1;
  const earningsMonths = [2, 5, 8, 11];
  const distance = Math.min(...earningsMonths.map((m) => {
    const direct = Math.abs(month - m);
    return Math.min(direct, 12 - direct);
  }));
  const seasonalScore = distance === 0 ? 0.8 : distance === 1 ? 0.65 : distance === 2 ? 0.5 : 0.35;

  const close = finite(points.map((point) => point.adjustedClose ?? point.close));
  const volume = finite(points.map((point) => point.volume));
  if (close.length >= 10 && volume.length >= 10) {
    const shortMomentum = close[close.length - 1] / close[close.length - 10] - 1;
    const recentVol = mean(volume.slice(-5));
    const longVol = mean(volume.slice(-10));
    const relVol = recentVol !== null && longVol !== null && longVol > 0 ? recentVol / longVol : 1;
    const momentumBoost = Math.max(-0.08, Math.min(0.08, shortMomentum * 1.5));
    const volumeBoost = Math.max(-0.07, Math.min(0.07, (relVol - 1) * 0.15));
    return {
      score: Math.max(0, Math.min(1, seasonalScore + momentumBoost + volumeBoost)),
      source: "estimate",
      missing: ["earnings_calendar_live", "kap_live_feed"],
      note: "Canlı earnings/KAP verisi yok; mevsimsel earnings döngüsü ve fiyat-hacim etkisiyle tahmini katalizör skoru üretildi.",
    };
  }

  return {
    score: seasonalScore,
    source: "estimate",
    missing: ["earnings_calendar_live", "kap_live_feed"],
    note: "Canlı earnings/KAP verisi yok; mevsimsel earnings döngüsüne göre tahmini katalizör skoru üretildi.",
  };
}

function historicalBandScore(close: readonly number[]): FallbackResult {
  if (close.length < 252) {
    return {
      score: null,
      source: "unavailable",
      missing: ["historical_valuation_band", "relative_valuation", "peg"],
      note: "Değerleme için 3 yıllık çarpan verisi yok; fiyat bandı proxy için de en az 252 gün gerekir.",
    };
  }
  const current = close[close.length - 1];
  const lowerCount = close.filter((value) => value < current).length;
  const percentile3y = lowerCount / close.length;
  return {
    score: 1 - percentile3y,
    source: "market_history",
    missing: ["relative_valuation", "peg"],
    note: "Göreli çarpan ve PEG verisi yok; tarihsel fiyat bandı proxy olarak kullanıldı.",
  };
}

function calculateKazancKalitesiFallback(symbol: string, close: readonly number[]): FallbackResult {
  const baseline = LONG_TERM_QUALITY_BASELINE[baseSymbol(symbol)] ?? 0.52;
  if (close.length < 30) {
    return {
      score: baseline,
      source: "estimate",
      missing: ["fcf_gaap", "accrual_ratio", "working_capital_cycle"],
      note: "Finansal tablo verisi yok; kazanç kalitesi sektör/profil bazlı temel tahminle üretildi.",
    };
  }

  const trend = close[close.length - 1] / close[Math.max(0, close.length - 30)] - 1;
  const trendAdj = Math.max(-0.08, Math.min(0.08, trend * 0.8));
  return {
    score: Math.max(0, Math.min(1, baseline + trendAdj)),
    source: "estimate",
    missing: ["fcf_gaap", "accrual_ratio", "working_capital_cycle"],
    note: "Finansal tablo verisi yok; kazanç kalitesi sektör tabanı + fiyat trendi ile tahmin edildi.",
  };
}

function maxDrawdown(prices: readonly number[]): number | null {
  if (prices.length < 2) return null;
  let peak = prices[0];
  let worst = 0;
  for (const price of prices) {
    if (price > peak) peak = price;
    if (peak > 0) {
      const dd = (price - peak) / peak;
      if (dd < worst) worst = dd;
    }
  }
  return Math.abs(worst);
}

function calculateSermayeTahsisiFallback(symbol: string, close: readonly number[]): FallbackResult {
  const baseline = LONG_TERM_CAPITAL_BASELINE[baseSymbol(symbol)] ?? 0.5;
  if (close.length < 60) {
    return {
      score: baseline,
      source: "estimate",
      missing: ["roic_wacc", "buyback", "debt_metrics"],
      note: "Sermaye tahsisi için finansal tablo yok; sektör tabanlı tahmini skor üretildi.",
    };
  }

  const dd = maxDrawdown(close.slice(-120));
  const drawdownPenalty = dd === null ? 0 : Math.max(0, Math.min(0.12, dd * 0.5));
  const momentum = close[close.length - 1] / close[close.length - 60] - 1;
  const momentumAdj = Math.max(-0.06, Math.min(0.08, momentum * 0.4));

  return {
    score: Math.max(0, Math.min(1, baseline - drawdownPenalty + momentumAdj)),
    source: "estimate",
    missing: ["roic_wacc", "buyback", "debt_metrics"],
    note: "Sermaye tahsisi için finansal tablo yok; düşüş dayanıklılığı + fiyat trendiyle temel tahmin üretildi.",
  };
}

function calculateDegerlemeFallback(close: readonly number[]): FallbackResult {
  const primary = historicalBandScore(close);
  if (primary.score !== null) return primary;

  if (close.length >= 30) {
    const latest = close[close.length - 1];
    const window = close.slice(-30);
    const lowerCount = window.filter((value) => value < latest).length;
    const percentile = lowerCount / window.length;
    return {
      score: 1 - percentile,
      source: "estimate",
      missing: primary.missing,
      note: "3 yıllık band yok; 30 günlük göreli fiyat konumundan tahmini değerleme skoru üretildi.",
    };
  }

  return {
    score: 0.5,
    source: "estimate",
    missing: primary.missing,
    note: "Değerleme verisi yetersiz; nötr tahmini skor kullanıldı.",
  };
}

function calculateBistOzguFallback(symbol: string): FallbackResult {
  const normalized = baseSymbol(symbol);
  const profile = BIST_FX_PROFILE[normalized];
  const rateScore = BIST_RATE_SENSITIVITY[normalized] ?? null;
  const subScores: number[] = [];

  if (profile) {
    const fxScoreByProfile: Record<typeof profile, number> = {
      EXPORTER: 0.5,
      MIXED: 0.5,
      DOMESTIC: 0.5,
      FINANCIAL: 0.5,
      IMPORTER: 0.5,
      UNKNOWN: 0.5,
    };
    subScores.push(fxScoreByProfile[profile]);
  }
  if (rateScore !== null) subScores.push(rateScore);

  if (subScores.length === 0) {
    return {
      score: null,
      source: "unavailable",
      missing: ["fx_position", "tl_real_return", "free_float", "tcmb_sector_impact"],
      note: "BIST özgü veri kaynakları bulunamadı; tahmin üretilmedi.",
    };
  }

  return {
    score: subScores.reduce((sum, value) => sum + value, 0) / subScores.length,
    source: "proxy",
    missing: ["tl_real_return", "free_float"],
    note: "BIST özgü metrik sektör/TCMB yönü proxy ile üretildi; gerçek KAP dipnotu/free-float verisi değildir.",
  };
}

export function buildEquityCriteriaScores(input: EquityCriteriaInput): AnalysisCriteriaScores | undefined {
  const close = input.history.points.map((point) => point.adjustedClose ?? point.close);
  const high = input.history.points.map((point) => point.high);
  const low = input.history.points.map((point) => point.low);
  const volume = input.history.points.map((point) => point.volume);
  const closeValues = finite(close);
  const volumeValues = finite(volume);
  const isBist = isBistEquity(input.symbol, input.providerSymbol);

  if (input.timeHorizon === "1mo") {
    const technical = calcShortTermTechnicalScore({ close, high, low, volume, universeAtrPcts: [] });
    const flowFallback = calculateKurumsalAkisFallback(closeValues, volumeValues);
    const catalystFallback = calculateCatalystFallback(input.history);
    const scores: AnalysisCriteriaScores = {
      teknik_momentum: payload({
        id: "teknik_momentum",
        score: toTechnicalDisplayScore(technical.technicalMomentumScore),
        rawScore: technical.technicalMomentumScore,
        source: "market_history",
        maxPossible: technical.maxPossible,
        achievedMax: technical.achievedMax,
        missing: technical.missing,
        note:
          technical.technicalMomentumScore === null
            ? "Teknik veri eksik; fallback skor üretilmedi."
            : "Teknik momentum 70 puanlık kısa vade sepetinden ölçeklendi.",
      }),
      kurumsal_akis: payload({
        id: "kurumsal_akis",
        score: toDisplayScore(flowFallback.score),
        rawScore: flowFallback.score,
        source: flowFallback.source,
        maxPossible: 1,
        achievedMax: flowFallback.score === null ? 0 : 1,
        missing: flowFallback.missing,
        note: flowFallback.note,
      }),
      katalizor_takvimi: payload({
        id: "katalizor_takvimi",
        score: toDisplayScore(catalystFallback.score),
        rawScore: catalystFallback.score,
        source: catalystFallback.source,
        maxPossible: 1,
        achievedMax: catalystFallback.score === null ? 0 : 1,
        missing: catalystFallback.missing,
        note: catalystFallback.note,
      }),
    };
    return scores;
  }

  const qualityFallback = calculateKazancKalitesiFallback(input.symbol, closeValues);
  const capitalFallback = calculateSermayeTahsisiFallback(input.symbol, closeValues);
  const valuationFallback = calculateDegerlemeFallback(closeValues);
  const scores: AnalysisCriteriaScores = {
    kazanc_kalitesi: payload({
      id: "kazanc_kalitesi",
      score: toDisplayScore(qualityFallback.score),
      rawScore: qualityFallback.score,
      source: qualityFallback.source,
      maxPossible: 1,
      achievedMax: qualityFallback.score === null ? 0 : 1,
      missing: qualityFallback.missing,
      note: qualityFallback.note,
    }),
    sermaye_tahsisi: payload({
      id: "sermaye_tahsisi",
      score: toDisplayScore(capitalFallback.score),
      rawScore: capitalFallback.score,
      source: capitalFallback.source,
      maxPossible: 1,
      achievedMax: capitalFallback.score === null ? 0 : 1,
      missing: capitalFallback.missing,
      note: capitalFallback.note,
    }),
    degerleme: payload({
      id: "degerleme",
      score: toDisplayScore(valuationFallback.score),
      rawScore: valuationFallback.score,
      source: valuationFallback.source,
      maxPossible: 1,
      achievedMax: valuationFallback.score === null ? 0 : 1,
      missing: valuationFallback.missing,
      note: valuationFallback.note,
    }),
  };

  if (isBist) {
    const bistFallback = calculateBistOzguFallback(input.symbol);
    scores.bist_ozgu = payload({
      id: "bist_ozgu",
      score: toDisplayScore(bistFallback.score),
      rawScore: bistFallback.score,
      source: bistFallback.source,
      maxPossible: 1,
      achievedMax: bistFallback.score === null ? 0 : 1,
      missing: bistFallback.missing,
      note: bistFallback.note,
    });
  }

  return scores;
}
