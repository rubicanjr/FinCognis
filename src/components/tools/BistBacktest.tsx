"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Filter,
  Gauge,
  LineChart,
  Search,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import { SPK_LEGAL_DISCLAIMER } from "@/lib/legal/spk-disclaimer";

type Strategy = "sma_momentum" | "rsi_reversion" | "buy_hold";
type RiskPreset = "conservative" | "balanced" | "aggressive";

interface RejectionTimelineEvent {
  index: number;
  timestamp: number;
  reason:
    | "ACCEPTED"
    | "WARMUP"
    | "INVALID_PRICE"
    | "NO_SIGNAL"
    | "ALREADY_IN_POSITION"
    | "LIQUIDITY_REJECTED"
    | "RISK_SCORE_REJECTED"
    | "VOLATILITY_REGIME_REJECTED"
    | "DRAWDOWN_REJECTED"
    | "REGIME_SHIFT_HIGH"
    | "REGIME_SHIFT_NORMAL"
    | "REGIME_SHIFT_LOW"
    | "EXIT_RESPONSE";
  category: "LIQUIDITY_CASCADE" | "MARGIN_DYNAMICS" | "ADVERSARIAL_RISK" | "REGIME_SHIFT";
  label: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  stressScore: number;
  liquidityCascade: boolean;
  marginDynamics: boolean;
  adversarialRisk: "NONE" | "INSTITUTIONAL_INERTIA" | "AGENCY_PROBLEM";
  decisionSource: "RISK_GATE" | "DEBATE_PROXY" | "REGIME_MONITOR";
  responseBars?: number | null;
}

interface BacktestResult {
  ticker: string;
  initialCapital: number;
  finalEquity: number;
  totalReturnPercent: number;
  buyHoldReturnPercent: number;
  maxDrawdownPercent: number;
  tradeCount: number;
  executedEntryCount: number;
  rejectedEntryCount: number;
  winRatePercent: number | null;
  profitFactor: number | null;
  sharpeRatio: number | null;
  informationRatio: number | null;
  annualizedActiveReturnPercent: number;
  trackingErrorPercent: number;
  trackingErrorDecomposition: {
    skillComponentPercent: number;
    noiseComponentPercent: number;
  };
  rejectionBreakdown: {
    liquidity: number;
    riskScore: number;
    volatilityRegime: number;
    drawdown: number;
    invalidPrice: number;
    total: number;
  };
  doctrineBreakdown: {
    liquidityCascade: number;
    marginDynamics: number;
    adversarialRisk: number;
    institutionalInertia: number;
    agencyProblem: number;
  };
  rejectionTimeline: RejectionTimelineEvent[];
  regimeShiftAnalysis: {
    highRiskShiftCount: number;
    respondedShiftCount: number;
    avgResponseBars: number | null;
    maxResponseBars: number | null;
  };
  blackSwan: {
    tailRiskHedgePercent: number;
    hedgeCostAmount: number;
    hedgeCostPercent: number;
    hedgePayoffAmount: number;
    hedgePayoffPercent: number;
    netCostAmount: number;
    netCostPercent: number;
  };
  survival: {
    liquidityRejectedEntries: number;
    riskRejectedEntries: number;
    tailRiskDays: number;
    worstDayPercent: number;
    survivalScore: number;
    survivalProbabilityPercent: number;
  };
  disclaimer: string;
}

interface BacktestApiResponse {
  totalScanned: number;
  backtestsGenerated: number;
  strategy: Strategy;
  config: {
    riskPreset: RiskPreset;
    initialCapital: number;
    minAvgVolume20: number;
    minAvgNotional20: number;
    maxRiskScore: number;
    blockHighVolatilityRegime: boolean;
    maxDrawdownGatePercent: number;
    warmupBars: number;
    tailRiskHedgePercent: number;
    commissionBps: number;
    slippageBps: number;
    taxBps: number;
    range: string;
  };
  results: BacktestResult[];
  errors: Array<{ ticker: string; error: string }>;
}

