"use client";

import type { StressAnalysisResult } from "@/components/tools/stress/types";

interface StressResultsProps {
  analysis: StressAnalysisResult;
  portfolioValue: number;
}

function fmtCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtPct(value: number, digits = 2) {
  return `%${(value * 100).toFixed(digits)}`;
}

function fmtSignedPct(value: number, digits = 2) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

function toneByRisk(value: number) {
  if (value >= 0.4) return "text-error";
  if (value >= 0.25) return "text-warning";
  if (value >= 0.12) return "text-info";
  return "text-success";
}

function toneByResilience(score: number) {
  if (score >= 75) return "bg-success-container text-success";
  if (score >= 55) return "bg-warning-container text-warning";
  return "bg-error-container text-error";
}

function MetricTile({ label, value, tone = "text-on-surface" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function ConeChart({ cone }: { cone: StressAnalysisResult["monteCarlo"]["cone"] }) {
  if (cone.length === 0) return null;
  const step = Math.max(Math.floor(cone.length / 12), 1);
  const sampled = cone.filter((_, index) => index % step === 0 || index === cone.length - 1);
  const values = sampled.flatMap((point) => [point.p10, point.p50, point.p90]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1e-6);
  const toPercent = (value: number) => ((value - min) / range) * 100;

  return (
    <div className="space-y-2">
      {sampled.map((point) => {
        const left = toPercent(point.p10);
        const middle = toPercent(point.p50);
        const width = Math.max(toPercent(point.p90) - left, 1);
        return (
          <div key={point.day} className="grid grid-cols-[54px_1fr_62px] items-center gap-2">
            <span className="text-[11px] text-on-surface-variant">Gün {point.day}</span>
            <div className="relative h-3 rounded-full bg-surface-container-highest">
              <div
                className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-secondary/35"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
              <div
                className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 rounded-full bg-secondary"
                style={{ left: `${middle}%` }}
              />
            </div>
            <span className="text-right text-[11px] text-on-surface-variant">{point.p50.toFixed(2)}x</span>
          </div>
        );
      })}
      <p className="text-[11px] text-on-surface-variant">
        Mavi bant: P10-P90 dağılımı, çizgi: medyan (P50). Değerler başlangıç sermayesinin katsayısıdır.
      </p>
    </div>
  );
}

export default function StressResults({ analysis, portfolioValue }: StressResultsProps) {
  const selected = analysis.selectedCrisis;
  const resilience = analysis.guidance.resilienceScore;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-3 lg:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-secondary">Dayanıklılık Skoru</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="font-headline text-3xl font-extrabold text-on-surface">{resilience.toFixed(0)}/100</p>
              <p className="text-xs text-on-surface-variant">Seçili kriz: {selected.title}</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-surface-container-highest">
              <div className="h-2 rounded-full bg-secondary" style={{ width: `${resilience}%` }} />
            </div>
            <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${toneByResilience(resilience)}`}>
              <p className="font-semibold">{analysis.guidance.headline}</p>
              <p className="mt-1 text-xs">{analysis.guidance.summary}</p>
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">Seçili Kriz Etkisi</p>
            <p className={`mt-1 text-xl font-bold ${selected.cumulativeReturn < 0 ? "text-error" : "text-success"}`}>
              {fmtSignedPct(selected.cumulativeReturn)}
            </p>
            <p className="text-xs text-on-surface-variant">Max drawdown: {fmtPct(selected.maxDrawdown)}</p>
            <p className="text-xs text-on-surface-variant">Toparlanma: {selected.recoveryMonths} ay</p>
            <p className="mt-2 text-xs text-on-surface-variant">
              Tahmini kayıp: {fmtCurrency(Math.max(0, -selected.cumulativeReturn * portfolioValue))}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">Crisis Replay Kütüphanesi</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {analysis.crisisReplayLibrary.map((scenario) => (
            <article key={scenario.scenarioId} className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-3">
              <p className="text-sm font-semibold text-on-surface">{scenario.title}</p>
              <p className={`mt-1 text-sm font-bold ${scenario.cumulativeReturn < 0 ? "text-error" : "text-success"}`}>
                Portföy: {fmtSignedPct(scenario.cumulativeReturn)}
              </p>
              <p className="text-xs text-on-surface-variant">Max DD: {fmtPct(scenario.maxDrawdown)}</p>
              <p className="text-xs text-on-surface-variant">Recovery: {scenario.recoveryMonths} ay</p>
              <div className="mt-2 space-y-1 text-[11px] text-on-surface-variant">
                <p>BIST100 farkı: {fmtSignedPct(scenario.benchmarkComparison.bist100)}</p>
                <p>Altın farkı: {fmtSignedPct(scenario.benchmarkComparison.gold)}</p>
                <p>S&P500 farkı: {fmtSignedPct(scenario.benchmarkComparison.sp500)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">Kademeli Senaryo Seti</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {analysis.scenarioSet.map((scenario) => (
            <div key={scenario.label} className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-3">
              <p className="text-xs font-semibold text-on-surface">{scenario.label}</p>
              <p className="mt-1 text-xs text-on-surface-variant">Taban şok: {fmtPct(scenario.shock, 0)}</p>
              <p className="mt-2 text-sm font-bold text-error">{fmtCurrency(scenario.stressedLoss)}</p>
              <p className="text-[11px] text-on-surface-variant">Kalan değer: {fmtCurrency(scenario.remainingValue)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
          Monte Carlo + Tail Risk + Cone of Uncertainty
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile label="VaR (99%)" value={fmtPct(analysis.monteCarlo.var99)} tone="text-error" />
          <MetricTile label="CVaR (99%)" value={fmtPct(analysis.monteCarlo.cvar99)} tone="text-error" />
          <MetricTile label="Max DD (99%)" value={fmtPct(analysis.monteCarlo.maxDrawdown99)} tone="text-warning" />
        </div>
        <div className="mt-4 rounded-xl border border-outline-variant/30 bg-surface-container-high p-3">
          <ConeChart cone={analysis.monteCarlo.cone} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">DCC-GARCH + Sıra Riski</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile
              label="Mevcut Korelasyon"
              value={fmtPct(analysis.dccGarch.currentCorrelation)}
              tone={toneByRisk(Math.abs(analysis.dccGarch.currentCorrelation))}
            />
            <MetricTile
              label="Stres Korelasyon"
              value={fmtPct(analysis.dccGarch.stressedCorrelation)}
              tone={toneByRisk(Math.abs(analysis.dccGarch.stressedCorrelation))}
            />
            <MetricTile
              label="Tavan Vuruş Oranı"
              value={fmtPct(analysis.dccGarch.correlationCeilingHitRate)}
              tone={analysis.dccGarch.correlationCeilingHitRate > 0.3 ? "text-warning" : "text-success"}
            />
            <MetricTile label="Koşullu Volatilite" value={fmtPct(analysis.dccGarch.condVolPortfolio)} />
            <MetricTile label="Median Terminal Servet" value={`${analysis.sequenceRisk.medianTerminalWealth.toFixed(2)}x`} />
            <MetricTile
              label="Depletion Olasılığı"
              value={fmtPct(analysis.sequenceRisk.depletionProbability)}
              tone={analysis.sequenceRisk.depletionProbability > 0.2 ? "text-error" : "text-success"}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">Faktör Duyarlılığı + PCA</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">FX beta</span>
              <span className="font-semibold text-on-surface">{analysis.factorSensitivity.exposures.fx.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Faiz beta</span>
              <span className="font-semibold text-on-surface">{analysis.factorSensitivity.exposures.rate.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Emtia beta</span>
              <span className="font-semibold text-on-surface">{analysis.factorSensitivity.exposures.commodity.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Enflasyon beta</span>
              <span className="font-semibold text-on-surface">{analysis.factorSensitivity.exposures.inflation.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-outline-variant/30 bg-surface-container-high px-3 py-2">
            <p className="text-xs text-on-surface-variant">En zayıf halka</p>
            <p className="text-sm font-semibold text-error">{analysis.factorSensitivity.weakestFactor.toUpperCase()}</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              PCA ilk bileşen açıklama oranı: {fmtPct(analysis.factorSensitivity.pcaVarianceExplained)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">Likidite Stresi</p>
          <MetricTile label="Ağırlıklı Tasfiye Günü" value={analysis.liquidityStress.weightedLiquidationDays.toFixed(1)} />
          <MetricTile label="Slippage Kaybı" value={fmtCurrency(analysis.liquidityStress.slippageLoss)} tone="text-warning" />
          <MetricTile label="Gap Kaybı" value={fmtCurrency(analysis.liquidityStress.gapLoss)} tone="text-error" />
          <MetricTile
            label="Jump-to-Default"
            value={fmtCurrency(analysis.liquidityStress.jumpToDefaultLoss)}
            tone="text-error"
          />
        </div>
        <div className="rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">Model Validasyonu</p>
          <MetricTile
            label="Kupiec Exceedance"
            value={fmtPct(analysis.validation.kupiecExceedanceRate)}
            tone={analysis.validation.kupiecPass ? "text-success" : "text-error"}
          />
          <MetricTile label="Kupiec p-değeri" value={analysis.validation.kupiecPValue.toFixed(3)} />
          <MetricTile label="Phase-shuffled skor" value={analysis.validation.phaseShuffledRobustness.toFixed(2)} />
          <MetricTile label="Overfitting riski" value={analysis.validation.overfittingRisk.toUpperCase()} />
        </div>
        <div className="rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">Regülasyon Uyumu</p>
          <MetricTile label="Basel III sermaye ihtiyacı" value={fmtPct(analysis.regulation.baselCapitalNeedPct)} />
          <MetricTile label="CCAR stres kaybı" value={fmtPct(analysis.regulation.ccarLossPct)} />
          <MetricTile label="Solvency II sermaye ihtiyacı" value={fmtPct(analysis.regulation.solvencyCapitalNeedPct)} />
          <div
            className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${
              analysis.regulation.compliant ? "bg-success-container text-success" : "bg-error-container text-error"
            }`}
          >
            {analysis.regulation.compliant ? "Kurumsal uyum sınırı içinde." : "Sermaye tamponu yetersiz, yeniden dengeleme gerekli."}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
          Aksiyona Dönüşen Çıktılar (Yatırım tavsiyesi değildir)
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-3">
            <p className="text-sm font-semibold text-on-surface">Hedge ve optimizasyon önerileri</p>
            <ul className="mt-2 space-y-2 text-sm text-on-surface-variant">
              {analysis.guidance.hedgeSuggestions.map((suggestion) => (
                <li key={suggestion}>- {suggestion}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-3">
            <p className="text-sm font-semibold text-on-surface">Otomatik IPS Taslağı</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-on-surface-variant">
              {analysis.guidance.ipsDraft}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
