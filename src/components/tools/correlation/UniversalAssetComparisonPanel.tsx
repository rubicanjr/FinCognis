"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { LoaderCircle, Search, ShieldCheck, Sparkles } from "lucide-react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
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

const ACCENT_BLUE = "#22b7ff";
const ACCENT_PURPLE = "#a855f7";

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

type MatrixMetricLabel = "Risk" | "Getiri" | "Likidite" | "Çeşitlendirme";
type MetricDisplayLabel = "Risk" | "Getiri" | "Likidite" | "Çeşitlendirme";

interface ComparisonMatrix {
  assets: string[];
  metrics: {
    label: MatrixMetricLabel;
    values: Record<string, number>;
  }[];
}

interface MetricConfig {
  key: keyof UniversalMetrics;
  matrixLabel: MatrixMetricLabel;
  displayLabel: MetricDisplayLabel;
}

type RadarPoint = {
  metric: MatrixMetricLabel;
} & Record<string, number | string>;

const METRIC_CONFIG: MetricConfig[] = [
  { key: "risk", matrixLabel: "Risk", displayLabel: "Risk" },
  { key: "return", matrixLabel: "Getiri", displayLabel: "Getiri" },
  { key: "liquidity", matrixLabel: "Likidite", displayLabel: "Likidite" },
  {
    key: "diversification",
    matrixLabel: "Çeşitlendirme",
    displayLabel: "Çeşitlendirme",
  },
];

const RADAR_COLOR_BY_SYMBOL: Record<string, string> = {
  TUPRS: "#22b7ff",
  BTC: "#f97316",
  XAU: "#d4af59",
  XPD: "#8b5cf6",
  ASELS: "#14b8a6",
};

const RADAR_FALLBACK_COLORS = [
  "#22b7ff",
  "#38bdf8",
  "#f97316",
  "#8b5cf6",
  "#14b8a6",
  "#6366f1",
  "#22c55e",
  "#ec4899",
];

const PANEL_CARD =
  "rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.78))] p-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

const GLASS_CHIP =
  "border border-white/12 bg-slate-950/55 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(148,163,184,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(2,6,23,0.55)]";

const CHART_NUMBER_TICK = {
  fill: "rgb(226 232 240)",
  fontSize: 11,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Courier New, monospace",
};

const CHART_LABEL_TICK = {
  fill: "rgb(203 213 225)",
  fontSize: 11,
  fontFamily: "var(--font-display), Rajdhani, Inter, sans-serif",
};

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

function createComparisonMatrix(assets: NormalizedAsset[]): ComparisonMatrix {
  const symbols = assets.map((asset) => asset.symbol);

  const metrics = METRIC_CONFIG.map((config) => {
    const values = assets.reduce<Record<string, number>>((acc, asset) => {
      acc[asset.symbol] = clampScore(asset.metrics[config.key]);
      return acc;
    }, {});

    return {
      label: config.matrixLabel,
      values,
    };
  });

  return { assets: symbols, metrics };
}

function toRadarData(matrix: ComparisonMatrix): RadarPoint[] {
  return matrix.metrics.map((metric) => {
    const point: RadarPoint = { metric: metric.label };

    matrix.assets.forEach((assetSymbol) => {
      point[assetSymbol] = metric.values[assetSymbol] ?? 0;
    });

    return point;
  });
}

function metricDisplayLabel(metricLabel: MatrixMetricLabel): MetricDisplayLabel {
  const match = METRIC_CONFIG.find((item) => item.matrixLabel === metricLabel);
  return match ? match.displayLabel : "Risk";
}

function radarSeriesColor(assetSymbol: string, index: number): string {
  return RADAR_COLOR_BY_SYMBOL[assetSymbol] ?? RADAR_FALLBACK_COLORS[index % RADAR_FALLBACK_COLORS.length];
}

function heatCellTone(metricLabel: MatrixMetricLabel, score: number): string {
  const decisionScore = metricLabel === "Risk" ? 11 - score : score;
  const toneIndex = decisionScore >= 8 ? 0 : decisionScore >= 5 ? 1 : 2;
  return HEATMAP_TONES[toneIndex];
}

function rowAnimationStyle(index: number): CSSProperties {
  return { animationDelay: `${index * 100}ms` };
}

