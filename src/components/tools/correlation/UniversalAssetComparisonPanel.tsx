"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { LoaderCircle, SlidersHorizontal, Sparkles } from "lucide-react";
import {
  AnalyzeResponseSchema,
  AssetsApiResponseSchema,
  DiscoverResponseSchema,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type AssetsApiResponse,
  type DiscoverResponse,
} from "@/lib/contracts/universal-asset-schemas";
import {
  AssetClass,
  type NormalizedAsset,
  type UniversalMetrics,
} from "@/components/tools/correlation/universal-asset-comparison";
import MetricExplanation from "@/components/tools/correlation/MetricExplanation";
import {
  sanitizeNeutralNarratives,
} from "@/lib/compliance/investment-language-guard";
import AssetSearchInput from "@/components/AssetSearchInput";
import type { CatalogAssetClass } from "@/data/asset-catalog";
import type { AssetSelectionPayload } from "@/hooks/useAssetSearch";
import {
  resolveAnalysisCriteria,
  type AnalysisCriterion,
  type StockMarketType,
} from "@/lib/analysis/analysis-criteria";
import { resolveCriterionDisplayScore } from "@/lib/analysis/criteria-display-score";
import { computeCriteriaTotal } from "@/lib/analysis/criteria-total";
import { parseJsonResponseSafely } from "@/lib/http/safe-json-response";

const ACCENT_BLUE = "#22b7ff";

const QUICK_PICK_ASSETS: AssetSelectionPayload[] = [
  { ticker: "TUPRS", yahooSymbol: "TUPRS.IS", assetClass: "equity_bist", exchange: "BIST", currency: "TRY" },
  { ticker: "THYAO", yahooSymbol: "THYAO.IS", assetClass: "equity_bist", exchange: "BIST", currency: "TRY" },
  { ticker: "AAPL", yahooSymbol: "AAPL", assetClass: "equity_us", exchange: "NASDAQ/NYSE", currency: "USD" },
  { ticker: "TSLA", yahooSymbol: "TSLA", assetClass: "equity_us", exchange: "NASDAQ/NYSE", currency: "USD" },
];

const COMPLIANCE_DISCLAIMER =
  "Yatırım tavsiyesi değil; farklı metriklere göre yatırımcı profilinize uygun analiz çerçevesi.";

const NEUTRAL_FALLBACK_TEXT =
  "Bu içerik yatırım tavsiyesi içermez; yalnızca genel karşılaştırmalı profil bilgisidir.";

type PanelMode = "compare" | "discover";
type MatrixMetricLabel =
  | "Karar Simülasyonu"
  | "Risk Görselleştirme"
  | "Davranışsal Hata Analizi"
  | "Senaryo Tabanlı Analiz"
  | "Karar Öncesi Check Mekanizması";

interface ComparisonMatrix {
  assets: string[];
  metrics: {
    label: MatrixMetricLabel;
    values: Record<string, number | null>;
  }[];
}

interface MetricConfig {
  key: keyof UniversalMetrics;
  matrixLabel: MatrixMetricLabel;
}

type DiscoverHorizon = "short" | "long";

type ShortPresetKey =
  | "dengeli"
  | "hizli_hareket"
  | "kurumsal_takip"
  | "katalizor_odakli"
  | "teknik_kurumsal_teyit"
  | "dusuk_gurultu";

type LongPresetKey =
  | "dengeli"
  | "kaliteli_sirket"
  | "ucuz_hisse"
  | "enflasyona_karsi"
  | "sermaye_disiplini"
  | "bist_ozgu_firsat"
  | "kalite_uygun_fiyat";

type DiscoverProfilePreset = {
  key: string;
  label: string;
  summary: string;
  weights: {
    teknikMomentum?: number;
    kurumsalAkis?: number;
    katalizorTakvimi?: number;
    kazancKalitesi?: number;
    sermayeTahsisi?: number;
    degerleme?: number;
    bistOzgu?: number;
  };
};

interface CompareCardData {
  symbol: string;
  marketType: StockMarketType;
  criteriaValues: Array<{
    criterion: AnalysisCriterion;
    value: number | null;
  }>;
  totalScore: number | null;
  balanceScore: number;
  isFallback: boolean;
  hasCriticalDataGap: boolean;
  fallbackReasons: string[];
}

type TimeHorizon = AnalyzeRequest["timeHorizon"];

const METRIC_CONFIG: MetricConfig[] = [
  { key: "risk", matrixLabel: "Karar Simülasyonu" },
  { key: "return", matrixLabel: "Risk Görselleştirme" },
  { key: "liquidity", matrixLabel: "Davranışsal Hata Analizi" },
  {
    key: "diversification",
    matrixLabel: "Senaryo Tabanlı Analiz",
  },
  {
    key: "calmness",
    matrixLabel: "Karar Öncesi Check Mekanizması",
  },
];

const MODE_OPTIONS: Array<{ key: PanelMode; label: string }> = [
  { key: "compare", label: "Karşılaştır" },
  { key: "discover", label: "Profil Keşfet" },
];

const HORIZON_OPTIONS: Array<{ value: DiscoverHorizon; label: string }> = [
  { value: "short", label: "Kısa Vade" },
  { value: "long", label: "Uzun Vade" },
];

const TIME_HORIZON_OPTIONS: Array<{ value: TimeHorizon; label: string }> = [
  { value: "1mo", label: "Kısa Vade (1-4 hafta)" },
  { value: "1y", label: "Uzun Vade (3-12 ay)" },
];

