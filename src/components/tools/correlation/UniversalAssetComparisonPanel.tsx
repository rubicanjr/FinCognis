"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { LoaderCircle, Search, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import {
  AnalyzeResponseSchema,
  AssetsApiResponseSchema,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type AssetsApiResponse,
} from "@/lib/contracts/universal-asset-schemas";
import {
  AssetClass,
  type NormalizedAsset,
  type UniversalMetrics,
} from "@/components/tools/correlation/universal-asset-comparison";
import MetricExplanation from "@/components/tools/correlation/MetricExplanation";
import {
  DEFAULT_PROFILE_PRESET_KEY,
  PROFILE_DISCOVERY_PRESET_ORDER,
  PROFILE_DISCOVERY_PRESETS,
  type PreferenceLevel,
  type ProfilePresetKey,
} from "@/lib/services/profile-discovery-config";
import {
  enforceNeutralInvestmentLanguage,
  sanitizeNeutralNarratives,
} from "@/lib/compliance/investment-language-guard";

const ACCENT_BLUE = "#22b7ff";

const EXAMPLE_INPUTS = [
  "TUPRS ve BTC karşılaştır",
  "XAU, ETH ve THYAO karşılaştır",
  "TUPRS BTC XAU kıyasla",
];

const STOP_WORDS = new Set([
  "eklemeli",
  "karsilastir",
  "karşılaştır",
  "kiyasla",
  "kıyasla",
  "yerine",
  "nasil",
  "nasıl",
  "ve",
  "vs",
  "ile",
  "mi",
  "miyim",
  "koyarsam",
  "degisir",
  "değişir",
]);

const COMPLIANCE_DISCLAIMER =
  "Bu içerik yatırım tavsiyesi değildir. FinCognis, kullanıcıların finansal karar süreçlerini desteklemek amacıyla genel nitelikli karşılaştırmalı analiz ve profil eşleştirmesi sunar. Kullanıcının kişisel finansal durumu, risk tercihi ve yatırım hedefleri dikkate alınmamıştır.";

const NEUTRAL_FALLBACK_TEXT =
  "Bu içerik yatırım tavsiyesi içermez; yalnızca genel karşılaştırmalı profil bilgisidir.";

type PanelMode = "compare" | "discover";
type MatrixMetricLabel = "Risk" | "Getiri" | "Likidite" | "Çeşitlendirme";

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

interface DiscoveryCriteria {
  riskSensitivity: PreferenceLevel;
  returnExpectation: PreferenceLevel;
  liquidityNeed: PreferenceLevel;
  diversificationGoal: PreferenceLevel;
}

interface DiscoveryRow {
  symbol: string;
  assetClassLabel: string;
  risk: number;
  return: number;
  liquidity: number | null;
  diversification: number;
  profileFitScore: number;
  shortExplanation: string;
  isFallback: boolean;
  hasCriticalDataGap: boolean;
}

interface CompareCardData {
  symbol: string;
  risk: number;
  return: number;
  liquidity: number | null;
  diversification: number;
  totalScore: number | null;
  balanceScore: number;
  isFallback: boolean;
  riskUnavailable: boolean;
  returnUnavailable: boolean;
  liquidityUnavailable: boolean;
  hasCriticalDataGap: boolean;
}

type TimeHorizon = AnalyzeRequest["timeHorizon"];

const METRIC_CONFIG: MetricConfig[] = [
  { key: "risk", matrixLabel: "Risk" },
  { key: "return", matrixLabel: "Getiri" },
  { key: "liquidity", matrixLabel: "Likidite" },
  {
    key: "diversification",
    matrixLabel: "Çeşitlendirme",
  },
];

const MODE_OPTIONS: Array<{ key: PanelMode; label: string }> = [
  { key: "compare", label: "Karşılaştır" },
  { key: "discover", label: "Profil Keşfet" },
];

