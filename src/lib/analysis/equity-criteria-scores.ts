import type { AnalysisCriteriaScores, AnalysisCriterionScorePayload } from "@/components/tools/correlation/universal-asset-comparison";
import type { AnalyzeTimeHorizon } from "@/components/tools/correlation/universal-asset-comparison";
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
  missing: string[];
  available: boolean;
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

function baseSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/\.IS$/, "");
}

function isBistEquity(symbol: string, providerSymbol: string): boolean {
  const normalized = baseSymbol(symbol);
  return providerSymbol.toUpperCase().endsWith(".IS") || Boolean(BIST_FX_PROFILE[normalized]) || Boolean(BIST_RATE_SENSITIVITY[normalized]);
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

function scoreMkkTakasProxy(close: readonly number[], volume: readonly number[]): InstitutionalProxyResult {
  if (close.length < 20 || volume.length < 20) {
    return {
      score: null,
      missing: ["mkk_takas_proxy", "short_interest"],
      available: false,
      note: "MKK takas API verisi yok; proxy için en az 20 günlük fiyat/hacim verisi gerekir.",
    };
  }

  const priceChange5d = close[close.length - 1] / close[close.length - 5] - 1;
  const recentVolume = volume.slice(-5).reduce((sum, item) => sum + item, 0) / 5;
  const averageVolume = volume.slice(-20).reduce((sum, item) => sum + item, 0) / 20;
  const volumeRatio5d = averageVolume > 0 ? recentVolume / averageVolume : null;
  let score = 0.5;
  let evidence = 0;

  if (volumeRatio5d !== null) {
    evidence += 1;
    if (volumeRatio5d > 1.5) score += 0.25;
    else if (volumeRatio5d > 1.2) score += 0.15;
    else if (volumeRatio5d < 0.8) score -= 0.15;
  }

  evidence += 1;
  if (priceChange5d > 0.03) score += 0.15;
  else if (priceChange5d > 0.01) score += 0.05;
  else if (priceChange5d < -0.03) score -= 0.15;

  if (evidence === 0) {
    return {
      score: null,
      missing: ["mkk_takas_proxy", "short_interest"],
      available: false,
      note: "Kurumsal akış için kanıt yok; tahmin üretilmedi.",
    };
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    missing: ["short_interest"],
    available: true,
    note: "MKK takas verisi API ile alınamıyor; yüksek hacim + fiyat hareketi proxy olarak kullanıldı.",
  };
}

function historicalBandScore(close: readonly number[]): { score: number | null; missing: string[]; note: string } {
  if (close.length < 252) {
    return {
      score: null,
      missing: ["historical_valuation_band", "relative_valuation", "peg"],
      note: "Değerleme için 3 yıllık çarpan verisi yok; fiyat bandı proxy için de en az 252 gün gerekir.",
    };
  }
  const current = close[close.length - 1];
  const lowerCount = close.filter((value) => value < current).length;
  const percentile3y = lowerCount / close.length;
  return {
    score: 1 - percentile3y,
    missing: ["relative_valuation", "peg"],
    note: "Göreli çarpan ve PEG verisi yok; tarihsel fiyat bandı proxy olarak kullanıldı.",
  };
}

function bistSpecificScore(symbol: string): { score: number | null; missing: string[]; note: string } {
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
      missing: ["fx_position", "tl_real_return", "free_float", "tcmb_sector_impact"],
      note: "BIST özgü veri kaynakları bulunamadı; tahmin üretilmedi.",
    };
  }

  return {
    score: subScores.reduce((sum, value) => sum + value, 0) / subScores.length,
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
    const flowProxy = scoreMkkTakasProxy(closeValues, volumeValues);
    const scores: AnalysisCriteriaScores = {
      teknik_momentum: payload({
        id: "teknik_momentum",
        score: toTechnicalDisplayScore(technical.technicalMomentumScore),
        rawScore: technical.technicalMomentumScore,
        source: "market_history",
        maxPossible: technical.maxPossible,
        achievedMax: technical.achievedMax,
        missing: technical.missing,
        note: technical.technicalMomentumScore === null ? "Teknik/katalizör verisi eksik; fallback skor üretilmedi." : "Teknik momentum 70 puanlık kısa vade sepetinden ölçeklendi.",
      }),
      kurumsal_akis: payload({
        id: "kurumsal_akis",
        score: toDisplayScore(flowProxy.score),
        rawScore: flowProxy.score,
        source: flowProxy.available ? "proxy" : "unavailable",
        maxPossible: 1,
        achievedMax: flowProxy.available ? 1 : 0,
        missing: flowProxy.missing,
        note: flowProxy.note,
      }),
      katalizor_takvimi: payload({
        id: "katalizor_takvimi",
        score: null,
        rawScore: null,
        source: "unavailable",
        maxPossible: 10,
        achievedMax: 0,
        missing: ["earnings", "kap"],
        note: "Bilanço takvimi ve KAP erişimi mevcut gateway'de yok; uydurma katalizör gösterilmedi.",
      }),
    };
    if (isBist) {
      const bist = bistSpecificScore(input.symbol);
      scores.bist_ozgu = payload({
        id: "bist_ozgu",
        score: toDisplayScore(bist.score),
        rawScore: bist.score,
        source: bist.score === null ? "unavailable" : "proxy",
        maxPossible: 1,
        achievedMax: bist.score === null ? 0 : 1,
        missing: bist.missing,
        note: bist.note,
      });
    }
    return scores;
  }

  const valuation = historicalBandScore(closeValues);
  const scores: AnalysisCriteriaScores = {
    kazanc_kalitesi: payload({
      id: "kazanc_kalitesi",
      score: null,
      rawScore: null,
      source: "unavailable",
      maxPossible: 3,
      achievedMax: 0,
      missing: ["fcf_gaap", "accrual_ratio", "working_capital_cycle"],
      note: "Yıllık finansal tablolar mevcut gateway'de yok; FCF/GAAP, tahakkuk ve CCC için skor üretilmedi.",
    }),
    sermaye_tahsisi: payload({
      id: "sermaye_tahsisi",
      score: null,
      rawScore: null,
      source: "unavailable",
      maxPossible: 3,
      achievedMax: 0,
      missing: ["roic_wacc", "buyback", "debt_metrics"],
      note: "ROIC/WACC, geri alım ve borç metrikleri için finansal tablo verisi yok; skor üretilmedi.",
    }),
    degerleme: payload({
      id: "degerleme",
      score: toDisplayScore(valuation.score),
      rawScore: valuation.score,
      source: valuation.score === null ? "unavailable" : "market_history",
      maxPossible: 3,
      achievedMax: valuation.score === null ? 0 : 1,
      missing: valuation.missing,
      note: valuation.note,
    }),
  };

  if (isBist) {
    const bist = bistSpecificScore(input.symbol);
    scores.bist_ozgu = payload({
      id: "bist_ozgu",
      score: toDisplayScore(bist.score),
      rawScore: bist.score,
      source: bist.score === null ? "unavailable" : "proxy",
      maxPossible: 1,
      achievedMax: bist.score === null ? 0 : 1,
      missing: bist.missing,
      note: bist.note,
    });
  }

  return scores;
}