const SHORT_DISCOVER_PRESETS: Record<ShortPresetKey, DiscoverProfilePreset> = {
  dengeli: {
    key: "dengeli",
    label: "Dengeli",
    summary: "Kısa vadede üç metriğe eşit ağırlık verir.",
    weights: { teknikMomentum: 33.33, katalizorTakvimi: 33.33, kurumsalAkis: 33.34 },
  },
  hizli_hareket: {
    key: "hizli_hareket",
    label: "Hızlı Hareket Yakalıyorum",
    summary: "Teknik hareketi önceliklendirir.",
    weights: { teknikMomentum: 65, katalizorTakvimi: 25, kurumsalAkis: 10 },
  },
  kurumsal_takip: {
    key: "kurumsal_takip",
    label: "Kurumsal Takip Ediyorum",
    summary: "Kurumsal akış teyidini önceliklendirir.",
    weights: { kurumsalAkis: 65, teknikMomentum: 20, katalizorTakvimi: 15 },
  },
  katalizor_odakli: {
    key: "katalizor_odakli",
    label: "Katalizör Odaklıyım",
    summary: "Yakın tarihli katalizör etkisini öne alır.",
    weights: { katalizorTakvimi: 65, kurumsalAkis: 25, teknikMomentum: 10 },
  },
  teknik_kurumsal_teyit: {
    key: "teknik_kurumsal_teyit",
    label: "Teknik + Kurumsal Teyit",
    summary: "Teknik ve kurumsal teyidi birlikte arar.",
    weights: { teknikMomentum: 50, kurumsalAkis: 40, katalizorTakvimi: 10 },
  },
  dusuk_gurultu: {
    key: "dusuk_gurultu",
    label: "Düşük Gürültü",
    summary: "Gürültüyü azaltmak için kurumsal/katalizör dengesini öne çıkarır.",
    weights: { kurumsalAkis: 50, katalizorTakvimi: 35, teknikMomentum: 15 },
  },
};

const LONG_DISCOVER_PRESETS: Record<LongPresetKey, DiscoverProfilePreset> = {
  dengeli: {
    key: "dengeli",
    label: "Dengeli",
    summary: "Uzun vadede dört metriğe eşit ağırlık verir.",
    weights: { kazancKalitesi: 25, sermayeTahsisi: 25, degerleme: 25, bistOzgu: 25 },
  },
  kaliteli_sirket: {
    key: "kaliteli_sirket",
    label: "Kaliteli Şirket Arıyorum",
    summary: "Kazanç kalitesi ve sermaye tahsisini önceliklendirir.",
    weights: { kazancKalitesi: 50, sermayeTahsisi: 30, degerleme: 10, bistOzgu: 10 },
  },
  ucuz_hisse: {
    key: "ucuz_hisse",
    label: "Ucuz Hisse Arıyorum",
    summary: "Değerleme odaklı, kalite destekli seçim yapar.",
    weights: { degerleme: 55, kazancKalitesi: 25, bistOzgu: 15, sermayeTahsisi: 5 },
  },
  enflasyona_karsi: {
    key: "enflasyona_karsi",
    label: "Enflasyona Karşı Kazanayım",
    summary: "BIST özgü metriklere ve kazanç kalitesine odaklanır.",
    weights: { bistOzgu: 50, kazancKalitesi: 25, degerleme: 15, sermayeTahsisi: 10 },
  },
  sermaye_disiplini: {
    key: "sermaye_disiplini",
    label: "Sermaye Disiplini",
    summary: "Sermaye tahsisi kalitesini öne alır.",
    weights: { sermayeTahsisi: 55, kazancKalitesi: 30, degerleme: 10, bistOzgu: 5 },
  },
  bist_ozgu_firsat: {
    key: "bist_ozgu_firsat",
    label: "BIST Özgü Fırsat",
    summary: "BIST özgü koşulları merkezde tutar.",
    weights: { bistOzgu: 60, degerleme: 20, kazancKalitesi: 15, sermayeTahsisi: 5 },
  },
  kalite_uygun_fiyat: {
    key: "kalite_uygun_fiyat",
    label: "Kalite + Uygun Fiyat",
    summary: "Kalite ve değerleme dengesini öne çıkarır.",
    weights: { kazancKalitesi: 40, degerleme: 35, sermayeTahsisi: 15, bistOzgu: 10 },
  },
};

type ShortFilters = {
  momentumTolerance: "low" | "medium" | "high";
  catalystExpectation: "near" | "mid" | "irrelevant";
  institutionalConfirmation: "required" | "preferred" | "irrelevant";
  liquidityNeed: "low" | "medium" | "high";
};

type LongFilters = {
  riskSensitivity: "low" | "medium" | "high";
  growthExpectation: "value" | "balanced" | "growth";
  fxSensitivity: "tl_strength" | "neutral" | "tl_weakness";
  minMarketCap: "bist30" | "bist100" | "all";
};

const DEFAULT_SHORT_FILTERS: ShortFilters = {
  momentumTolerance: "medium",
  catalystExpectation: "mid",
  institutionalConfirmation: "preferred",
  liquidityNeed: "medium",
};

const DEFAULT_LONG_FILTERS: LongFilters = {
  riskSensitivity: "medium",
  growthExpectation: "balanced",
  fxSensitivity: "neutral",
  minMarketCap: "bist100",
};

const PANEL_CARD =
  "tools-card rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.78))] p-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

const GLASS_CHIP =
  "tools-chip border border-white/12 bg-slate-950/55 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(148,163,184,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(2,6,23,0.55)]";

const HEATMAP_TONES = ["heat-tone-high", "heat-tone-mid", "heat-tone-low"] as const;

function parseErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (typeof payload !== "object" || payload === null) return fallbackMessage;
  if (!("error" in payload)) return fallbackMessage;
  const candidate = payload.error;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate : fallbackMessage;
}

function hasFetchSupport(): boolean {
  return typeof fetch === "function";
}

function createAbortControllerSafe(): AbortController | null {
  if (typeof AbortController === "undefined") return null;
  try {
    return new AbortController();
  } catch {
    return null;
  }
}

function getRequestSignal(controller: AbortController | null): AbortSignal | undefined {
  return controller?.signal;
}

function isRequestAborted(controller: AbortController | null): boolean {
  return Boolean(controller?.signal.aborted);
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, value));
}

function hasCriticalMetricGap(asset: NormalizedAsset | undefined): boolean {
  void asset;
  return false;
}

function mapCatalogClassToAssetClass(assetClass: CatalogAssetClass): AssetClass {
  if (assetClass === "equity_bist" || assetClass === "equity_us") return AssetClass.Equity;
  if (assetClass === "crypto") return AssetClass.Crypto;
  if (assetClass === "commodity") return AssetClass.Commodity;
  if (assetClass === "fx") return AssetClass.FX;
  if (assetClass === "etf_us") return AssetClass.Fund;
  return AssetClass.Unknown;
}

function marketTypeFromSelection(asset: AssetSelectionPayload | undefined, symbol: string): StockMarketType {
  if (asset?.assetClass === "equity_bist") return "BIST";
  if (asset?.assetClass === "equity_us") return "US";
  return symbol.toUpperCase().endsWith(".IS") ? "BIST" : "US";
}