function probColor(prob: number): string {
  if (prob >= 80) return "text-emerald-300";
  if (prob >= 60) return "text-cyan-300";
  if (prob >= 40) return "text-amber-300";
  return "text-red-300";
}

function riskTagStyle(te: number): string {
  if (te <= 8) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (te <= 16) return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
  if (te <= 24) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-red-500/30 bg-red-500/10 text-red-300";
}

function breakdownPct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function RejectionRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "cyan" | "amber" | "red" | "slate";
}) {
  const pct = breakdownPct(value, total);
  const toneClass =
    tone === "cyan"
      ? "bg-cyan-400"
      : tone === "amber"
        ? "bg-amber-400"
        : tone === "red"
          ? "bg-red-400"
          : "bg-slate-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-slate-300">
        <span>{label}</span>
        <span className="font-data text-slate-400">
          {value} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${toneClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BacktestCard({ result, fireSaleThreshold }: { result: BacktestResult; fireSaleThreshold: number }) {
  const isFireSaleEntry = result.survival.worstDayPercent <= -fireSaleThreshold;
  const timelinePreview = result.rejectionTimeline.slice(0, 6);

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-slate-950/70 backdrop-blur-xl ${
        isFireSaleEntry ? "border-fuchsia-400/50" : "border-white/15"
      }`}
    >
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LineChart className="h-4 w-4 text-purple-300" />
            <h3 className="font-display text-base font-semibold text-slate-100">{result.ticker}</h3>
          </div>
          <div className="text-right">
            <div className="font-data text-lg font-bold text-cyan-200">
              IR {result.informationRatio == null ? "-" : result.informationRatio.toFixed(3)}
            </div>
            <div className={`text-[10px] ${probColor(result.survival.survivalProbabilityPercent)}`}>
              Survival {result.survival.survivalProbabilityPercent.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-[10px] text-slate-500">Tracking Error (Yıllık)</div>
            <div className={`mt-0.5 inline-flex rounded-full border px-2 py-0.5 font-data ${riskTagStyle(result.trackingErrorPercent)}`}>
              {result.trackingErrorPercent.toFixed(2)}%
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-[10px] text-slate-500">Tracking Skill / Noise</div>
            <div className="mt-0.5 font-data text-sm text-slate-200">
              {result.trackingErrorDecomposition.skillComponentPercent.toFixed(2)} / {result.trackingErrorDecomposition.noiseComponentPercent.toFixed(2)}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-[10px] text-slate-500">Tail-Risk Days</div>
            <div className="mt-0.5 font-data text-sm text-slate-200">{result.survival.tailRiskDays}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-[10px] text-slate-500">Black Swan Net Cost</div>
            <div className="mt-0.5 font-data text-sm text-rose-300">{result.blackSwan.netCostAmount.toFixed(2)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-[10px] text-slate-500">Max Drawdown</div>
            <div className="mt-0.5 font-data text-sm text-red-300">{result.maxDrawdownPercent.toFixed(2)}%</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-[10px] text-slate-500">Rejected Entries</div>
            <div className="mt-0.5 font-data text-sm text-amber-300">{result.rejectedEntryCount}</div>
          </div>
          <div className={`rounded-lg border p-2 ${isFireSaleEntry ? "border-fuchsia-500/30 bg-fuchsia-950/30" : "border-white/10 bg-white/5"}`}>
            <div className="text-[10px] text-slate-500">Worst Day (Margin Stress)</div>
            <div className={`mt-0.5 font-data text-sm ${isFireSaleEntry ? "text-fuchsia-200" : "text-slate-200"}`}>
              {result.survival.worstDayPercent.toFixed(4)}%
              {isFireSaleEntry ? " • Fire Sale Entry" : ""}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-300">
            <Filter className="h-3.5 w-3.5 text-cyan-300" />
            Tail-Risk Rejection Dashboard
          </div>
          <div className="space-y-2">
            <RejectionRow
              label="Likidite"
              value={result.rejectionBreakdown.liquidity}
              total={result.rejectionBreakdown.total}
              tone="cyan"
            />
            <RejectionRow
              label="Risk Skoru"
              value={result.rejectionBreakdown.riskScore}
              total={result.rejectionBreakdown.total}
              tone="amber"
            />
            <RejectionRow
              label="Volatilite/Rejim"
              value={result.rejectionBreakdown.volatilityRegime}
              total={result.rejectionBreakdown.total}
              tone="red"
            />
            <RejectionRow
              label="Drawdown Gate"
              value={result.rejectionBreakdown.drawdown}
              total={result.rejectionBreakdown.total}
              tone="slate"
            />
            <RejectionRow
              label="Invalid Price"
              value={result.rejectionBreakdown.invalidPrice}
              total={result.rejectionBreakdown.total}
              tone="slate"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-slate-500">Sharpe</div>
            <div className="font-data text-slate-300">{result.sharpeRatio?.toFixed(2) ?? "-"}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-slate-500">Win Rate</div>
            <div className="font-data text-slate-300">
              {result.winRatePercent == null ? "-" : `${result.winRatePercent.toFixed(1)}%`}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-slate-500">Trades</div>
            <div className="font-data text-slate-300">{result.tradeCount}</div>
          </div>
        </div>

        {timelinePreview.length ? (
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
            <div className="mb-2 text-[11px] font-semibold tracking-wide text-slate-300">Rejection / Regime Timeline (Preview)</div>
            <div className="space-y-1 text-[10px] text-slate-300">
              {timelinePreview.map((event, idx) => (
                <div key={`${event.timestamp}-${idx}`} className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1">
                  <span>{event.label}</span>
                  <span className="font-data text-slate-400">
                    {event.severity} • {event.stressScore.toFixed(1)}
                    {event.responseBars != null ? ` • Resp ${event.responseBars}b` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-2 text-[10px] text-slate-500">
          PNL (ikincil): Strategy {result.totalReturnPercent.toFixed(2)}% / Buy&Hold {result.buyHoldReturnPercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export default function BistBacktest() {
  const [input, setInput] = useState("GARAN,AKBNK,ASELS");
  const [strategy, setStrategy] = useState<Strategy>("sma_momentum");
  const [riskPreset, setRiskPreset] = useState<RiskPreset>("balanced");
  const [maxRiskScore, setMaxRiskScore] = useState("70");
  const [minAvgVolume20, setMinAvgVolume20] = useState("100000");
  const [tailRiskHedgePercent, setTailRiskHedgePercent] = useState("1.5");
  const [fireSaleMarginThreshold, setFireSaleMarginThreshold] = useState("12");
  const [results, setResults] = useState<BacktestApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aggregate = useMemo(() => {
    if (!results?.results?.length) return null;
    const data = results.results;
    const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const threshold = Number.isFinite(Number(fireSaleMarginThreshold))
      ? Math.max(1, Number(fireSaleMarginThreshold))
      : 12;

    let deflationaryWeightedNumerator = 0;
    let deflationaryWeightedDenominator = 0;
    let inflationaryWeightedNumerator = 0;
    let inflationaryWeightedDenominator = 0;
    let weightedRegimeResponseBarsNumerator = 0;
    let weightedRegimeResponseBarsDenominator = 0;

    for (const row of data) {
      const ir = row.informationRatio ?? 0;
      const highShiftCount = row.rejectionTimeline.filter((e) => e.reason === "REGIME_SHIFT_HIGH").length;
      const nonHighShiftCount = row.rejectionTimeline.filter(
        (e) => e.reason === "REGIME_SHIFT_NORMAL" || e.reason === "REGIME_SHIFT_LOW"
      ).length;

      const deflationaryWeight = Math.max(1, highShiftCount);
      const inflationaryWeight = Math.max(1, nonHighShiftCount);

      deflationaryWeightedNumerator += ir * deflationaryWeight;
      deflationaryWeightedDenominator += deflationaryWeight;

      inflationaryWeightedNumerator += ir * inflationaryWeight;
      inflationaryWeightedDenominator += inflationaryWeight;

      if (row.regimeShiftAnalysis.avgResponseBars != null && row.regimeShiftAnalysis.highRiskShiftCount > 0) {
        weightedRegimeResponseBarsNumerator +=
          row.regimeShiftAnalysis.avgResponseBars * row.regimeShiftAnalysis.highRiskShiftCount;
        weightedRegimeResponseBarsDenominator += row.regimeShiftAnalysis.highRiskShiftCount;
      }
    }

    const fireSaleCandidates = data
      .filter((r) => r.survival.worstDayPercent <= -threshold)
      .map((r) => ({ ticker: r.ticker, worstDayPercent: r.survival.worstDayPercent }));
    const worstCase = data.reduce(
      (acc, row) =>
        row.survival.worstDayPercent < acc.worstDayPercent
          ? { ticker: row.ticker, worstDayPercent: row.survival.worstDayPercent }
          : acc,
      { ticker: data[0].ticker, worstDayPercent: data[0].survival.worstDayPercent }
    );

    return {
      avgSurvivalProbability: mean(data.map((r) => r.survival.survivalProbabilityPercent)),
      avgTrackingError: mean(data.map((r) => r.trackingErrorPercent)),
      deflationaryWeightedIR:
        deflationaryWeightedDenominator > 0
          ? deflationaryWeightedNumerator / deflationaryWeightedDenominator
          : 0,
      inflationaryWeightedIR:
        inflationaryWeightedDenominator > 0
          ? inflationaryWeightedNumerator / inflationaryWeightedDenominator
          : 0,
      avgRegimeResponseBars:
        weightedRegimeResponseBarsDenominator > 0
          ? weightedRegimeResponseBarsNumerator / weightedRegimeResponseBarsDenominator
          : null,
      totalTailRiskDays: data.reduce((s, r) => s + r.survival.tailRiskDays, 0),
      totalRejectedEntries: data.reduce((s, r) => s + r.rejectedEntryCount, 0),
      totalBlackSwanNetCost: data.reduce((s, r) => s + r.blackSwan.netCostAmount, 0),
      totalHedgeCost: data.reduce((s, r) => s + r.blackSwan.hedgeCostAmount, 0),
      totalBlackSwanPayoff: data.reduce((s, r) => s + r.blackSwan.hedgePayoffAmount, 0),
      totalTrackingSkillComponent: data.reduce((s, r) => s + r.trackingErrorDecomposition.skillComponentPercent, 0),
      totalTrackingNoiseComponent: data.reduce((s, r) => s + r.trackingErrorDecomposition.noiseComponentPercent, 0),
      fireSaleMarginThreshold: threshold,
      fireSaleCandidates,
      worstCase,
      rejectionByCause: {
        liquidity: data.reduce((s, r) => s + r.rejectionBreakdown.liquidity, 0),
        riskScore: data.reduce((s, r) => s + r.rejectionBreakdown.riskScore, 0),
        volatilityRegime: data.reduce((s, r) => s + r.rejectionBreakdown.volatilityRegime, 0),
        drawdown: data.reduce((s, r) => s + r.rejectionBreakdown.drawdown, 0),
        invalidPrice: data.reduce((s, r) => s + r.rejectionBreakdown.invalidPrice, 0),
      },
    };
  }, [fireSaleMarginThreshold, results]);

  const buildQueryParams = useCallback(() => {
    return new URLSearchParams({
      tickers: input,
      strategy,
      riskPreset,
      maxRiskScore,
      minAvgVolume20,
      tailRiskHedgePercent,
    });
  }, [input, maxRiskScore, minAvgVolume20, riskPreset, strategy, tailRiskHedgePercent]);

  const runBacktest = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const qp = buildQueryParams();
      const resp = await fetch(`/api/bist/backtest?${qp.toString()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: BacktestApiResponse = await resp.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, input]);

  const exportReport = useCallback(async () => {
    if (!input.trim()) return;
    setExporting(true);
    setError(null);

    try {
      const qp = buildQueryParams();
      qp.set("format", "markdown");
      qp.set("fireSaleThreshold", fireSaleMarginThreshold || "12");

      const resp = await fetch(`/api/bist/backtest/export-report?${qp.toString()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reportText = await resp.text();
      const blob = new Blob([reportText], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bist-executive-report-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rapor disa aktarma hatasi");
    } finally {
      setExporting(false);
    }
  }, [buildQueryParams, fireSaleMarginThreshold, input]);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/15 bg-slate-950/60 shadow-[0_28px_80px_-40px_rgba(192,132,252,0.35)] backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-purple-300" />
          <h2 className="font-display text-lg font-bold text-slate-100">BIST Backtest (Risk-First)</h2>
          <span className="rounded-full border border-purple-300/30 bg-purple-400/10 px-2 py-0.5 font-data text-[10px] text-purple-200">
            SURVIVAL + TRACKING ERROR
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Doktrin odaklı panel: kâr/zarar ikincil, dayanıklılık (survival) ve risk gate reddi birincil.
        </p>
      </div>

      <div className="space-y-3 border-b border-white/5 px-5 py-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <div className="flex items-center rounded-xl border border-white/15 bg-white/5 px-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runBacktest()}
              className="ml-2 w-full bg-transparent py-2 font-data text-sm text-slate-100 outline-none placeholder:text-slate-600"
              placeholder="GARAN,AKBNK,ASELS"
            />
          </div>

          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as Strategy)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-data text-sm text-slate-100 outline-none"
          >
            <option value="sma_momentum">SMA Momentum</option>
            <option value="rsi_reversion">RSI Reversion</option>
            <option value="buy_hold">Buy & Hold</option>
          </select>

          <select
            value={riskPreset}
            onChange={(e) => setRiskPreset(e.target.value as RiskPreset)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-data text-sm text-slate-100 outline-none"
          >
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>

          <input
            value={maxRiskScore}
            onChange={(e) => setMaxRiskScore(e.target.value)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-data text-sm text-slate-100 outline-none"
            placeholder="Max Risk Score"
          />

          <input
            value={minAvgVolume20}
            onChange={(e) => setMinAvgVolume20(e.target.value)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-data text-sm text-slate-100 outline-none"
            placeholder="Min Avg Vol 20"
          />

          <input
            value={tailRiskHedgePercent}
            onChange={(e) => setTailRiskHedgePercent(e.target.value)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-data text-sm text-slate-100 outline-none"
            placeholder="Tail Hedge %"
          />

          <input
            value={fireSaleMarginThreshold}
            onChange={(e) => setFireSaleMarginThreshold(e.target.value)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-data text-sm text-slate-100 outline-none"
            placeholder="Fire Sale Threshold %"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runBacktest}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-purple-300/40 bg-purple-400/15 px-4 py-2 font-display text-sm font-semibold text-purple-200 transition hover:bg-purple-400/25 disabled:opacity-50"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-300 border-t-transparent" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            Backtest Calistir
          </button>

          <button
            type="button"
            onClick={exportReport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-2 font-display text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/25 disabled:opacity-50"
          >
            {exporting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            Export Executive Report
          </button>
        </div>
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {results?.errors?.length ? (
          <div className="mb-4 space-y-1">
            {results.errors.map((e, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-950/15 px-3 py-1.5 text-xs text-red-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-display font-semibold">{e.ticker}</span>
                <span>{e.error}</span>
              </div>
            ))}
          </div>
        ) : null}

        {aggregate ? (
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Avg Survival Probability</div>
              <div className={`font-data text-base font-semibold ${probColor(aggregate.avgSurvivalProbability)}`}>
                {aggregate.avgSurvivalProbability.toFixed(1)}%
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Avg Tracking Error</div>
              <div className={`font-data text-base font-semibold ${riskTagStyle(aggregate.avgTrackingError).split(" ").at(-1)}`}>
                {aggregate.avgTrackingError.toFixed(2)}%
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Deflationary Weighted IR</div>
              <div className="font-data text-base font-semibold text-cyan-300">{aggregate.deflationaryWeightedIR.toFixed(3)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Inflationary Weighted IR</div>
              <div className="font-data text-base font-semibold text-purple-300">{aggregate.inflationaryWeightedIR.toFixed(3)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Avg Regime Response (bars)</div>
              <div className="font-data text-base font-semibold text-amber-300">
                {aggregate.avgRegimeResponseBars == null ? "-" : aggregate.avgRegimeResponseBars.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Black Swan Net Cost</div>
              <div className="font-data text-base font-semibold text-rose-300">
                {aggregate.totalBlackSwanNetCost.toFixed(2)}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Total Hedge Cost</div>
              <div className="font-data text-base font-semibold text-red-300">{aggregate.totalHedgeCost.toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Total Hedge Payoff</div>
              <div className="font-data text-base font-semibold text-emerald-300">{aggregate.totalBlackSwanPayoff.toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Tracking Error Skill</div>
              <div className="font-data text-base font-semibold text-cyan-300">
                {aggregate.totalTrackingSkillComponent.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Tracking Error Noise</div>
              <div className="font-data text-base font-semibold text-orange-300">
                {aggregate.totalTrackingNoiseComponent.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Total Tail-Risk Days</div>
              <div className="font-data text-base font-semibold text-amber-300">{aggregate.totalTailRiskDays}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Total Rejected Entries</div>
              <div className="font-data text-base font-semibold text-red-300">{aggregate.totalRejectedEntries}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Fire Sale Candidates (&lt;= -{aggregate.fireSaleMarginThreshold}%)</div>
              <div className="font-data text-base font-semibold text-fuchsia-300">{aggregate.fireSaleCandidates.length}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] text-slate-500">Worst-Case Day</div>
              <div className="font-data text-base font-semibold text-rose-300">
                {aggregate.worstCase.ticker} {aggregate.worstCase.worstDayPercent.toFixed(4)}%
              </div>
            </div>

            <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-3 md:col-span-6">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] text-slate-300">
                <Activity className="h-3.5 w-3.5 text-cyan-300" />
                Cross-Ticker Rejection Heatmap (Scannable)
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-4">
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-2 text-cyan-200">
                  Likidite: {aggregate.rejectionByCause.liquidity}
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-2 text-amber-200">
                  Risk Skoru: {aggregate.rejectionByCause.riskScore}
                </div>
                <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-2 text-red-200">
                  Volatilite/Rejim: {aggregate.rejectionByCause.volatilityRegime}
                </div>
                <div className="rounded-lg border border-slate-500/20 bg-slate-900/60 p-2 text-slate-300">
                  Drawdown Gate: {aggregate.rejectionByCause.drawdown}
                </div>
                <div className="rounded-lg border border-slate-500/20 bg-slate-900/60 p-2 text-slate-300 md:col-span-4">
                  Invalid Price: {aggregate.rejectionByCause.invalidPrice}
                </div>
              </div>
            </div>

            {aggregate.fireSaleCandidates.length > 0 ? (
              <div className="col-span-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/20 p-3 md:col-span-6">
                <div className="mb-2 text-[11px] font-semibold tracking-wide text-fuchsia-200">
                  Fire Sale Entry Signals (Liquidity Cascade / Margin Call Zone)
                </div>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-fuchsia-100 md:grid-cols-3">
                  {aggregate.fireSaleCandidates.map((item) => (
                    <div key={item.ticker} className="rounded-md border border-fuchsia-500/25 bg-fuchsia-900/25 px-2 py-1">
                      {item.ticker}: {item.worstDayPercent.toFixed(4)}%
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {results?.results?.length ? (
          <div className="space-y-4">
            {results.results.map((result) => (
              <BacktestCard
                key={result.ticker}
                result={result}
                fireSaleThreshold={Number.isFinite(Number(fireSaleMarginThreshold)) ? Math.max(1, Number(fireSaleMarginThreshold)) : 12}
              />
            ))}
          </div>
        ) : !loading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-500">
            Risk-first backtest icin ticker gir ve calistir.
          </div>
        ) : null}

        <div className="mt-4 flex items-start gap-1.5 text-[10px] text-slate-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5" />
          <p>{SPK_LEGAL_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
