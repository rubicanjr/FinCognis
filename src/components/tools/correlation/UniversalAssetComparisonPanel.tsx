"use client";

import { useEffect, useMemo, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Info,
  Lightbulb,
  Search,
  Sparkles,
} from "lucide-react";
import {
  AnalyzeResponseSchema,
  AssetsApiResponseSchema,
  DecisionResponseSchema,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type AssetsApiResponse,
  type DecisionResponse,
} from "@/lib/contracts/universal-asset-schemas";
import {
  AssetClass,
  type AssetParserWarning,
  type NormalizedAsset,
  type UniversalMetrics,
} from "@/components/tools/correlation/universal-asset-comparison";

const EXAMPLE_INPUTS = [
  "BTC eklemeli miyim?",
  "TUPRS ve BTC karşılaştır.",
  "XAU yerine ETH koyarsam risk yoğunluğu nasıl değişir?",
];

const STOP_WORDS = new Set([
  "eklemeli",
  "karsilastir",
  "karşılaştır",
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

const METRIC_SCHEMA: Array<{
  key: keyof UniversalMetrics;
  label: string;
  helper: string;
}> = [
  { key: "risk", label: "Risk Düzeyi", helper: "Puan düştükçe oynaklık riski artar." },
  { key: "return", label: "Getiri Potansiyeli", helper: "Beklenen getirinin görece gücünü gösterir." },
  { key: "liquidity", label: "Likidite", helper: "Pozisyonu hızlı ve düşük maliyetle kapatabilme gücü." },
  {
    key: "diversification",
    label: "Çeşitlendirme Gücü",
    helper: "Portföydeki tek bir risk kaynağına bağımlılığı azaltma etkisi.",
  },
];

const CLASS_LABEL: Record<AssetClass, string> = {
  [AssetClass.Equity]: "Hisse",
  [AssetClass.Crypto]: "Kripto",
  [AssetClass.Commodity]: "Emtia",
  [AssetClass.Index]: "Endeks",
  [AssetClass.FX]: "Döviz",
  [AssetClass.Bond]: "Tahvil",
  [AssetClass.Fund]: "Fon / ETF",
  [AssetClass.Unknown]: "Tanımsız",
};

const CLASS_PILL_STYLE: Record<AssetClass, string> = {
  [AssetClass.Equity]: "border-primary/35 bg-primary-container/45 text-on-surface",
  [AssetClass.Crypto]: "border-secondary/35 bg-secondary-container/35 text-on-secondary",
  [AssetClass.Commodity]: "border-success/35 bg-success-container/30 text-success",
  [AssetClass.Index]: "border-info/35 bg-info-container/35 text-info",
  [AssetClass.FX]: "border-warning/35 bg-warning-container/35 text-warning",
  [AssetClass.Bond]: "border-outline-variant/45 bg-surface-container-high text-on-surface",
  [AssetClass.Fund]: "border-outline-variant/45 bg-surface-container-high text-on-surface",
  [AssetClass.Unknown]: "border-warning/45 bg-warning-container/45 text-warning",
};

const IMPACT_LABEL: Record<DecisionResponse["insight"]["riskConcentrationImpact"], string> = {
  HIGH: "Yüksek",
  MEDIUM: "Orta",
  LOW: "Düşük",
};

function metricTotal(metrics: UniversalMetrics): number {
  return metrics.risk + metrics.return + metrics.liquidity + metrics.diversification;
}

function scoreTone(score: number): string {
  if (score >= 8) return "text-success";
  if (score >= 6) return "text-info";
  if (score >= 4) return "text-warning";
  return "text-error";
}

function rankAssets(assets: NormalizedAsset[]): NormalizedAsset[] {
  return [...assets].sort((left, right) => metricTotal(right.metrics) - metricTotal(left.metrics));
}

function quadrantPosition(score: number): string {
  const bounded = Math.max(1, Math.min(10, score));
  const ratio = ((bounded - 1) / 9) * 100;
  return `${ratio.toFixed(1)}%`;
}

function impactTone(impact: DecisionResponse["insight"]["riskConcentrationImpact"]): string {
  if (impact === "HIGH") return "border-warning/45 bg-warning-container/40 text-warning";
  if (impact === "MEDIUM") return "border-info/40 bg-info-container/40 text-info";
  return "border-success/40 bg-success-container/40 text-success";
}

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
  return value.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function buildClassBySymbol(assets: AssetsApiResponse["assets"]): Record<string, AssetClass> {
  return assets.reduce<Record<string, AssetClass>>((acc, asset) => {
    acc[asset.symbol] = asset.class;
    return acc;
  }, {});
}

function extractAnalyzeAssets(
  rawInput: string,
  assetsApi: AssetsApiResponse
): AnalyzeRequest["assets"] {
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
  ).slice(0, 10);

  return deduped.map((item) => ({
    symbol: item.symbol,
    originalInput: item.originalInput,
    class: classBySymbol[item.symbol] ?? AssetClass.Unknown,
  }));
}

export default function UniversalAssetComparisonPanel() {
  const [rawInput, setRawInput] = useState("BTC eklemeli miyim?");
  const [riskProfile, setRiskProfile] = useState(5);
  const [debouncedInput, setDebouncedInput] = useState(rawInput);
  const [debouncedRiskProfile, setDebouncedRiskProfile] = useState(riskProfile);

  const [catalogData, setCatalogData] = useState<AssetsApiResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null);

  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionData, setDecisionData] = useState<DecisionResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogError(null);

    fetch("/api/assets", { signal: controller.signal })
      .then((response) => response.json())
      .then((json) => AssetsApiResponseSchema.parse(json))
      .then((data) => setCatalogData(data))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCatalogData(null);
        setCatalogError(
          error instanceof Error
            ? error.message
            : "Varlık kataloğu yüklenemedi."
        );
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedInput(rawInput);
      setDebouncedRiskProfile(riskProfile);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [rawInput, riskProfile]);

  useEffect(() => {
    if (!catalogData) return;

    if (debouncedInput.trim().length < 2) {
      setAnalysisData(null);
      setAnalysisError(null);
      setAnalysisLoading(false);
      return;
    }

    const analyzeAssets = extractAnalyzeAssets(debouncedInput, catalogData);
    if (analyzeAssets.length === 0) {
      setAnalysisData(null);
      setAnalysisError(null);
      setAnalysisLoading(false);
      return;
    }

    const controller = new AbortController();
    setAnalysisLoading(true);
    setAnalysisError(null);

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assets: analyzeAssets }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((json) => AnalyzeResponseSchema.parse(json))
      .then((data) => {
        setAnalysisData(data);
        setAnalysisLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAnalysisData(null);
        setAnalysisLoading(false);
        setAnalysisError(
          error instanceof Error
            ? error.message
            : "Varlık analizi yanıtı doğrulanamadı."
        );
      });

    return () => controller.abort();
  }, [catalogData, debouncedInput]);

  useEffect(() => {
    if (debouncedInput.trim().length < 2) {
      setDecisionData(null);
      setDecisionError(null);
      setDecisionLoading(false);
      return;
    }

    const controller = new AbortController();
    setDecisionLoading(true);
    setDecisionError(null);

    fetch("/api/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: debouncedInput,
        currentRiskProfile: debouncedRiskProfile,
      }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((json) => DecisionResponseSchema.parse(json))
      .then((data) => {
        setDecisionData(data);
        setDecisionLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setDecisionData(null);
        setDecisionLoading(false);
        setDecisionError(
          error instanceof Error
            ? error.message
            : "Karar motoru yanıtı doğrulanamadı."
        );
      });

    return () => controller.abort();
  }, [debouncedInput, debouncedRiskProfile]);

  const assets = useMemo(
    () => analysisData?.assets ?? decisionData?.assets ?? [],
    [analysisData?.assets, decisionData?.assets]
  );
  const warnings: AssetParserWarning[] = useMemo(() => {
    const merged = [...(analysisData?.warnings ?? []), ...(decisionData?.warnings ?? [])];
    return merged.filter(
      (warning, index) =>
        merged.findIndex(
          (item) =>
            item.level === warning.level && item.message === warning.message
        ) === index
    );
  }, [analysisData?.warnings, decisionData?.warnings]);

  const rankedAssets = useMemo(() => rankAssets(assets), [assets]);
  const focusAsset = decisionData?.focusAssetSymbol
    ? rankedAssets.find((asset) => asset.symbol === decisionData.focusAssetSymbol) ?? null
    : rankedAssets[0] ?? null;

  return (
    <div className="rounded-[30px] border border-outline-variant/35 bg-gradient-to-b from-surface-container-low via-surface-container to-surface p-5 shadow-[0_24px_60px_rgb(var(--on-surface)/0.08)] sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary ring-1 ring-secondary/25">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.22em] text-secondary">
            FinCognis Karar Asistanı
          </p>
          <h3 className="font-headline text-2xl font-extrabold text-on-surface">Soru Sor, Etkiyi Anında Gör</h3>
        </div>
      </div>

      <p className="mt-2 text-xs text-on-surface-variant sm:text-sm">
        Bu alan yatırım tavsiyesi vermez. Sadece risk yoğunluğu ve birlikte hareket etkisini, anlaşılır bir karar diliyle sunar.
      </p>

      <div className="mt-4 rounded-3xl border border-outline-variant/30 bg-surface p-3">
        <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
          <Search className="h-5 w-5 text-on-surface-variant" />
          <input
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/70"
            placeholder="BTC eklemeli miyim? veya TUPRS ve BTC karşılaştır."
            aria-label="Karar sorusu girişi"
          />
        </div>

        <div className="mt-3 rounded-xl border border-outline-variant/25 bg-surface-container-low px-3 py-2">
          <label
            htmlFor="risk-profile"
            className="mb-1 block text-[11px] font-semibold tracking-[0.12em] text-on-surface-variant"
          >
            Mevcut Risk Profili: {riskProfile}/10
          </label>
          <input
            id="risk-profile"
            type="range"
            min={1}
            max={10}
            value={riskProfile}
            onChange={(event) => setRiskProfile(Number(event.target.value))}
            className="w-full accent-secondary"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_INPUTS.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setRawInput(sample)}
              className="rounded-full border border-outline-variant/25 bg-surface-container-low px-3 py-1 text-[11px] text-on-surface-variant transition-colors hover:border-secondary/35 hover:text-secondary"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {assets.map((asset) => (
          <span
            key={`${asset.symbol}:${asset.originalInput}`}
            title={
              asset.class === AssetClass.Unknown
                ? "Bu varlık tanınamadı. Geçerli varlıklar için analiz devam ediyor."
                : `${asset.symbol} -> ${CLASS_LABEL[asset.class]}`
            }
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${CLASS_PILL_STYLE[asset.class]}`}
          >
            {asset.class === AssetClass.Unknown ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
            <span>{asset.symbol}</span>
            <span className="opacity-80">- {CLASS_LABEL[asset.class]}</span>
          </span>
        ))}
      </div>

      {analysisLoading || decisionLoading ? (
        <div className="mt-3 rounded-xl border border-outline-variant/25 bg-surface p-3 text-xs text-on-surface-variant">
          Karar motoru güncelleniyor...
        </div>
      ) : null}

      {catalogError || analysisError || decisionError ? (
        <div className="mt-3 rounded-xl border border-warning/35 bg-warning-container/35 px-3 py-2 text-xs text-warning">
          {catalogError ?? analysisError ?? decisionError}
        </div>
      ) : null}

      {decisionData ? (
        <div className="mt-4 rounded-2xl border border-secondary/45 bg-gradient-to-br from-secondary/10 via-surface to-surface p-4 shadow-[0_0_0_1px_rgb(var(--secondary)/0.22)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-secondary">Karar Özeti</p>
              <h4 className="mt-1 flex items-center gap-2 font-headline text-xl font-bold text-on-surface">
                <Lightbulb className="h-5 w-5 text-secondary" />
                İlk Bakışta Etki
              </h4>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${impactTone(decisionData.insight.riskConcentrationImpact)}`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Yoğunluk Etkisi: {IMPACT_LABEL[decisionData.insight.riskConcentrationImpact]}
            </span>
          </div>

          <p className="mt-3 text-sm font-semibold text-on-surface">{decisionData.insight.primaryVerdict}</p>
          <p className="mt-1 text-sm text-on-surface-variant">{decisionData.insight.correlationNote}</p>
          <p className="mt-1 text-sm text-on-surface-variant">{decisionData.insight.actionFrame}</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                <Activity className="h-4 w-4 text-secondary" />
                Risk / Fayda Haritası
              </p>
              <div className="relative h-44 rounded-lg border border-outline-variant/30 bg-surface">
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-outline-variant/35" />
                <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-outline-variant/35" />
                <p className="absolute left-2 top-2 text-[10px] text-on-surface-variant">Düşük Risk / Güçlü Fayda</p>
                <p className="absolute right-2 bottom-2 text-[10px] text-on-surface-variant">Yüksek Risk / Sınırlı Fayda</p>
                {focusAsset ? (
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: quadrantPosition(decisionData.quant.riskExposureScore),
                      top: `calc(100% - ${quadrantPosition(decisionData.quant.benefitScore)})`,
                    }}
                  >
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-secondary shadow-lg shadow-secondary/30" />
                    <p className="mt-1 -translate-x-1/2 text-[10px] font-semibold text-on-surface">{focusAsset.symbol}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                <Activity className="h-4 w-4 text-secondary" />
                Sayısal Etki Özeti
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-surface p-2">
                  <p className="text-on-surface-variant">Baz Risk Yoğunluğu</p>
                  <p className="mt-1 font-semibold text-on-surface">{decisionData.quant.baselineVolatility.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-surface p-2">
                  <p className="text-on-surface-variant">Yeni Risk Yoğunluğu</p>
                  <p className="mt-1 font-semibold text-on-surface">{decisionData.quant.projectedVolatility.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-surface p-2">
                  <p className="text-on-surface-variant">Risk Yoğunluğu Değişimi</p>
                  <p className="mt-1 font-semibold text-on-surface">{decisionData.quant.riskDensityDelta.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-surface p-2">
                  <p className="text-on-surface-variant">Ortalama Korelasyon</p>
                  <p className="mt-1 font-semibold text-on-surface">{decisionData.quant.averageCorrelation.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-surface p-2">
                  <p className="text-on-surface-variant">Sınıf Yoğunluğu Etkisi</p>
                  <p className="mt-1 font-semibold text-on-surface">%{decisionData.quant.concentrationDeltaPct.toFixed(1)}</p>
                </div>
                <div className="rounded-lg bg-surface p-2">
                  <p className="text-on-surface-variant">Fayda Skoru</p>
                  <p className="mt-1 font-semibold text-on-surface">{decisionData.quant.benefitScore.toFixed(1)} / 10</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Tabs.Root defaultValue="overview" className="mt-4">
        <Tabs.List className="grid grid-cols-3 gap-2 rounded-xl border border-outline-variant/25 bg-surface p-2">
          <Tabs.Trigger
            value="overview"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-on-surface-variant data-[state=active]:bg-surface-container-high data-[state=active]:text-on-surface"
          >
            <Activity className="h-4 w-4" />
            Veri
          </Tabs.Trigger>
          <Tabs.Trigger
            value="matrix"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-on-surface-variant data-[state=active]:bg-surface-container-high data-[state=active]:text-on-surface"
          >
            <BarChart3 className="h-4 w-4" />
            Kriter Matrisi
          </Tabs.Trigger>
          <Tabs.Trigger
            value="warnings"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-on-surface-variant data-[state=active]:bg-surface-container-high data-[state=active]:text-on-surface"
          >
            <AlertTriangle className="h-4 w-4" />
            Uyarılar
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className="mt-3 rounded-2xl border border-outline-variant/25 bg-surface p-4">
          {rankedAssets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="text-on-surface-variant">
                  <tr className="border-b border-outline-variant/15">
                    <th className="px-2 py-2 text-left text-[11px] uppercase tracking-[0.12em]">Varlık</th>
                    <th className="px-2 py-2 text-center text-[11px] uppercase tracking-[0.12em]">Risk Düzeyi</th>
                    <th className="px-2 py-2 text-center text-[11px] uppercase tracking-[0.12em]">Getiri Potansiyeli</th>
                    <th className="px-2 py-2 text-center text-[11px] uppercase tracking-[0.12em]">Likidite</th>
                    <th className="px-2 py-2 text-center text-[11px] uppercase tracking-[0.12em]">Çeşitlendirme Gücü</th>
                    <th className="px-2 py-2 text-center text-[11px] uppercase tracking-[0.12em]">Toplam Etki</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedAssets.map((asset) => (
                    <tr key={`${asset.symbol}:row`} className="border-b border-outline-variant/10">
                      <td className="px-2 py-2">
                        <p className="font-semibold text-on-surface">{asset.symbol}</p>
                        <p className="text-[11px] text-on-surface-variant">{CLASS_LABEL[asset.class]}</p>
                      </td>
                      <td className={`px-2 py-2 text-center font-semibold ${scoreTone(asset.metrics.risk)}`}>
                        {asset.metrics.risk.toFixed(1)}
                      </td>
                      <td className={`px-2 py-2 text-center font-semibold ${scoreTone(asset.metrics.return)}`}>
                        {asset.metrics.return.toFixed(1)}
                      </td>
                      <td className={`px-2 py-2 text-center font-semibold ${scoreTone(asset.metrics.liquidity)}`}>
                        {asset.metrics.liquidity.toFixed(1)}
                      </td>
                      <td
                        className={`px-2 py-2 text-center font-semibold ${scoreTone(
                          asset.metrics.diversification
                        )}`}
                      >
                        {asset.metrics.diversification.toFixed(1)}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-on-surface">{metricTotal(asset.metrics).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant">Karar sorusu girildiğinde sayısal detaylar burada görünür.</p>
          )}
        </Tabs.Content>

        <Tabs.Content value="matrix" className="mt-3 rounded-2xl border border-outline-variant/25 bg-surface p-4">
          {rankedAssets.length > 0 ? (
            <div className="space-y-3">
              {METRIC_SCHEMA.map((metric) => (
                <div key={metric.key} className="rounded-xl bg-surface-container-low p-3">
                  <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                    {metric.label}
                    <Info className="h-3.5 w-3.5" aria-label={metric.helper} />
                  </p>
                  <div className="mt-2 space-y-2">
                    {rankedAssets.map((asset) => (
                      <div key={`${asset.symbol}:${metric.key}`} className="grid grid-cols-[70px_1fr_40px] items-center gap-2">
                        <span className="text-[11px] font-semibold text-on-surface">{asset.symbol}</span>
                        <div className="h-2 rounded-full bg-surface-container-high">
                          <div
                            className="h-2 rounded-full bg-secondary/60"
                            style={{ width: `${asset.metrics[metric.key] * 10}%` }}
                          />
                        </div>
                        <span className="text-right text-[11px] text-on-surface-variant">{asset.metrics[metric.key].toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant">Kriter matrisi için önce bir karar sorusu girin.</p>
          )}
        </Tabs.Content>

        <Tabs.Content value="warnings" className="mt-3 rounded-2xl border border-outline-variant/25 bg-surface p-4">
          {warnings.length > 0 ? (
            <div className="space-y-2">
              {warnings.map((warning) => (
                <div
                  key={`${warning.level}:${warning.message}`}
                  className={`rounded-xl border px-3 py-2 text-xs ${
                    warning.level === "warning"
                      ? "border-warning/35 bg-warning-container/35 text-warning"
                      : "border-info/35 bg-info-container/35 text-info"
                  }`}
                >
                  {warning.message}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant">Uyarı bulunmuyor.</p>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