const PREFERENCE_LEVEL_OPTIONS: Array<{ value: PreferenceLevel; label: string }> = [
  { value: "low", label: "Düşük" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Yüksek" },
];

const TIME_HORIZON_OPTIONS: Array<{ value: TimeHorizon; label: string }> = [
  { value: "1mo", label: "1 Ay" },
  { value: "1y", label: "1 Yıl" },
  { value: "5y", label: "5 Yıl" },
];

const PREFERENCE_TARGET_SCORE: Record<PreferenceLevel, number> = {
  low: 3,
  medium: 6,
  high: 9,
};

const CLASS_LABELS: Record<AssetClass, string> = {
  [AssetClass.Equity]: "Hisse",
  [AssetClass.Crypto]: "Kripto",
  [AssetClass.Commodity]: "Emtia",
  [AssetClass.Index]: "Endeks",
  [AssetClass.FX]: "Döviz",
  [AssetClass.Bond]: "Tahvil",
  [AssetClass.Fund]: "Fon",
  [AssetClass.Unknown]: "Diğer",
};

const PANEL_CARD =
  "rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.78))] p-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

const GLASS_CHIP =
  "border border-white/12 bg-slate-950/55 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(148,163,184,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(2,6,23,0.55)]";

const HEATMAP_TONES = [
  "text-[#9ddcff] bg-[#22b7ff]/18 border-[#22b7ff]/35",
  "text-slate-200 bg-slate-500/20 border-slate-300/25",
  "text-stone-200 bg-stone-500/25 border-stone-300/30",
] as const;

function normalizeAliasKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeSymbol(value: string): string {
  return value
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/[^A-Z0-9]/g, "");
}

