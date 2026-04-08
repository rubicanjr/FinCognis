"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { runCorrelationAnalysis } from "@/components/tools/correlation/engine";
import { PortfolioHeatmap, ContagionMap } from "@/components/tools/correlation/Visuals";
import { ASSET_UNIVERSE, CATEGORY_OPTIONS, WINDOW_OPTIONS, getAssetsByCategory } from "@/components/tools/correlation/universe";
import type { CategoryId, WindowKey } from "@/components/tools/correlation/types";

const MIN_PORTFOLIO_SIZE = 5;
const MAX_PORTFOLIO_SIZE = 10;

function metricColor(value: number) {
  if (value >= 0.75) return "text-red-400";
  if (value >= 0.5) return "text-amber-400";
  if (value >= 0.25) return "text-blue-400";
  return "text-emerald-400";
}

function scenarioTone(loss: number) {
  if (loss <= -0.35) return "text-red-400";
  if (loss <= -0.2) return "text-amber-400";
  if (loss <= -0.1) return "text-blue-400";
  return "text-emerald-400";
}

function fmtPercent(value: number, digits = 2) {
  return `${(value * 100).toFixed(digits)}%`;
}

export default function CorrelationTest() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("kripto");
  const initialCategoryAssets = getAssetsByCategory("kripto");
  const [assetAId, setAssetAId] = useState(initialCategoryAssets[0]?.id ?? "btc");
  const [assetBId, setAssetBId] = useState(initialCategoryAssets[1]?.id ?? "eth");
  const [windowKey, setWindowKey] = useState<WindowKey>("d250");
  const [portfolioIds, setPortfolioIds] = useState<string[]>([
    "btc",
    "eth",
    "xauusd",
    "thyao",
    "aapl",
    "msft",
  ]);
  const [shareStatus, setShareStatus] = useState("");

  const deferredAssetA = useDeferredValue(assetAId);
  const deferredAssetB = useDeferredValue(assetBId);
  const deferredPortfolio = useDeferredValue(portfolioIds);
  const deferredWindowKey = useDeferredValue(windowKey);

  const assetsInCategory = useMemo(() => getAssetsByCategory(selectedCategory), [selectedCategory]);
  const analysis = useMemo(() => {
    return runCorrelationAnalysis({
      assetAId: deferredAssetA,
      assetBId: deferredAssetB,
      portfolioIds: deferredPortfolio,
      windowKey: deferredWindowKey,
    });
  }, [deferredAssetA, deferredAssetB, deferredPortfolio, deferredWindowKey]);

  const selectedAssetA = ASSET_UNIVERSE.find((asset) => asset.id === assetAId);
  const selectedAssetB = ASSET_UNIVERSE.find((asset) => asset.id === assetBId);
  const canAddMorePortfolio = portfolioIds.length < MAX_PORTFOLIO_SIZE;

  const togglePortfolioAsset = (assetId: string) => {
    startTransition(() => {
      setPortfolioIds((current) => {
        if (current.includes(assetId)) {
          if (current.length <= MIN_PORTFOLIO_SIZE) return current;
          return current.filter((id) => id !== assetId);
        }
        if (!canAddMorePortfolio) return current;
        return [...current, assetId];
      });
    });
  };

  const handleCategoryChange = (categoryId: CategoryId) => {
    startTransition(() => {
      setSelectedCategory(categoryId);
      const nextAssets = getAssetsByCategory(categoryId);
      if (nextAssets.length >= 2) {
        setAssetAId(nextAssets[0].id);
        setAssetBId(nextAssets[1].id);
      } else if (nextAssets.length === 1) {
        setAssetAId(nextAssets[0].id);
        setAssetBId(nextAssets[0].id);
      }
    });
  };

  const copyShareLink = async () => {
    const params = new URLSearchParams({
      category: selectedCategory,
      a: assetAId,
      b: assetBId,
      w: windowKey,
      p: portfolioIds.join(","),
    });
    const link = `${window.location.origin}/tools?corr=${encodeURIComponent(params.toString())}`;
    try {
      await navigator.clipboard.writeText(link);
      setShareStatus("Paylasim linki panoya kopyalandi.");
    } catch {
      setShareStatus(link);
    }
  };

  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-[28px] bg-surface-container-low p-5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] sm:p-6">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                query_stats
              </span>
            </div>
            <div className="min-w-[230px]">
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.24em] text-secondary">FinCognis Risk Lab</p>
              <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
                Korelasyon Carpismasi Testi (DCC/GARCH + Tail Risk)
              </h2>
            </div>
            <button
              onClick={copyShareLink}
              className="ml-auto rounded-xl bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-high"
            >
              Sonucu Paylas
            </button>
          </div>

          {shareStatus && <div className="mb-4 rounded-xl bg-surface px-4 py-2 text-xs text-on-surface-variant">{shareStatus}</div>}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">1) Kategori Secimi</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {CATEGORY_OPTIONS.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                      selectedCategory === category.id
                        ? "border-secondary/40 bg-secondary/15 text-secondary"
                        : "border-outline-variant/15 bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <p className="font-semibold">{category.label}</p>
                    <p className="mt-1 text-[11px] opacity-80">{category.universeHint}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">2) Varlik ve Zaman Ayari</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-on-surface-variant">
                  Varlik A
                  <select
                    value={assetAId}
                    onChange={(event) => setAssetAId(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface"
                  >
                    {assetsInCategory.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.ticker} - {asset.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-on-surface-variant">
                  Varlik B
                  <select
                    value={assetBId}
                    onChange={(event) => setAssetBId(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface"
                  >
                    {assetsInCategory.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.ticker} - {asset.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-on-surface-variant sm:col-span-2">
                  Kayan Pencere
                  <div className="mt-1 grid grid-cols-5 gap-2">
                    {WINDOW_OPTIONS.map((windowOption) => (
                      <button
                        key={windowOption.key}
                        onClick={() => setWindowKey(windowOption.key)}
                        className={`rounded-lg px-2 py-2 text-xs font-semibold ${
                          windowOption.key === windowKey
                            ? "bg-secondary/20 text-secondary"
                            : "bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        {windowOption.label}
                      </button>
                    ))}
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-surface p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
              3) Dinamik Model Sonucu ve Asimetrik Korelasyon
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Pearson Korelasyon" value={fmtPercent(analysis.pearsonCorrelation)} tone={metricColor(analysis.pearsonCorrelation)} />
              <MetricCard label="Asagi Yon Korelasyon" value={fmtPercent(analysis.downsideCorrelation)} tone={analysis.downsideFlag ? "text-red-400" : metricColor(analysis.downsideCorrelation)} />
              <MetricCard label="Yukari Yon Korelasyon" value={fmtPercent(analysis.upsideCorrelation)} tone={metricColor(analysis.upsideCorrelation)} />
              <MetricCard label="DCC Son Deger" value={fmtPercent(analysis.dccGarch.latestCorrelation)} tone={metricColor(analysis.dccGarch.latestCorrelation)} />
              <MetricCard label="Tavan Sonrasi Etkin Rho" value={fmtPercent(analysis.dccGarch.effectiveCorrelation)} tone={metricColor(analysis.dccGarch.effectiveCorrelation)} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {analysis.rolling.map((item) => (
                <MetricCard key={item.key} label={`${item.label} Rolling`} value={fmtPercent(item.correlation)} tone={metricColor(item.correlation)} />
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">4) Kuyruk ve Gap Riski</p>
              <RiskRow label="Lower Tail Dependence" value={fmtPercent(analysis.tail.lowerTailDependence)} />
              <RiskRow label="Upper Tail Dependence" value={fmtPercent(analysis.tail.upperTailDependence)} />
              <RiskRow label="t-Copula serbestlik derecesi" value={analysis.tail.tCopulaDf.toFixed(1)} />
              <RiskRow label="Birlikte cokme olasiligi" value={fmtPercent(analysis.tail.jointCrashProbability)} />
              <RiskRow label="Co-crash multiplier" value={`${analysis.tail.coCrashMultiplier.toFixed(1)}x`} />
              <RiskRow label="Jump event sayisi" value={`${analysis.jumpGap.jumpEventCount}`} />
              <RiskRow label="Jump-to-default olasiligi" value={fmtPercent(analysis.jumpGap.jumpToDefaultProbability)} />
              <RiskRow label="Gap event sayisi" value={`${analysis.jumpGap.gapEventCount}`} />
              <RiskRow label="En kotu gap" value={fmtPercent(analysis.jumpGap.worstGap)} />
            </div>

            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">5) Backtest + Kupiec</p>
              <RiskRow label="Guven duzeyi" value={`${(analysis.backtest.confidenceLevel * 100).toFixed(0)}%`} />
              <RiskRow label="Gozlem sayisi" value={`${analysis.backtest.observations}`} />
              <RiskRow label="Exceedance adedi" value={`${analysis.backtest.exceedances}`} />
              <RiskRow label="Exceedance orani" value={fmtPercent(analysis.backtest.exceedanceRate)} />
              <RiskRow label="Kupiec LR" value={analysis.backtest.kupiecLR.toFixed(3)} />
              <RiskRow label="Kupiec p-degeri" value={analysis.backtest.kupiecPValue.toFixed(3)} />
              <div className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${analysis.backtest.pass ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                {analysis.backtest.pass
                  ? "Model %99 seviyesinde kabul edilebilir."
                  : "Model ihlali yuksek: risk tahmini yeniden kalibre edilmeli."}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-surface p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">6) Crisis Replay</p>
            <div className="grid gap-3 md:grid-cols-3">
              {analysis.crisisReplay.map((scenario) => (
                <div key={scenario.id} className="rounded-xl bg-surface-container-high p-3">
                  <p className="font-semibold text-on-surface">{scenario.title}</p>
                  <p className="mt-1 text-[11px] text-on-surface-variant">{scenario.description}</p>
                  <p className={`mt-2 text-sm font-bold ${scenarioTone(scenario.cumulativeLoss)}`}>Kümülatif: {fmtPercent(scenario.cumulativeLoss)}</p>
                  <p className="text-xs text-on-surface-variant">Max DD: {fmtPercent(scenario.maxDrawdown)}</p>
                  <p className="text-xs text-on-surface-variant">Rejim Korelasyonu: {fmtPercent(scenario.regimeCorrelation)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-surface p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
              7) Portfoy Isi Haritasi + Likidite + Stres VaR
            </p>
            <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {ASSET_UNIVERSE.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => togglePortfolioAsset(asset.id)}
                  className={`rounded-lg border px-2 py-2 text-left text-xs ${
                    portfolioIds.includes(asset.id)
                      ? "border-secondary/40 bg-secondary/15 text-secondary"
                      : "border-outline-variant/10 bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  <p className="font-semibold">{asset.ticker}</p>
                  <p className="text-[11px] opacity-80">{asset.name}</p>
                </button>
              ))}
            </div>
            <p className="mb-2 text-[11px] text-on-surface-variant">
              Portfoy boyutu: {portfolioIds.length} (min {MIN_PORTFOLIO_SIZE}, max {MAX_PORTFOLIO_SIZE})
            </p>
            <PortfolioHeatmap assetIds={portfolioIds} heatmap={analysis.heatmap} />
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <MetricCard label="Stres VaR (99%)" value={fmtPercent(analysis.stressVar.var99)} tone="text-red-400" />
              <MetricCard label="Expected Shortfall (99%)" value={fmtPercent(analysis.stressVar.expectedShortfall99)} tone="text-red-400" />
              <MetricCard label="Max Drawdown (99%)" value={fmtPercent(analysis.stressVar.maxDrawdown99)} tone="text-amber-400" />
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-surface p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">8) Bulasicilik Haritasi</p>
            <ContagionMap contagion={analysis.contagion} />
          </div>

          <div className="mt-4 rounded-2xl bg-surface p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">9) Otomatik Risk Yorumu</p>
            <div className={`rounded-xl px-4 py-3 ${analysis.narrative.severity === "critical" ? "bg-red-500/15 text-red-300" : analysis.narrative.severity === "high" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
              <p className="font-semibold">{analysis.narrative.headline}</p>
              <p className="mt-1 text-sm">{analysis.narrative.summary}</p>
            </div>
            {analysis.narrative.flags.length > 0 && (
              <div className="mt-3 space-y-1">
                {analysis.narrative.flags.map((flag) => (
                  <p key={flag} className="text-xs text-red-300">• {flag}</p>
                ))}
              </div>
            )}
            <div className="mt-3 rounded-xl bg-surface-container-high p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                Matematiksel Hedge Alternatifleri (yatirim tavsiyesi degildir)
              </p>
              <p className="mt-1 text-sm text-on-surface">
                {analysis.narrative.alternatives.join(" | ")}
              </p>
            </div>
          </div>
        </div>

        <p className="px-2 text-center text-[11px] leading-6 text-on-surface-variant/70">
          {selectedAssetA?.ticker} vs {selectedAssetB?.ticker} analizi non-stationary 25+ yillik sentetik veriyle, DCC-GARCH + t-Copula + Monte Carlo kombinasyonuyla uretilmistir.
        </p>
      </div>
    </section>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl bg-surface-container-high p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function RiskRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant/10 py-2 text-sm">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-semibold text-on-surface">{value}</span>
    </div>
  );
}