function criterionScore(asset: NormalizedAsset | undefined, criterion: AnalysisCriterion): number | null {
  return asset ? resolveCriterionDisplayScore(asset, criterion) : null;
}

function createComparisonMatrix(assets: NormalizedAsset[]): ComparisonMatrix {
  const symbols = assets.map((asset) => asset.symbol);

  const metrics = METRIC_CONFIG.map((config) => {
    const values = assets.reduce<Record<string, number | null>>((acc, asset) => {
      const metricValue = asset.metrics[config.key];
      acc[asset.symbol] = typeof metricValue === "number" ? clampScore(metricValue) : null;
      return acc;
    }, {});

    return {
      label: config.matrixLabel,
      values,
    };
  });

  return { assets: symbols, metrics };
}

function heatCellTone(metricLabel: MatrixMetricLabel, score: number): string {
  const decisionScore = metricLabel === "Karar Simülasyonu" ? 11 - score : score;
  const toneIndex = decisionScore >= 8 ? 0 : decisionScore >= 5 ? 1 : 2;
  return HEATMAP_TONES[toneIndex];
}

function rowAnimationStyle(index: number): CSSProperties {
  return { animationDelay: `${index * 100}ms` };
}

function generateCompareInsightLines(matrix: ComparisonMatrix): string[] {
  if (matrix.assets.length < 2) {
    return ["Karşılaştırma içgörüsü için en az iki varlık girin."];
  }

  const riskMetric = matrix.metrics.find((metric) => metric.label === "Karar Simülasyonu");
  const returnMetric = matrix.metrics.find((metric) => metric.label === "Risk Görselleştirme");

  if (!riskMetric || !returnMetric) {
    return ["Karşılaştırma içgörüsü için metrik verisi eksik."];
  }

  const returnLeader = matrix.assets
    .map((asset) => ({ asset, score: returnMetric.values[asset] ?? 0 }))
    .sort((left, right) => right.score - left.score)[0];
  const lowRiskLeader = matrix.assets
    .map((asset) => ({ asset, score: riskMetric.values[asset] ?? 10 }))
    .sort((left, right) => left.score - right.score)[0];

  const volatilityText = (riskMetric.values[returnLeader.asset] ?? 0) >= 7 ? "yüksek oynaklık" : "orta oynaklık";
  const lines = [
    `${returnLeader.asset} → kazanç potansiyeli yüksek, ${volatilityText} profiline yakındır.`,
    `${lowRiskLeader.asset} → daha dengeli ve daha stabil profile yakındır.`,
    `Profil uyumu açısından, yüksek oynaklık toleransı için ${returnLeader.asset}; denge odaklı profil için ${lowRiskLeader.asset} öne çıkmaktadır.`,
  ];

  return sanitizeNeutralNarratives(lines, NEUTRAL_FALLBACK_TEXT);
}

function activeDiscoverPresetMap(horizon: DiscoverHorizon): Record<string, DiscoverProfilePreset> {
  return horizon === "short" ? SHORT_DISCOVER_PRESETS : LONG_DISCOVER_PRESETS;
}

function defaultPresetKeyByHorizon(horizon: DiscoverHorizon): string {
  return horizon === "short" ? "dengeli" : "dengeli";
}

function applyShortFilterModifiers(
  weights: DiscoverProfilePreset["weights"],
  filters: ShortFilters
): DiscoverProfilePreset["weights"] {
  const next = {
    teknikMomentum: weights.teknikMomentum ?? 0,
    kurumsalAkis: weights.kurumsalAkis ?? 0,
    katalizorTakvimi: weights.katalizorTakvimi ?? 0,
  };

  if (filters.momentumTolerance === "low") next.teknikMomentum = Math.max(0, next.teknikMomentum - 10);
  if (filters.momentumTolerance === "high") next.teknikMomentum += 10;

  if (filters.catalystExpectation === "near") next.katalizorTakvimi += 10;
  if (filters.catalystExpectation === "irrelevant") next.katalizorTakvimi = Math.max(0, next.katalizorTakvimi - 10);

  if (filters.institutionalConfirmation === "required") next.kurumsalAkis += 10;
  if (filters.institutionalConfirmation === "irrelevant") next.kurumsalAkis = Math.max(0, next.kurumsalAkis - 10);

  if (filters.liquidityNeed === "high") next.kurumsalAkis += 5;
  if (filters.liquidityNeed === "low") next.teknikMomentum += 5;

  return next;
}

function applyLongFilterModifiers(
  weights: DiscoverProfilePreset["weights"],
  filters: LongFilters
): DiscoverProfilePreset["weights"] {
  const next = {
    kazancKalitesi: weights.kazancKalitesi ?? 0,
    sermayeTahsisi: weights.sermayeTahsisi ?? 0,
    degerleme: weights.degerleme ?? 0,
    bistOzgu: weights.bistOzgu ?? 0,
  };

  if (filters.riskSensitivity === "low") next.degerleme += 8;
  if (filters.riskSensitivity === "high") next.kazancKalitesi += 8;

  if (filters.growthExpectation === "value") next.degerleme += 10;
  if (filters.growthExpectation === "growth") next.kazancKalitesi += 10;

  if (filters.fxSensitivity === "tl_weakness") next.bistOzgu += 10;
  if (filters.fxSensitivity === "tl_strength") next.degerleme += 6;

  if (filters.minMarketCap === "bist30") next.sermayeTahsisi += 8;

  return next;
}