function stripPunctuation(value: string): string {
  return value
    .replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

function clampNullableScore(value: number | null): number | null {
  if (value === null) return null;
  return clampScore(value);
}

function clampProfileFitScore(value: number): number {
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
}

function hasFallbackReason(asset: NormalizedAsset | undefined, reason: string): boolean {
  return Boolean(asset?.computation?.fallbackReasons.includes(reason));
}

function hasCriticalMetricGap(asset: NormalizedAsset | undefined): boolean {
  return (
    hasFallbackReason(asset, "risk_data_unavailable") ||
    hasFallbackReason(asset, "return_data_unavailable") ||
    hasFallbackReason(asset, "liquidity_data_unavailable") ||
    hasFallbackReason(asset, "risk_target_insufficient_history") ||
    hasFallbackReason(asset, "return_target_insufficient_history")
  );
}

function formatLiveDataTimestamp(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "anlık";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildClassBySymbol(assets: AssetsApiResponse["assets"]): Record<string, AssetClass> {
  return assets.reduce<Record<string, AssetClass>>((acc, asset) => {
    acc[asset.symbol] = asset.class;
    return acc;
  }, {});
}

function extractAnalyzeAssets(rawInput: string, assetsApi: AssetsApiResponse): AnalyzeRequest["assets"] {
  const aliasDictionary = assetsApi.aliasDictionary;
  const classBySymbol = buildClassBySymbol(assetsApi.assets);
  const cleaned = stripPunctuation(rawInput);
  if (!cleaned) return [];

  const words = cleaned.split(/\s+/).filter(Boolean);
  const collected: Array<{ symbol: string; originalInput: string }> = [];

  let index = 0;
  while (index < words.length) {
    let matched = false;
    for (let width = 3; width >= 1; width -= 1) {
      const end = index + width;
      if (end > words.length) continue;

      const phrase = words.slice(index, end).join(" ");
      const phraseKey = normalizeAliasKey(phrase);
      if (!phraseKey || STOP_WORDS.has(phraseKey)) continue;

      const aliased = aliasDictionary[phraseKey];
      if (aliased) {
        collected.push({ symbol: aliased, originalInput: phrase });
        index = end;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    const word = words[index];
    const normalizedWord = normalizeAliasKey(word);
    if (!normalizedWord || STOP_WORDS.has(normalizedWord)) {
      index += 1;
      continue;
    }

    const aliased = aliasDictionary[normalizedWord];
    if (aliased) {
      collected.push({ symbol: aliased, originalInput: word });
      index += 1;
      continue;
    }

    const symbol = normalizeSymbol(word);
    if (symbol.length >= 2) {
      collected.push({ symbol, originalInput: word });
    }
    index += 1;
  }

  const deduped = Object.values(
    collected.reduce<Record<string, { symbol: string; originalInput: string }>>((acc, item) => {
      if (!acc[item.symbol]) acc[item.symbol] = item;
      return acc;
    }, {})
  ).slice(0, 8);

  return deduped.map((item) => ({
    symbol: item.symbol,
    originalInput: item.originalInput,
    class: classBySymbol[item.symbol] ?? AssetClass.Unknown,
  }));
}

function toCatalogAnalyzeAssets(assetsApi: AssetsApiResponse): AnalyzeRequest["assets"] {
  return assetsApi.assets.slice(0, 40).map((asset) => ({
    symbol: asset.symbol,
    originalInput: asset.name,
    class: asset.class,
  }));
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
  const decisionScore = metricLabel === "Risk" ? 11 - score : score;
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

  const riskMetric = matrix.metrics.find((metric) => metric.label === "Risk");
  const returnMetric = matrix.metrics.find((metric) => metric.label === "Getiri");

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

function profileRiskBand(level: PreferenceLevel): string {
  if (level === "high") return "Düşük risk";
  if (level === "medium") return "Orta risk";
  return "Yüksek risk";
}

function isProfilePresetKey(value: string): value is ProfilePresetKey {
  return value in PROFILE_DISCOVERY_PRESETS;
}

function defaultCriteriaByPreset(presetKey: ProfilePresetKey): DiscoveryCriteria {
  const defaults = PROFILE_DISCOVERY_PRESETS[presetKey].defaults;
  return {
    riskSensitivity: defaults.riskSensitivity,
    returnExpectation: defaults.returnExpectation,
    liquidityNeed: defaults.liquidityNeed,
    diversificationGoal: defaults.diversificationGoal,
  };
}

function qualityScoreByTarget(value: number, target: number): number {
  return clampScore(10 - Math.abs(value - target));
}

function riskQuality(riskLevel: number): number {
  return clampScore(11 - riskLevel);
}

function profileDescription(row: Omit<DiscoveryRow, "shortExplanation">): string {
  const notes: string[] = [];

  if (riskQuality(row.risk) >= 7.5) {
    notes.push("Bu varlık düşük oynaklık profiline daha yakındır.");
  }
  if (typeof row.liquidity === "number" && row.liquidity >= 7) {
    notes.push("Nakde çevirme kolaylığı açısından güçlü görünmektedir.");
  }
  if (row.diversification >= 7) {
    notes.push("Portföy dengeleme gücü görece yüksektir.");
  }
  if (row.return >= 7) {
    notes.push("Geçmiş getiri gücü görece yüksektir.");
  }

  if (row.profileFitScore >= 75) {
    notes.push("Seçilen profile göre üst sıralarda yer almaktadır.");
  } else if (row.profileFitScore >= 55) {
    notes.push("Seçilen profile orta düzeyde uyum göstermektedir.");
  } else {
    notes.push("Seçilen profile sınırlı düzeyde uyum göstermektedir.");
  }

  const composed = notes.slice(0, 2).join(" ");
  return enforceNeutralInvestmentLanguage(composed, NEUTRAL_FALLBACK_TEXT);
}

export default function UniversalAssetComparisonPanel() {
  const [mode, setMode] = useState<PanelMode>("compare");
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>("1y");

  const [rawInput, setRawInput] = useState("TUPRS ve BTC karşılaştır");
  const [debouncedInput, setDebouncedInput] = useState(rawInput);

  const [catalogData, setCatalogData] = useState<AssetsApiResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null);

  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveryData, setDiscoveryData] = useState<AnalyzeResponse | null>(null);
  const [discoveryCatalogSignature, setDiscoveryCatalogSignature] = useState("");
  const [discoveryHorizon, setDiscoveryHorizon] = useState<TimeHorizon | null>(null);

  const [selectedPresetKey, setSelectedPresetKey] = useState<ProfilePresetKey>(DEFAULT_PROFILE_PRESET_KEY);
  const [criteria, setCriteria] = useState<DiscoveryCriteria>(defaultCriteriaByPreset(DEFAULT_PROFILE_PRESET_KEY));

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
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(parseErrorMessage(payload, "Varlık kataloğu yüklenemedi."));
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
    const timer = window.setTimeout(() => setDebouncedInput(rawInput), 350);
    return () => window.clearTimeout(timer);
  }, [rawInput]);

  useEffect(() => {
    if (mode !== "compare") return;
    if (!catalogData) return;

    if (debouncedInput.trim().length < 2) {
      setAnalysisData(null);
      setAnalysisError(null);
      setAnalysisLoading(false);
      return;
    }

    const parsedAssets = extractAnalyzeAssets(debouncedInput, catalogData);
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
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(parseErrorMessage(payload, "Varlık analizi alınamadı."));
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
  }, [catalogData, debouncedInput, mode, timeHorizon]);

  const catalogSignature = useMemo(() => {
    if (!catalogData) return "";
    return catalogData.assets
      .map((asset) => asset.symbol)
      .sort((left, right) => left.localeCompare(right))
      .join("|");
  }, [catalogData]);

  useEffect(() => {
    if (mode !== "discover") return;
    if (!catalogData) return;

    if (discoveryData && discoveryCatalogSignature === catalogSignature && discoveryHorizon === timeHorizon) return;

    const discoveryAssets = toCatalogAnalyzeAssets(catalogData);
    if (discoveryAssets.length === 0) {
      setDiscoveryData(null);
      setDiscoveryError("Profil keşfi için uygun varlık listesi bulunamadı.");
      setDiscoveryLoading(false);
      return;
    }

    const controller = createAbortControllerSafe();
    setDiscoveryLoading(true);
    setDiscoveryError(null);

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assets: discoveryAssets, timeHorizon, analysisMode: "discover" }),
      signal: getRequestSignal(controller),
    })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(parseErrorMessage(payload, "Profil keşif verisi alınamadı."));
        }
        return AnalyzeResponseSchema.parse(payload);
      })
      .then((data) => {
        setDiscoveryData(data);
        setDiscoveryCatalogSignature(catalogSignature);
        setDiscoveryHorizon(timeHorizon);
        setDiscoveryLoading(false);
      })
      .catch((error: unknown) => {
        if (isRequestAborted(controller)) return;
        setDiscoveryData(null);
        setDiscoveryLoading(false);
        setDiscoveryError(error instanceof Error ? error.message : "Profil keşif verisi alınamadı.");
      });

    return () => controller?.abort();
  }, [catalogData, catalogSignature, discoveryCatalogSignature, discoveryData, discoveryHorizon, mode, timeHorizon]);

  const assets = useMemo(() => analysisData?.assets ?? [], [analysisData?.assets]);
  const matrix = useMemo(() => createComparisonMatrix(assets), [assets]);
  const totalByAsset = useMemo(
    () =>
      matrix.assets.reduce<Record<string, number | null>>((acc, assetSymbol) => {
        const metricValues = matrix.metrics.map((metric) => metric.values[assetSymbol]);
        if (!metricValues.every((value): value is number => typeof value === "number")) {
          acc[assetSymbol] = null;
          return acc;
        }
        acc[assetSymbol] = metricValues.reduce((sum, value) => sum + value, 0);
        return acc;
      }, {}),
    [matrix]
  );
  const insightLines = useMemo(() => generateCompareInsightLines(matrix), [matrix]);
  const compareCards = useMemo<CompareCardData[]>(
    () =>
      matrix.assets.map((assetSymbol) => {
        const sourceAsset = assets.find((asset) => asset.symbol === assetSymbol);
        const risk = clampScore(matrix.metrics.find((metric) => metric.label === "Risk")?.values[assetSymbol] ?? 0);
        const returnScore = clampScore(
          matrix.metrics.find((metric) => metric.label === "Getiri")?.values[assetSymbol] ?? 0
        );
        const liquidity = clampNullableScore(
          matrix.metrics.find((metric) => metric.label === "Likidite")?.values[assetSymbol] ?? null
        );
        const diversification = clampScore(
          matrix.metrics.find((metric) => metric.label === "Çeşitlendirme")?.values[assetSymbol] ?? 0
        );
        const riskUnavailable = hasFallbackReason(sourceAsset, "risk_data_unavailable");
        const returnUnavailable = hasFallbackReason(sourceAsset, "return_data_unavailable");
        const liquidityUnavailable = hasFallbackReason(sourceAsset, "liquidity_data_unavailable");
        const hasCriticalDataGap = hasCriticalMetricGap(sourceAsset);
        const comparableMetrics: number[] = [diversification];
        if (liquidity !== null) comparableMetrics.push(liquidity);
        if (!riskUnavailable) comparableMetrics.push(riskQuality(risk));
        if (!returnUnavailable) comparableMetrics.push(returnScore);
        const balanceScore =
          hasCriticalDataGap || comparableMetrics.length === 0
            ? Number.NEGATIVE_INFINITY
            : comparableMetrics.reduce((sum, item) => sum + item, 0) / comparableMetrics.length;
        const totalScore = hasCriticalDataGap ? null : totalByAsset[assetSymbol] ?? 0;

        return {
          symbol: assetSymbol,
          risk,
          return: returnScore,
          liquidity,
          diversification,
          totalScore,
          balanceScore,
          isFallback: Boolean(sourceAsset?.computation?.isFallback),
          riskUnavailable,
          returnUnavailable,
          liquidityUnavailable,
          hasCriticalDataGap,
        };
      }),
    [assets, matrix.assets, matrix.metrics, totalByAsset]
  );
  const bestBalancedAsset = useMemo(() => {
    const eligible = compareCards.filter((card) => Number.isFinite(card.balanceScore));
    if (eligible.length === 0) return null;
    const sorted = [...eligible].sort((left, right) => right.balanceScore - left.balanceScore);
    return sorted[0] ?? null;
  }, [compareCards]);
  const bestBalancedReason = useMemo(() => {
    if (!bestBalancedAsset) return "";
    const factors = [
      { label: "düşük risk düzeyi", score: riskQuality(bestBalancedAsset.risk) },
      { label: "yüksek geçmiş getiri gücü", score: bestBalancedAsset.return },
      { label: "güçlü nakde çevirme kolaylığı", score: bestBalancedAsset.liquidity },
      { label: "yüksek portföy dengeleme gücü", score: bestBalancedAsset.diversification },
    ].filter((item): item is { label: string; score: number } => typeof item.score === "number")
      .sort((left, right) => right.score - left.score)
      .slice(0, 2)
      .map((item) => item.label);
    return factors.join(" + ");
  }, [bestBalancedAsset]);

  const selectedPreset = PROFILE_DISCOVERY_PRESETS[selectedPresetKey];

  const discoveryRows = useMemo<DiscoveryRow[]>(() => {
    if (!discoveryData) return [];

    const weights = selectedPreset.weights;
    const riskTarget = PREFERENCE_TARGET_SCORE[criteria.riskSensitivity];
    const returnTarget = PREFERENCE_TARGET_SCORE[criteria.returnExpectation];
    const liquidityTarget = PREFERENCE_TARGET_SCORE[criteria.liquidityNeed];
    const diversificationTarget = PREFERENCE_TARGET_SCORE[criteria.diversificationGoal];

    return discoveryData.assets
      .map((asset) => {
        const risk = clampScore(asset.metrics.risk);
        const returnScore = clampScore(asset.metrics.return);
        const liquidity = clampNullableScore(asset.metrics.liquidity);
        const diversification = clampScore(asset.metrics.diversification);

        const riskFit = qualityScoreByTarget(riskQuality(risk), riskTarget);
        const returnFit = qualityScoreByTarget(returnScore, returnTarget);
        const liquidityFit = qualityScoreByTarget(liquidity ?? 0, liquidityTarget);
        const diversificationFit = qualityScoreByTarget(diversification, diversificationTarget);

        const hasCriticalDataGap = hasCriticalMetricGap(asset);
        const weightedFit =
          riskFit * (weights.risk / 100) +
          returnFit * (weights.return / 100) +
          liquidityFit * (weights.liquidity / 100) +
          diversificationFit * (weights.diversification / 100);

        const profileFitScore =
          hasCriticalDataGap || liquidity === null ? 0 : clampProfileFitScore(weightedFit * 10);

        const baseRow: Omit<DiscoveryRow, "shortExplanation"> = {
          symbol: asset.symbol,
          assetClassLabel: CLASS_LABELS[asset.class],
          risk,
          return: returnScore,
          liquidity,
          diversification,
          profileFitScore,
          isFallback: Boolean(asset.computation?.isFallback),
          hasCriticalDataGap,
        };

        return {
          ...baseRow,
          shortExplanation: hasCriticalDataGap
            ? "Bu varlık için veri yetersiz olduğu için profil uyumu puanı üretilmemiştir."
            : profileDescription(baseRow),
        };
      })
      .sort((left, right) => right.profileFitScore - left.profileFitScore);
  }, [criteria, discoveryData, selectedPreset]);

  const profileTopRows = useMemo(() => discoveryRows.slice(0, 10), [discoveryRows]);
  const profileBandLabel = useMemo(() => profileRiskBand(criteria.riskSensitivity), [criteria.riskSensitivity]);
  const suitableProfileRows = useMemo(() => {
    const highFit = profileTopRows.filter((row) => row.profileFitScore >= 70).slice(0, 4);
    if (highFit.length > 0) return highFit;
    return profileTopRows.slice(0, 3);
  }, [profileTopRows]);
  const higherRiskRows = useMemo(
    () =>
      discoveryRows
        .filter((row) => row.risk >= 7)
        .sort((left, right) => right.risk - left.risk)
        .slice(0, 4),
    [discoveryRows]
  );

  const title = mode === "compare" ? "Varlıkları Aynı Çerçevede Karşılaştırın" : "Aradığınız Profile Yakın Varlıkları Keşfedin";
  const subtitle =
    "Yatırım tavsiyesi değil; Risk Düzeyi, Geçmiş Getiri Gücü, Nakde Çevirme Kolaylığı ve Portföy Dengeleme Gücü metriklerine göre genel profil eşleştirmesi.";

  const dataError = catalogError ?? (mode === "compare" ? analysisError : discoveryError);
  const activeWarnings = mode === "compare" ? analysisData?.warnings ?? [] : discoveryData?.warnings ?? [];
  const liveMeta = (mode === "compare" ? analysisData?.meta : discoveryData?.meta) ?? catalogData?.meta ?? null;
  const liveDataNote = liveMeta
    ? `Canlı ve dinamik piyasa verisi kullanılıyor (${liveMeta.provider}). Son doğrulama: ${formatLiveDataTimestamp(
        liveMeta.fetchedAtIso
      )}. ${liveMeta.note}`
    : "Canlı ve dinamik piyasa verisi kullanılıyor. Sentetik/sabit veri akışı kullanılmıyor.";

  const isLoading = mode === "compare" ? analysisLoading : discoveryLoading;

  function handlePresetChange(nextValue: string): void {
    if (!isProfilePresetKey(nextValue)) return;
    setSelectedPresetKey(nextValue);
    setCriteria(defaultCriteriaByPreset(nextValue));
  }

  function handleCriteriaChange(field: keyof DiscoveryCriteria, value: string): void {
    if (value !== "low" && value !== "medium" && value !== "high") return;
    setCriteria((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-[#22b7ff]/20 bg-[#030915]/90 p-4 shadow-[0_40px_120px_rgba(2,8,23,0.72)] sm:p-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% -12%, rgb(34 183 255 / 0.38) 0%, transparent 44%), radial-gradient(circle at 84% 3%, rgb(168 85 247 / 0.24) 0%, transparent 38%), linear-gradient(180deg, rgb(2 8 23) 0%, rgb(2 6 18) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#22b7ff]/45 bg-[#22b7ff]/12 px-4 py-1.5 font-display text-[10px] font-semibold tracking-[0.12em] text-[#8ddfff]">
            <Sparkles className="h-3.5 w-3.5" style={{ color: ACCENT_BLUE }} />
            FinCognis Comparison Engine
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
                    className={`rounded-lg px-4 py-2 font-display text-sm font-semibold transition-all ${
                      isActive
                        ? "border border-[#22b7ff]/55 bg-[#22b7ff]/18 text-[#dff4ff]"
                        : "text-slate-300 hover:text-[#8ddfff]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <h2 className="mt-5 bg-[linear-gradient(92deg,#eaf6ff_10%,#8fddff_45%,#cf9dff_90%)] bg-clip-text font-display text-4xl font-semibold leading-[1.04] tracking-[0.02em] text-transparent sm:text-6xl">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-lg">{subtitle}</p>
        </div>

        <div className="mx-auto mt-7 max-w-3xl">
          <div className="mb-3 rounded-xl border border-white/12 bg-slate-900/45 p-3 backdrop-blur-xl">
            <label className="block space-y-1">
              <span className="font-display text-[11px] text-slate-300">Yatırım ufku</span>
              <select
                value={timeHorizon}
                onChange={(event) => setTimeHorizon(event.target.value as TimeHorizon)}
                className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
              >
                {TIME_HORIZON_OPTIONS.map((option) => (
                  <option key={`horizon:${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {mode === "compare" ? (
            <div className="rounded-2xl border border-[#22b7ff]/20 bg-slate-900/45 p-2 backdrop-blur-xl shadow-[0_14px_36px_rgba(2,6,23,0.55)]">
              <label htmlFor="asset-query" className="mb-2 block px-2 font-display text-[11px] font-semibold tracking-[0.06em] text-slate-300">
                Karşılaştırma Girdisi
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-white/12 bg-slate-950/65 px-3 py-3 backdrop-blur-xl transition-all duration-300 focus-within:border-[#22b7ff]/60 focus-within:shadow-[0_0_0_1px_rgba(34,183,255,0.38),0_0_28px_rgba(34,183,255,0.22)]">
                <Search className="h-5 w-5 text-slate-300" />
                <input
                  id="asset-query"
                  value={rawInput}
                  onChange={(event) => setRawInput(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400"
                  placeholder="Karşılaştırmak istediğin varlıkları yaz (örn: altın, bitcoin, thy)"
                  aria-label="Karşılaştırma varlık girişi"
                />
              </div>
              <p className="mt-2 px-1 text-xs text-slate-300">Karar vermeden önce farklarını gör.</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLE_INPUTS.map((input) => (
                  <button
                    key={input}
                    type="button"
                    onClick={() => setRawInput(input)}
                    className="rounded-full border border-white/12 bg-slate-900/55 px-3 py-1 font-display text-[11px] tracking-[0.03em] text-slate-200 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#22b7ff]/60 hover:text-[#8ddfff] hover:shadow-[0_10px_28px_rgba(34,183,255,0.2)]"
                  >
                    {input}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#22b7ff]/20 bg-slate-900/45 p-3 backdrop-blur-xl shadow-[0_14px_36px_rgba(2,6,23,0.55)]">
              <div className="mb-3 flex items-center gap-2 text-[#8ddfff]">
                <SlidersHorizontal className="h-4 w-4" />
                <p className="font-display text-xs font-semibold tracking-[0.08em]">Profil Kriterleri</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="font-display text-[11px] text-slate-300">Profil filtresi</span>
                  <select
                    value={selectedPresetKey}
                    onChange={(event) => handlePresetChange(event.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                  >
                    {PROFILE_DISCOVERY_PRESET_ORDER.map((presetKey) => (
                      <option key={presetKey} value={presetKey}>
                        {PROFILE_DISCOVERY_PRESETS[presetKey].label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2">
                  <p className="font-display text-[11px] text-slate-300">Ağırlık dağılımı</p>
                  <p className="mt-1 font-data text-xs text-[#8ddfff]">
                    Risk Düzeyi %{selectedPreset.weights.risk} | Nakde Çevirme Kolaylığı %
                    {selectedPreset.weights.liquidity} | Geçmiş Getiri Gücü %{selectedPreset.weights.return} | Portföy
                    Dengeleme Gücü %{selectedPreset.weights.diversification}
                  </p>
                </div>
                <label className="space-y-1">
                  <span className="font-display text-[11px] text-slate-300">Risk hassasiyeti</span>
                  <select
                    value={criteria.riskSensitivity}
                    onChange={(event) => handleCriteriaChange("riskSensitivity", event.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                  >
                    {PREFERENCE_LEVEL_OPTIONS.map((option) => (
                      <option key={`risk:${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="font-display text-[11px] text-slate-300">Geçmiş getiri gücü beklentisi</span>
                  <select
                    value={criteria.returnExpectation}
                    onChange={(event) => handleCriteriaChange("returnExpectation", event.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                  >
                    {PREFERENCE_LEVEL_OPTIONS.map((option) => (
                      <option key={`return:${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="font-display text-[11px] text-slate-300">Nakde çevirme kolaylığı ihtiyacı</span>
                  <select
                    value={criteria.liquidityNeed}
                    onChange={(event) => handleCriteriaChange("liquidityNeed", event.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                  >
                    {PREFERENCE_LEVEL_OPTIONS.map((option) => (
                      <option key={`liquidity:${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="font-display text-[11px] text-slate-300">Portföy dengeleme hedefi</span>
                  <select
                    value={criteria.diversificationGoal}
                    onChange={(event) => handleCriteriaChange("diversificationGoal", event.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 font-display text-sm text-slate-100 outline-none"
                  >
                    {PREFERENCE_LEVEL_OPTIONS.map((option) => (
                      <option key={`diversification:${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="mt-3 text-xs text-slate-300">{selectedPreset.summary}</p>
            </div>
          )}

          <div className="mt-2 flex items-start gap-2 rounded-xl border border-[#22b7ff]/35 bg-[#22b7ff]/10 px-3 py-2 text-left text-xs text-[#dff4ff]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#8ddfff]" />
            <p>{liveDataNote}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="mx-auto mt-4 flex max-w-3xl items-center gap-2 rounded-xl border border-[#22b7ff]/35 bg-[#22b7ff]/12 px-3 py-2 text-xs text-slate-100">
            <LoaderCircle className="h-4 w-4 animate-spin" style={{ color: ACCENT_BLUE }} />
            {mode === "compare" ? "Karşılaştırma hesaplanıyor..." : "Profil eşleştirmesi hazırlanıyor..."}
          </div>
        ) : null}

        {dataError ? (
          <div className="mx-auto mt-4 max-w-3xl rounded-xl border border-warning/40 bg-warning-container/25 px-3 py-2 text-xs text-warning">
            {dataError}
          </div>
        ) : null}

        {activeWarnings.length > 0 ? (
          <div className="mx-auto mt-4 flex max-w-3xl flex-col gap-2">
            {activeWarnings.map((warning, index) => (
              <div
                key={`analysis-warning:${index}`}
                className="rounded-xl border border-white/15 bg-slate-900/65 px-3 py-2 text-xs text-slate-200"
              >
                {warning.message}
              </div>
            ))}
          </div>
        ) : null}

        <div className="mx-auto mt-6 max-w-6xl space-y-4">
          {mode === "compare" ? (
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
                    <article key={`compare-card:${card.symbol}`} className={`${GLASS_CHIP} animate-fade-in-left rounded-xl p-4`} style={rowAnimationStyle(index)}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-display text-lg font-semibold text-slate-100">{card.symbol}</h4>
                        {card.isFallback ? (
                          <span
                            className="rounded-full border border-white/20 bg-slate-900/70 px-2 py-0.5 text-xs text-slate-200"
                            title={
                              card.hasCriticalDataGap
                                ? "Bu varlıkta veri yetersiz. Puanlar karşılaştırma yerine nötr gösterimde tutulur."
                                : "Bu veri sınıf ortalamasından üretilmiştir."
                            }
                          >
                            ℹ️
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between text-slate-200">
                          <span>Risk Düzeyi</span>
                          {card.riskUnavailable ? (
                            <span className="rounded-md border border-white/20 px-2 py-0.5 font-data text-slate-300">Veri yok</span>
                          ) : (
                            <span className={`rounded-md border px-2 py-0.5 font-data ${heatCellTone("Risk", card.risk)}`}>
                              {card.risk.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-slate-200">
                          <span>Geçmiş Getiri Gücü</span>
                          {card.returnUnavailable ? (
                            <span className="rounded-md border border-white/20 px-2 py-0.5 font-data text-slate-300">Veri yok</span>
                          ) : (
                            <span className={`rounded-md border px-2 py-0.5 font-data ${heatCellTone("Getiri", card.return)}`}>
                              {card.return.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-slate-200">
                          <span>Nakde Çevirme Kolaylığı</span>
                          {card.liquidityUnavailable || card.liquidity === null ? (
                            <span className="rounded-md border border-white/20 px-2 py-0.5 font-data text-slate-300">Veri yok</span>
                          ) : (
                            <span className={`rounded-md border px-2 py-0.5 font-data ${heatCellTone("Likidite", card.liquidity)}`}>
                              {card.liquidity.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-slate-200">
                          <span>Portföy Dengeleme Gücü</span>
                          <span className={`rounded-md border px-2 py-0.5 font-data ${heatCellTone("Çeşitlendirme", card.diversification)}`}>
                            {card.diversification.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-3 border-t border-white/10 pt-2">
                          <div className="flex items-center justify-between text-slate-100">
                            <span className="font-display text-xs">Skor</span>
                            <span className="font-data text-base font-semibold">
                              {card.totalScore === null ? "Veri yetersiz" : card.totalScore.toFixed(1)}
                            </span>
                          </div>
                        </div>
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
          ) : (
            <>
              <div className={PANEL_CARD}>
                <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Profil Keşif Çıktısı</p>
                <p className="mt-2 text-sm text-slate-200">Senin profilin: <span className="font-display font-semibold text-[#8ddfff]">{profileBandLabel}</span></p>
                <p className="mt-1 text-xs text-slate-300">
                  Bu liste yatırım tavsiyesi değildir; genel karşılaştırmalı profil eşleştirmesidir.
                </p>
              </div>

              <div className={PANEL_CARD}>
                <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Uygun Varlıklar</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {suitableProfileRows.map((row, index) => (
                    <article key={`suitable:${row.symbol}`} className={`${GLASS_CHIP} animate-fade-in-left rounded-xl p-4`} style={rowAnimationStyle(index)}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-display text-lg font-semibold text-slate-100">{row.symbol}</h4>
                        <div className="flex items-center gap-2">
                          {row.isFallback ? (
                            <span
                              className="rounded-full border border-white/20 bg-slate-900/70 px-2 py-0.5 text-xs text-slate-200"
                              title="Bu veri sınıf ortalamasından üretilmiştir."
                            >
                              ℹ️
                            </span>
                          ) : null}
                          <span className="rounded-md border border-[#22b7ff]/35 bg-[#22b7ff]/14 px-2 py-1 font-data text-xs text-[#8ddfff]">
                            {row.hasCriticalDataGap ? "Uyum: Veri yetersiz" : `Uyum ${row.profileFitScore.toFixed(1)}`}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-300">{row.assetClassLabel}</p>
                      <p className="mt-2 text-sm text-slate-200">{row.shortExplanation}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className={PANEL_CARD}>
                <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Daha Riskli Varlıklar</p>
                {higherRiskRows.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {higherRiskRows.map((row) => (
                      <li key={`riskier:${row.symbol}`} className={`${GLASS_CHIP} rounded-lg px-3 py-2 text-sm text-slate-100`}>
                        <span className="font-display font-semibold">{row.symbol}</span>
                        {row.isFallback ? (
                          <span className="ml-2 text-xs text-slate-300" title="Bu veri sınıf ortalamasından üretilmiştir.">
                            ℹ️
                          </span>
                        ) : null}{" "}
                        · Risk Düzeyi {row.risk.toFixed(1)} ·{" "}
                        {row.shortExplanation}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-300">Belirgin yüksek riskli varlık bulunmuyor.</p>
                )}
              </div>
            </>
          )}

          <div className={PANEL_CARD}>
            <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Uyum ve Bilgilendirme</p>
            <p className="mt-2 text-sm text-slate-200">{COMPLIANCE_DISCLAIMER}</p>
          </div>

          <MetricExplanation />
        </div>
      </div>
    </section>
  );
}