function generateInsightLines(matrix: ComparisonMatrix): string[] {
  if (matrix.assets.length < 2) {
    return ["Karşılaştırma içgörüsü için en az iki varlık girin."];
  }

  const lines: string[] = [];

  matrix.metrics.forEach((metric) => {
    const ranked = matrix.assets
      .map((asset) => ({
        asset,
        score: matrix.metrics.find((candidate) => candidate.label === metric.label)?.values[asset] ?? 0,
      }))
      .sort((left, right) => right.score - left.score);

    const strongest = ranked[0];
    const weakest = ranked[ranked.length - 1];
    const spread = strongest.score - weakest.score;

    if (spread >= 1) {
      lines.push(
        `${metricDisplayLabel(metric.label)} tarafında ${strongest.asset} öne çıkıyor (${strongest.score.toFixed(
          1
        )}/10), ${weakest.asset} daha zayıf (${weakest.score.toFixed(1)}/10).`
      );
    }
  });

  if (lines.length === 0) {
    return ["Varlıklar metriklerde birbirine yakın; dengeli bir dağılım görünüyor."];
  }

  if (matrix.assets.length >= 2) {
    const first = matrix.assets[0];
    const second = matrix.assets[1];
    const riskMetric = matrix.metrics.find((metric) => metric.label === "Risk");
    const returnMetric = matrix.metrics.find((metric) => metric.label === "Getiri");

    if (riskMetric && returnMetric) {
      const riskDelta = (riskMetric.values[first] ?? 0) - (riskMetric.values[second] ?? 0);
      const returnDelta = (returnMetric.values[first] ?? 0) - (returnMetric.values[second] ?? 0);

      if (Math.abs(riskDelta) >= 0.8 || Math.abs(returnDelta) >= 0.8) {
        lines.unshift(
          `${first} ve ${second} arasında risk/getiri dengesi ayrışıyor: ${returnDelta >= 0 ? first : second} daha yüksek getiri potansiyeli sunarken, ${riskDelta >= 0 ? second : first} daha düşük risk bandında kalıyor.`
        );
      }
    }
  }

  return lines.slice(0, 3);
}