export default function UniversalAssetComparisonPanel() {
  const [mode, setMode] = useState<PanelMode>("compare");
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon | "">("");
  const [unsupportedAssetMessage, setUnsupportedAssetMessage] = useState<string | null>(null);

  const [selectedCompareAssets, setSelectedCompareAssets] = useState<AssetSelectionPayload[]>([]);
  const [compareRequested, setCompareRequested] = useState(false);

  const handleCompareSelectionChange = (assets: AssetSelectionPayload[]) => {
    setSelectedCompareAssets(assets);
    if (assets.length > 0) {
      setUnsupportedAssetMessage(null);
    }
    if (assets.length < 2) {
      setCompareRequested(false);
    }
  };

  const [catalogData, setCatalogData] = useState<AssetsApiResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null);

  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveryData, setDiscoveryData] = useState<DiscoverResponse | null>(null);
  const [discoverProgressText, setDiscoverProgressText] = useState<string | null>(null);
  const [discoverHorizon, setDiscoverHorizon] = useState<DiscoverHorizon>("short");
  const [selectedDiscoverPresetKey, setSelectedDiscoverPresetKey] = useState<string>(defaultPresetKeyByHorizon("short"));
  const [shortFilters, setShortFilters] = useState<ShortFilters>(DEFAULT_SHORT_FILTERS);
  const [longFilters, setLongFilters] = useState<LongFilters>(DEFAULT_LONG_FILTERS);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [discoveryRequested, setDiscoveryRequested] = useState(false);
  const [discoverRunNonce, setDiscoverRunNonce] = useState(0);
  const discoverRequestVersionRef = useRef(0);

  useEffect(() => {
    const controller = createAbortControllerSafe();
    setCatalogError(null);

    if (!hasFetchSupport()) {
      setCatalogData(null);
      setCatalogError("Bu tarayıcı veri isteği (fetch) desteği sunmuyor.");
      return () => controller?.abort();
    }

    fetch("/api/assets", { signal: getRequestSignal(controller) })
      .then(async (response) => {
        const { payload, parseError } = await parseJsonResponseSafely(response);
        if (!response.ok) {
          throw new Error(parseErrorMessage(payload, "Varlık kataloğu yüklenemedi."));
        }
        if (payload === null) {
          throw new Error(
            parseError
              ? `Varlık kataloğu yanıtı çözümlenemedi: ${parseError}`
              : "Varlık kataloğu yanıtı boş geldi."
          );
        }
        return AssetsApiResponseSchema.parse(payload);
      })
      .then((data) => setCatalogData(data))
      .catch((error: unknown) => {
        if (isRequestAborted(controller)) return;
        setCatalogData(null);
        setCatalogError(error instanceof Error ? error.message : "Varlık kataloğu yüklenemedi.");
      });

    return () => controller?.abort();
  }, []);

  useEffect(() => {
    if (mode !== "compare") return;
    if (!catalogData) return;
    if (!compareRequested) return;
    if (!timeHorizon) return;

    if (selectedCompareAssets.length < 2) {
      setAnalysisData(null);
      setAnalysisError(null);
      setAnalysisLoading(false);
      return;
    }

    const parsedAssets: AnalyzeRequest["assets"] = selectedCompareAssets.map((asset) => ({
      symbol: asset.ticker,
      originalInput: asset.ticker,
      class: mapCatalogClassToAssetClass(asset.assetClass),
    }));
    if (parsedAssets.length === 0) {
      setAnalysisData(null);
      setAnalysisError(null);
      setAnalysisLoading(false);
      return;
    }

    const controller = createAbortControllerSafe();
    setAnalysisLoading(true);
    setAnalysisError(null);

    if (!hasFetchSupport()) {
      setAnalysisData(null);
      setAnalysisLoading(false);
      setAnalysisError("Bu tarayıcı analiz isteği (fetch) desteği sunmuyor.");
      return () => controller?.abort();
    }

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assets: parsedAssets, timeHorizon, analysisMode: "compare" }),
      signal: getRequestSignal(controller),
    })
      .then(async (response) => {
        const { payload, parseError } = await parseJsonResponseSafely(response);
        if (!response.ok) {
          throw new Error(parseErrorMessage(payload, "Varlık analizi alınamadı."));
        }
        if (payload === null) {
          throw new Error(
            parseError ? `Varlık analizi yanıtı çözümlenemedi: ${parseError}` : "Varlık analizi yanıtı boş geldi."
          );
        }
        return AnalyzeResponseSchema.parse(payload);
      })
      .then((data) => {
        setAnalysisData(data);
        setAnalysisLoading(false);
      })
      .catch((error: unknown) => {
        if (isRequestAborted(controller)) return;
        setAnalysisData(null);
        setAnalysisLoading(false);
        setAnalysisError(error instanceof Error ? error.message : "Varlık analizi alınamadı.");
      });

    return () => controller?.abort();
  }, [catalogData, compareRequested, mode, selectedCompareAssets, timeHorizon]);

  useEffect(() => {
    setSelectedDiscoverPresetKey(defaultPresetKeyByHorizon(discoverHorizon));
    setShortFilters(DEFAULT_SHORT_FILTERS);
    setLongFilters(DEFAULT_LONG_FILTERS);
  }, [discoverHorizon]);

  const discoverPresetMap = useMemo(() => activeDiscoverPresetMap(discoverHorizon), [discoverHorizon]);
  const selectedDiscoverPreset =
    discoverPresetMap[selectedDiscoverPresetKey] ?? discoverPresetMap[defaultPresetKeyByHorizon(discoverHorizon)];

  const discoverProfileWeights = useMemo(() => {
    if (!selectedDiscoverPreset) return {};
    if (discoverHorizon === "short") {
      return applyShortFilterModifiers(selectedDiscoverPreset.weights, shortFilters);
    }
    return applyLongFilterModifiers(selectedDiscoverPreset.weights, longFilters);
  }, [discoverHorizon, longFilters, selectedDiscoverPreset, shortFilters]);

  const discoverMinMarketCap = useMemo<"bist30" | "bist100" | "all">(() => {
    if (discoverHorizon === "long") return longFilters.minMarketCap;
    return "all";
  }, [discoverHorizon, longFilters.minMarketCap]);

  useEffect(() => {
    if (mode !== "discover") return;
    if (!selectedDiscoverPreset) return;
    if (!discoveryRequested) return;
    if (typeof EventSource === "undefined") {
      setDiscoveryError("Tarayıcı SSE (EventSource) desteği sunmuyor.");
      return;
    }

    const params = new URLSearchParams({
      horizon: discoverHorizon,
      weights: JSON.stringify(discoverProfileWeights),
      minMarketCap: discoverMinMarketCap,
    });

    setDiscoveryLoading(true);
    setDiscoveryError(null);
    setDiscoverProgressText(null);

    const activeVersion = ++discoverRequestVersionRef.current;
    let source: EventSource | null = null;
    const debounceTimer = setTimeout(() => {
      if (discoverRequestVersionRef.current !== activeVersion) return;

      source = new EventSource(`/api/discover/stream?${params.toString()}`);

      source.addEventListener("progress", (event) => {
        if (discoverRequestVersionRef.current !== activeVersion) return;
        try {
          const payload = JSON.parse((event as MessageEvent<string>).data) as { message?: string };
          if (payload.message) setDiscoverProgressText(payload.message);
        } catch {
          // no-op
        }
      });

      source.addEventListener("result", (event) => {
        if (discoverRequestVersionRef.current !== activeVersion) return;
        try {
          const payload = JSON.parse((event as MessageEvent<string>).data);
          const parsed = DiscoverResponseSchema.parse(payload);
          setDiscoveryData(parsed);
          setDiscoveryLoading(false);
          source?.close();
        } catch (error: unknown) {
          setDiscoveryData(null);
          setDiscoveryLoading(false);
          setDiscoveryError(error instanceof Error ? error.message : "Profil keşif sonucu okunamadı.");
          source?.close();
        }
      });

      source.addEventListener("error", (event) => {
        if (discoverRequestVersionRef.current !== activeVersion) return;
        const payload = (event as MessageEvent<string>).data;
        if (payload) {
          try {
            const parsed = JSON.parse(payload) as { message?: string };
            if (parsed.message) {
              setDiscoveryError(parsed.message);
            }
          } catch {
            setDiscoveryError("Profil keşif akışı beklenmedik şekilde kesildi.");
          }
        } else {
          setDiscoveryError("Profil keşif akışı beklenmedik şekilde kesildi.");
        }
        setDiscoveryLoading(false);
        source?.close();
      });
    }, 300);

    return () => {
      clearTimeout(debounceTimer);
      if (source) source.close();
    };
  }, [discoverHorizon, discoverMinMarketCap, discoverProfileWeights, discoverRunNonce, discoveryRequested, mode, selectedDiscoverPreset]);

  const assets = useMemo(() => analysisData?.assets ?? [], [analysisData?.assets]);
  const matrix = useMemo(() => createComparisonMatrix(assets), [assets]);
  const insightLines = useMemo(() => generateCompareInsightLines(matrix), [matrix]);
  const activeCompareHorizon: TimeHorizon = timeHorizon === "" ? "1y" : timeHorizon;
  const compareCards = useMemo<CompareCardData[]>(
    () =>
      matrix.assets.map((assetSymbol) => {
        const sourceAsset = assets.find((asset) => asset.symbol === assetSymbol);
        const selection = selectedCompareAssets.find((asset) => asset.ticker.toUpperCase() === assetSymbol.toUpperCase());
        const marketType = marketTypeFromSelection(selection, assetSymbol);
        const activeCriteria = resolveAnalysisCriteria({ timeHorizon: activeCompareHorizon, marketType });
        const criteriaValues = activeCriteria.map((criterion) => ({
          criterion,
          value: criterionScore(sourceAsset, criterion),
        }));
        const hasCriticalDataGap = hasCriticalMetricGap(sourceAsset);
        const comparableMetrics: number[] = criteriaValues
          .map((entry) => entry.value)
          .filter((value): value is number => typeof value === "number");
        const balanceScore =
          hasCriticalDataGap || comparableMetrics.length === 0
            ? Number.NEGATIVE_INFINITY
            : comparableMetrics.reduce((sum, item) => sum + item, 0) / comparableMetrics.length;
        const totalScore = hasCriticalDataGap ? null : computeCriteriaTotal(criteriaValues.map((entry) => entry.value));

        return {
          symbol: assetSymbol,
          marketType,
          criteriaValues,
          totalScore,
          balanceScore,
          isFallback: Boolean(sourceAsset?.computation?.isFallback),
          hasCriticalDataGap,
          fallbackReasons: sourceAsset?.computation?.fallbackReasons ?? [],
        };
      }),
    [activeCompareHorizon, assets, matrix.assets, selectedCompareAssets]
  );
  const bestBalancedAsset = useMemo(() => {
    const eligible = compareCards.filter((card) => Number.isFinite(card.balanceScore));
    if (eligible.length === 0) return null;
    const sorted = [...eligible].sort((left, right) => right.balanceScore - left.balanceScore);
    return sorted[0] ?? null;
  }, [compareCards]);
  const bestBalancedReason = useMemo(() => {
    if (!bestBalancedAsset) return "";
    const factors = bestBalancedAsset.criteriaValues
      .map((entry) => ({ label: entry.criterion.label.toLocaleLowerCase("tr-TR"), score: entry.value }))
      .filter((item): item is { label: string; score: number } => typeof item.score === "number")
      .sort((left, right) => right.score - left.score)
      .slice(0, 2)
      .map((item) => item.label);
    return factors.join(" + ");
  }, [bestBalancedAsset]);

  const discoverResults = useMemo(() => discoveryData?.results ?? [], [discoveryData]);
  const discoverTopRows = useMemo(() => discoverResults.slice(0, 12), [discoverResults]);

  const title = mode === "compare" ? "Hisseleri Aynı Çerçevede Karşılaştırın" : "Aradığınız Profile Yakın Hisseleri Keşfedin";
  const subtitle =
    "Yatırım tavsiyesi değil; farklı metriklere göre yatırımcı profilinize uygun analiz çerçevesi.";

  const dataError =
    mode === "compare"
      ? unsupportedAssetMessage ?? catalogError ?? analysisError
      : catalogError ?? discoveryError;

  const isLoading = mode === "compare" ? analysisLoading : discoveryLoading;
  const shouldRenderCompareOutputs = mode !== "compare" || !unsupportedAssetMessage;
  const compareStepReady = timeHorizon !== "";
  const canSubmitCompare = compareStepReady && selectedCompareAssets.length >= 2;
  const showCompareResults = mode === "compare" && compareRequested && Boolean(analysisData) && shouldRenderCompareOutputs;
  const showDiscoveryResults = mode === "discover" && discoveryRequested && !discoveryLoading && Boolean(discoveryData);

  function handleDiscoverPresetChange(nextValue: string): void {
    if (!(nextValue in discoverPresetMap)) return;
    setSelectedDiscoverPresetKey(nextValue);
    setDiscoveryRequested(false);
    setDiscoveryData(null);
    setDiscoveryError(null);
  }

  function handleStartCompare(): void {
    if (!canSubmitCompare) return;
    setCompareRequested(true);
    setAnalysisError(null);
  }

  function handleDiscoverHorizonChange(next: DiscoverHorizon): void {
    setDiscoverHorizon(next);
    setAdvancedSettingsOpen(false);
    setDiscoveryRequested(false);
    setDiscoveryData(null);
    setDiscoveryError(null);
  }

  function handleRunDiscover(): void {
    setDiscoveryRequested(true);
    setDiscoveryData(null);
    setDiscoveryError(null);
    setDiscoverProgressText(null);
    setDiscoverRunNonce((current) => current + 1);
  }

  return (
    <section className="tools-panel-shell relative overflow-visible rounded-[34px] border border-[#22b7ff]/20 bg-[#030915]/90 p-4 shadow-[0_40px_120px_rgba(2,8,23,0.72)] sm:p-6">
      <div
        className="tools-panel-shell__aurora pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% -12%, rgb(34 183 255 / 0.38) 0%, transparent 44%), radial-gradient(circle at 84% 3%, rgb(168 85 247 / 0.24) 0%, transparent 38%), linear-gradient(180deg, rgb(2 8 23) 0%, rgb(2 6 18) 100%)",
        }}
      />
      <div className="tools-panel-shell__grid pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#22b7ff]/45 bg-[#22b7ff]/12 px-4 py-1.5 font-display text-[10px] font-semibold tracking-[0.12em] text-[#8ddfff]">
            <Sparkles className="h-3.5 w-3.5" style={{ color: ACCENT_BLUE }} />
            FinCognis Karşılaştırma Motoru
          </p>

          <div className="mt-5 flex justify-center">
            <div className="inline-flex rounded-xl border border-white/12 bg-slate-900/55 p-1 backdrop-blur-xl">
              {MODE_OPTIONS.map((option) => {
                const isActive = option.key === mode;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setMode(option.key)}
                    className={`tools-mode-btn rounded-lg px-4 py-2 font-display text-sm font-semibold transition-all ${
                      isActive
                        ? "tools-mode-btn--active border border-[#22b7ff]/55 bg-[#22b7ff]/18 text-[#dff4ff]"
                        : "tools-mode-btn--idle text-slate-300 hover:text-[#8ddfff]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <h2 className="tools-hero-title mt-5 bg-[linear-gradient(92deg,#eaf6ff_10%,#8fddff_45%,#cf9dff_90%)] bg-clip-text font-display text-4xl font-semibold leading-[1.04] tracking-[0.02em] text-transparent sm:text-6xl">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-lg">{subtitle}</p>
        </div>

        <div className="mx-auto mt-7 max-w-3xl space-y-3">
          {mode === "compare" ? (
            <>
              <div className="rounded-xl border border-white/12 bg-slate-900/45 p-3 backdrop-blur-xl">
                <label className="block space-y-1">
                  <span className="font-display text-[11px] text-slate-300">Adım 1 · Yatırım ufku</span>
                  <select
                    value={timeHorizon}
                    onChange={(event) => {
                      const value = event.target.value as TimeHorizon;
                      setTimeHorizon(value);
                      setCompareRequested(false);
                      setAnalysisData(null);
                    }}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                  >
                    <option value="" disabled>
                      Önce yatırım ufkunu seçin
                    </option>
                    {TIME_HORIZON_OPTIONS.map((option) => (
                      <option key={`horizon:${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {compareStepReady ? (
                <div className="relative z-[90] rounded-xl border border-white/12 bg-slate-900/45 p-3 backdrop-blur-xl">
                  <p className="mb-2 font-display text-[11px] text-slate-300">Adım 2 · Hisse ekleme</p>
                  <AssetSearchInput
                    selectedAssets={selectedCompareAssets}
                    onSelectionChange={handleCompareSelectionChange}
                    onUnsupportedAsset={() => {
                      setUnsupportedAssetMessage("Bu araç yalnızca BIST ve ABD hisselerini destekler");
                      setSelectedCompareAssets([]);
                      setAnalysisData(null);
                      setCompareRequested(false);
                    }}
                    maxSelection={5}
                  />
                  <div className="relative z-10 mt-3 flex flex-wrap gap-2">
                    {QUICK_PICK_ASSETS.map((asset) => (
                      <button
                        key={`quick-pick:${asset.ticker}`}
                        type="button"
                        onClick={() => {
                          setSelectedCompareAssets((prev) => {
                            if (prev.some((item) => item.ticker === asset.ticker) || prev.length >= 5) return prev;
                            setUnsupportedAssetMessage(null);
                            return [...prev, asset];
                          });
                        }}
                        className="rounded-full border border-slate-200/70 bg-slate-950/60 px-3 py-1 font-display text-[11px] tracking-[0.03em] text-slate-100 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#22b7ff]/70 hover:text-[#8ddfff]"
                      >
                        {asset.ticker} ekle
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {canSubmitCompare ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleStartCompare}
                    className="rounded-xl border border-[#22b7ff]/60 bg-[#22b7ff]/20 px-4 py-2 font-display text-sm font-semibold text-[#dff4ff] transition hover:bg-[#22b7ff]/30"
                  >
                    Adım 3 · Hisseleri Karşılaştır
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="rounded-xl border border-white/12 bg-slate-900/45 p-3 backdrop-blur-xl">
                <label className="block space-y-1">
                  <span className="font-display text-[11px] text-slate-300">Adım 1 · Profil ufku</span>
                  <select
                    value={discoverHorizon}
                    onChange={(event) => handleDiscoverHorizonChange(event.target.value as DiscoverHorizon)}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                  >
                    {HORIZON_OPTIONS.map((option) => (
                      <option key={`discover-horizon:${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-[#22b7ff]/20 bg-slate-900/45 p-3 backdrop-blur-xl shadow-[0_14px_36px_rgba(2,6,23,0.55)]">
                <div className="mb-3 flex items-center gap-2 text-[#8ddfff]">
                  <SlidersHorizontal className="h-4 w-4" />
                  <p className="font-display text-xs font-semibold tracking-[0.08em]">Adım 2 · Profil seçimi</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.values(discoverPresetMap).map((preset) => {
                    const isActive = selectedDiscoverPreset?.key === preset.key;
                    return (
                      <button
                        key={`preset-card:${preset.key}`}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => handleDiscoverPresetChange(preset.key)}
                        className={`rounded-xl border p-3 text-left transition ${
                          isActive
                            ? "border-[#22b7ff]/70 bg-[#22b7ff]/14 text-[#dff4ff]"
                            : "border-white/10 bg-slate-950/45 text-slate-200 hover:border-white/25"
                        }`}
                      >
                        <p className="font-display text-sm font-semibold">{preset.label}</p>
                        <p className="mt-1 text-xs text-slate-300">{preset.summary}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-xl border border-white/12 bg-slate-950/60">
                  <button
                    type="button"
                    onClick={() => setAdvancedSettingsOpen((current) => !current)}
                    className="flex w-full items-center justify-between px-3 py-2 font-display text-xs text-slate-200"
                  >
                    <span>Adım 3 · Gelişmiş Ayarlar</span>
                    <span>{advancedSettingsOpen ? "−" : "+"}</span>
                  </button>

                  {advancedSettingsOpen ? (
                    <div className="grid gap-3 border-t border-white/10 px-3 py-3 md:grid-cols-2">
                      {discoverHorizon === "short" ? (
                        <>
                          <label className="space-y-1">
                            <span className="font-display text-[11px] text-slate-300">Momentum Toleransı</span>
                            <select
                              value={shortFilters.momentumTolerance}
                              onChange={(event) => {
                                setShortFilters((current) => ({ ...current, momentumTolerance: event.target.value as ShortFilters["momentumTolerance"] }));
                                setDiscoveryRequested(false);
                                setDiscoveryData(null);
                              }}
                              className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                            >
                              <option value="low">Düşük</option>
                              <option value="medium">Orta</option>
                              <option value="high">Yüksek</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="font-display text-[11px] text-slate-300">Katalizör Beklentisi</span>
                            <select
                              value={shortFilters.catalystExpectation}
                              onChange={(event) => {
                                setShortFilters((current) => ({ ...current, catalystExpectation: event.target.value as ShortFilters["catalystExpectation"] }));
                                setDiscoveryRequested(false);
                                setDiscoveryData(null);
                              }}
                              className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                            >
                              <option value="near">Yakın (7 gün)</option>
                              <option value="mid">Orta (7-30 gün)</option>
                              <option value="irrelevant">Önemsiz</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="font-display text-[11px] text-slate-300">Kurumsal Teyit</span>
                            <select
                              value={shortFilters.institutionalConfirmation}
                              onChange={(event) => {
                                setShortFilters((current) => ({ ...current, institutionalConfirmation: event.target.value as ShortFilters["institutionalConfirmation"] }));
                                setDiscoveryRequested(false);
                                setDiscoveryData(null);
                              }}
                              className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                            >
                              <option value="required">Zorunlu</option>
                              <option value="preferred">Tercih Edilir</option>
                              <option value="irrelevant">Önemsiz</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="font-display text-[11px] text-slate-300">Nakde Çevirme</span>
                            <select
                              value={shortFilters.liquidityNeed}
                              onChange={(event) => {
                                setShortFilters((current) => ({ ...current, liquidityNeed: event.target.value as ShortFilters["liquidityNeed"] }));
                                setDiscoveryRequested(false);
                                setDiscoveryData(null);
                              }}
                              className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                            >
                              <option value="low">Düşük</option>
                              <option value="medium">Orta</option>
                              <option value="high">Yüksek</option>
                            </select>
                          </label>
                        </>
                      ) : (
                        <>
                          <label className="space-y-1">
                            <span className="font-display text-[11px] text-slate-300">Risk Hassasiyeti</span>
                            <select
                              value={longFilters.riskSensitivity}
                              onChange={(event) => {
                                setLongFilters((current) => ({ ...current, riskSensitivity: event.target.value as LongFilters["riskSensitivity"] }));
                                setDiscoveryRequested(false);
                                setDiscoveryData(null);
                              }}
                              className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                            >
                              <option value="low">Düşük</option>
                              <option value="medium">Orta</option>
                              <option value="high">Yüksek</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="font-display text-[11px] text-slate-300">Büyüme Beklentisi</span>
                            <select
                              value={longFilters.growthExpectation}
                              onChange={(event) => {
                                setLongFilters((current) => ({ ...current, growthExpectation: event.target.value as LongFilters["growthExpectation"] }));
                                setDiscoveryRequested(false);
                                setDiscoveryData(null);
                              }}
                              className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                            >
                              <option value="value">Değer Odaklı</option>
                              <option value="balanced">Dengeli</option>
                              <option value="growth">Büyüme Odaklı</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="font-display text-[11px] text-slate-300">Döviz Hassasiyeti</span>
                            <select
                              value={longFilters.fxSensitivity}
                              onChange={(event) => {
                                setLongFilters((current) => ({ ...current, fxSensitivity: event.target.value as LongFilters["fxSensitivity"] }));
                                setDiscoveryRequested(false);
                                setDiscoveryData(null);
                              }}
                              className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                            >
                              <option value="tl_strength">TL Güçlenme</option>
                              <option value="neutral">Nötr</option>
                              <option value="tl_weakness">TL Zayıflama</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="font-display text-[11px] text-slate-300">Minimum Piyasa Değeri</span>
                            <select
                              value={longFilters.minMarketCap}
                              onChange={(event) => {
                                setLongFilters((current) => ({ ...current, minMarketCap: event.target.value as LongFilters["minMarketCap"] }));
                                setDiscoveryRequested(false);
                                setDiscoveryData(null);
                              }}
                              className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                            >
                              <option value="bist30">BIST30</option>
                              <option value="bist100">BIST100</option>
                              <option value="all">Tümü</option>
                            </select>
                          </label>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>

                <p className="mt-3 text-xs text-slate-300">{selectedDiscoverPreset?.summary}</p>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleRunDiscover}
                    className="rounded-xl border border-[#22b7ff]/60 bg-[#22b7ff]/20 px-4 py-2 font-display text-sm font-semibold text-[#dff4ff] transition hover:bg-[#22b7ff]/30"
                  >
                    Adım 4 · Profili Tara
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {isLoading && ((mode === "compare" && compareRequested) || (mode === "discover" && discoveryRequested)) ? (
          <div className="mx-auto mt-4 flex max-w-3xl items-center gap-2 rounded-xl border border-[#22b7ff]/35 bg-[#22b7ff]/12 px-3 py-2 text-xs text-slate-100">
            <LoaderCircle className="h-4 w-4 animate-spin" style={{ color: ACCENT_BLUE }} />
            {mode === "compare"
              ? "Karşılaştırma hesaplanıyor..."
              : discoverProgressText ?? "Profil eşleştirmesi hazırlanıyor..."}
          </div>
        ) : null}

        {dataError && ((mode === "compare" && compareRequested) || (mode === "discover" && discoveryRequested)) ? (
          <div className="mx-auto mt-4 max-w-3xl rounded-xl border border-warning/40 bg-warning-container/25 px-3 py-2 text-xs text-warning">
            {dataError}
          </div>
        ) : null}

        <div className="mx-auto mt-6 max-w-6xl space-y-4">
          {showCompareResults ? (
            <>
              <div className={PANEL_CARD}>
                <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Tek Ekranda Karar Özeti</p>
                {bestBalancedAsset ? (
                  <>
                    <p className="mt-1 font-display text-xl font-semibold text-slate-50 sm:text-2xl">
                      Bu karşılaştırmada en dengeli varlık: <span className="text-[#8ddfff]">{bestBalancedAsset.symbol}</span>
                    </p>
                    <p className="mt-2 text-sm text-slate-300">Sebep: {bestBalancedReason}.</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-300">Karşılaştırma için yeterli veri bulunamadı.</p>
                )}
              </div>

              <div className={PANEL_CARD}>
                <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Karşılaştırılan Varlık Kartları</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {compareCards.map((card, index) => (
                    <article key={`compare-card:${card.symbol}`} className={`${GLASS_CHIP} tools-premium-copy animate-fade-in-left rounded-xl p-4`} style={rowAnimationStyle(index)}>
                      <div className="flex items-center justify-between">
                        <h4 className="tools-card-asset-symbol">{card.symbol}</h4>
                        {card.isFallback ? (
                          <span
                            className="rounded-full border border-white/20 bg-slate-900/70 px-2 py-0.5 text-xs text-slate-200"
                            title={
                              card.hasCriticalDataGap
                                ? "Bu varlıkta veri yetersiz. Puanlar karşılaştırma yerine nötr gösterimde tutulur."
                                : card.fallbackReasons.length > 0
                                  ? `Fallback nedenleri: ${card.fallbackReasons.join(", ")}`
                                  : "Bu veri sınıf ortalamasından üretilmiştir."
                            }
                          >
                            ℹ️
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 rounded-md border border-white/10 bg-slate-950/40 px-3 py-2">
                        <div className="flex items-center justify-between text-slate-100">
                          <span className="tools-card-score-label">FINCOGNIS PUAN</span>
                          <span className="tools-card-score-value">
                            {card.totalScore === null ? "Veri yetersiz" : card.totalScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        {card.criteriaValues.map(({ criterion, value }) => {
                          const toneLabel: MatrixMetricLabel =
                            criterion.sourceMetric === "return"
                              ? "Risk Görselleştirme"
                              : criterion.sourceMetric === "liquidity"
                                ? "Davranışsal Hata Analizi"
                                : criterion.sourceMetric === "diversification"
                                  ? "Senaryo Tabanlı Analiz"
                                  : criterion.sourceMetric === "calmness"
                                    ? "Karar Öncesi Check Mekanizması"
                                    : "Karar Simülasyonu";

                          return (
                            <div key={`${card.symbol}:${criterion.id}`} className="flex items-center justify-between text-slate-200">
                              <span className="tools-card-metric-label">{criterion.label}</span>
                              {value === null ? (
                                <span className="rounded-md border border-white/20 px-2 py-0.5 text-sm font-medium text-slate-300">Veri yok</span>
                              ) : (
                                <span className={`tools-card-metric-value rounded-md border px-2 py-0.5 ${heatCellTone(toneLabel, value)}`}>
                                  {value.toFixed(1)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className={PANEL_CARD}>
                <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Karar İçgörüsü (Kısa)</p>
                <div className="mt-3 space-y-2">
                  {insightLines.slice(0, 3).map((line, index) => (
                    <p key={`insight:${index}`} className={`${GLASS_CHIP} rounded-lg px-3 py-2 text-sm text-slate-100`}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {mode === "compare" && compareRequested && !analysisLoading && !analysisData && !analysisError ? (
            <div className={PANEL_CARD}>
              <p className="text-sm text-slate-300">Karşılaştırma sonucu üretilemedi. Varlık seçimini gözden geçirip tekrar deneyin.</p>
            </div>
          ) : null}

          {showDiscoveryResults ? (
            <>
              <div className={PANEL_CARD}>
                <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Profil Keşif Çıktısı</p>
                <p className="mt-2 text-sm text-slate-200">Tarama Evreni: Tüm BIST hisseleri (.IS doğrulamalı)</p>
                <p className="mt-1 text-xs text-slate-300">
                  Taranan hisse: {discoveryData?.totalScanned ?? 0} · Cache: {discoveryData?.cached ? `Evet (${discoveryData.cacheAge})` : "Hayır"}
                </p>
                {discoveryData?.macroSnapshot ? (
                  <>
                    <p className="mt-1 text-xs text-slate-300">
                      Makro Snapshot: Politika faizi %{discoveryData.macroSnapshot.policyRate.toFixed(2)} · Kaynak: {discoveryData.macroSnapshot.source}
                    </p>
                    {discoveryData.macroSnapshot.source === "last_known_fallback" ? (
                      <p className="mt-1 text-xs text-amber-300">
                        Politika faizi: %{discoveryData.macroSnapshot.policyRate.toFixed(0)} (son bilinen değer — canlı TCMB verisi bekleniyor)
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className={PANEL_CARD}>
                <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Uygun Varlıklar</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {discoverTopRows.map((row, index) => (
                    <article key={`discover:${row.symbol}`} className={`${GLASS_CHIP} animate-fade-in-left rounded-xl p-4`} style={rowAnimationStyle(index)}>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-display text-lg font-semibold text-slate-100">{row.symbol}</h4>
                        <span className="rounded-md border border-[#22b7ff]/35 bg-[#22b7ff]/14 px-2 py-1 font-data text-xs text-[#8ddfff]">
                          Uyum {row.profileFitScore.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">{row.name} · {row.sector}</p>
                      <p className="mt-2 text-sm text-slate-200">Öne çıkan metrik: {row.highlightMetric}</p>
                      {row.macroPenaltyApplied ? (
                        <p className="mt-2 text-xs text-amber-300">⚠️ Bu hisse mevcut faiz ortamında düşük ağırlık aldı.</p>
                      ) : null}
                      {row.dataWarning ? <p className="mt-2 text-xs text-slate-300">{row.dataWarning}</p> : null}
                    </article>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          <div className={PANEL_CARD}>
            <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Uyum ve Bilgilendirme</p>
            <p className="mt-2 text-sm text-slate-200">{mode === "discover" ? discoveryData?.disclaimer ?? COMPLIANCE_DISCLAIMER : COMPLIANCE_DISCLAIMER}</p>
          </div>

          <MetricExplanation />
        </div>
      </div>
    </section>
  );
}