export default function UniversalAssetComparisonPanel() {
  const [rawInput, setRawInput] = useState("TUPRS ve BTC karşılaştır");
  const [debouncedInput, setDebouncedInput] = useState(rawInput);

  const [catalogData, setCatalogData] = useState<AssetsApiResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null);

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
      body: JSON.stringify({ assets: parsedAssets }),
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
  }, [catalogData, debouncedInput]);

  const assets = useMemo(() => analysisData?.assets ?? [], [analysisData?.assets]);
  const matrix = useMemo(() => createComparisonMatrix(assets), [assets]);
  const totalByAsset = useMemo(
    () =>
      matrix.assets.reduce<Record<string, number>>((acc, assetSymbol) => {
        acc[assetSymbol] = matrix.metrics.reduce((sum, metric) => sum + (metric.values[assetSymbol] ?? 0), 0);
        return acc;
      }, {}),
    [matrix]
  );
  const radarData = useMemo(() => toRadarData(matrix), [matrix]);
  const insightLines = useMemo(() => generateInsightLines(matrix), [matrix]);

  const highestTotal = useMemo(() => {
    if (matrix.assets.length === 0) return null;
    return Math.max(...matrix.assets.map((assetSymbol) => totalByAsset[assetSymbol] ?? 0));
  }, [matrix.assets, totalByAsset]);

  const leadingAssets = useMemo(() => {
    if (highestTotal === null) return new Set<string>();
    return new Set(matrix.assets.filter((assetSymbol) => (totalByAsset[assetSymbol] ?? 0) === highestTotal));
  }, [highestTotal, matrix.assets, totalByAsset]);

  const chartTitle = matrix.assets.length > 1 ? `${matrix.assets.join(" vs ")} Analizi` : "Karşılaştırma Analizi";
  const dataError = catalogError ?? analysisError;
  const liveMeta = analysisData?.meta ?? catalogData?.meta ?? null;
  const liveDataNote = liveMeta
    ? `Canlı ve dinamik piyasa verisi kullanılıyor (${liveMeta.provider}). Son doğrulama: ${formatLiveDataTimestamp(liveMeta.fetchedAtIso)}. ${liveMeta.note}`
    : "Canlı ve dinamik piyasa verisi kullanılıyor. Sentetik/sabit veri akışı kullanılmıyor.";

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
          <h2 className="mt-5 bg-[linear-gradient(92deg,#eaf6ff_10%,#8fddff_45%,#cf9dff_90%)] bg-clip-text font-display text-4xl font-semibold leading-[1.04] tracking-[0.02em] text-transparent sm:text-6xl">
            Varlıkları Aynı Çerçevede Karşılaştırın
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-lg">
            Risk, getiri, likidite ve çeşitlendirme gücünü tek tabloda görün.
          </p>
        </div>

        <div className="mx-auto mt-7 max-w-3xl">
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
                placeholder="Örn: TUPRS, BTC, XAU karşılaştır"
                aria-label="Karşılaştırma varlık girişi"
              />
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-xl border border-[#22b7ff]/35 bg-[#22b7ff]/10 px-3 py-2 text-left text-xs text-[#dff4ff]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#8ddfff]" />
              <p>{liveDataNote}</p>
            </div>
          </div>

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

        {analysisLoading ? (
          <div className="mx-auto mt-4 flex max-w-3xl items-center gap-2 rounded-xl border border-[#22b7ff]/35 bg-[#22b7ff]/12 px-3 py-2 text-xs text-slate-100">
            <LoaderCircle className="h-4 w-4 animate-spin" style={{ color: ACCENT_BLUE }} />
            Karşılaştırma hesaplanıyor...
          </div>
        ) : null}

        {dataError ? (
          <div className="mx-auto mt-4 max-w-3xl rounded-xl border border-warning/40 bg-warning-container/25 px-3 py-2 text-xs text-warning">
            {dataError}
          </div>
        ) : null}

        <div className="mx-auto mt-6 max-w-6xl space-y-4">
          <div className={PANEL_CARD}>
            <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Karşılaştırma Niyeti</p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-[0.01em] text-slate-50">{chartTitle}</p>
          </div>

          <div className={PANEL_CARD}>
            <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Radar Karşılaştırma</p>
            <div className="mt-3 h-[360px] rounded-xl border border-white/10 bg-slate-950/50 p-3 backdrop-blur-xl">
              {matrix.assets.length < 2 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-300">
                  Radar görünümü için en az iki varlık gerekli.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="rgb(148 163 184 / 0.2)" />
                    <PolarAngleAxis dataKey="metric" tick={CHART_LABEL_TICK} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={CHART_NUMBER_TICK} />
                    {matrix.assets.map((assetSymbol, index) => {
                      const seriesColor = radarSeriesColor(assetSymbol, index);
                      return (
                        <Radar
                          key={`radar:${assetSymbol}`}
                          name={assetSymbol}
                          dataKey={assetSymbol}
                          stroke={seriesColor}
                          fill={seriesColor}
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                      );
                    })}
                    <Legend
                      wrapperStyle={{
                        color: "rgb(226 232 240)",
                        fontSize: 11,
                        fontFamily: "var(--font-display), Rajdhani, Inter, sans-serif",
                        letterSpacing: "0.03em",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className={PANEL_CARD}>
            <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Heatmap Karşılaştırma Tablosu</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] border-separate border-spacing-2 text-sm">
                <thead>
                  <tr>
                    <th className={`rounded-md px-3 py-2 text-left font-display text-[11px] font-semibold tracking-[0.06em] text-slate-300 ${GLASS_CHIP}`}>
                      Metrik
                    </th>
                    {matrix.assets.map((assetSymbol) => (
                      <th
                        key={`head:${assetSymbol}`}
                        className={`rounded-md px-3 py-2 text-center font-display text-[11px] font-semibold tracking-[0.06em] text-slate-100 ${GLASS_CHIP}`}
                      >
                        {assetSymbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.metrics.map((metric, rowIndex) => (
                    <tr key={`row:${metric.label}`} className="animate-fade-in-left" style={rowAnimationStyle(rowIndex)}>
                      <td className={`rounded-md px-3 py-2 font-display text-[11px] tracking-[0.04em] text-slate-100 ${GLASS_CHIP}`}>
                        {metricDisplayLabel(metric.label)}
                      </td>
                      {matrix.assets.map((assetSymbol) => {
                        const score = metric.values[assetSymbol] ?? 0;
                        return (
                          <td
                            key={`cell:${metric.label}:${assetSymbol}`}
                            className={`rounded-md px-3 py-2 text-center font-data text-base font-semibold ${GLASS_CHIP} ${heatCellTone(metric.label, score)}`}
                          >
                            {score.toFixed(1)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="animate-fade-in-left" style={rowAnimationStyle(matrix.metrics.length)}>
                    <td className={`rounded-md border-t border-slate-700 px-3 py-2 font-display text-sm font-bold tracking-[0.05em] text-slate-100 ${GLASS_CHIP}`}>
                      Toplam Puan
                    </td>
                    {matrix.assets.map((assetSymbol) => {
                      const total = totalByAsset[assetSymbol] ?? 0;
                      const isLeader = leadingAssets.has(assetSymbol);

                      return (
                        <td
                          key={`cell:total:${assetSymbol}`}
                          className={`rounded-md border-t border-slate-700 px-3 py-2 text-center font-data font-bold ${GLASS_CHIP} ${
                            isLeader ? "text-[#22b7ff]" : "text-slate-100"
                          }`}
                        >
                          {isLeader ? (
                            <span className="inline-flex items-center gap-2 font-display text-2xl leading-none tracking-[0.02em]">
                              ◆ Öncü {total.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-lg">{total.toFixed(1)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className={PANEL_CARD}>
            <p className="font-display text-[11px] font-semibold tracking-[0.08em] text-slate-300">Karar İçgörüsü</p>
            <div className="mt-3 space-y-2">
              {insightLines.map((line) => (
                <p
                  key={line}
                  className={`${GLASS_CHIP} rounded-lg border-l-2 px-3 py-2 text-sm text-slate-100`}
                  style={{ borderLeftColor: ACCENT_PURPLE }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>

          <MetricExplanation />
        </div>
      </div>
    </section>
  );
}
