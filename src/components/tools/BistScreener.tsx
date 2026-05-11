"use client";

import { useCallback, useState } from "react";
import { BarChart3, Search, AlertTriangle, TrendingUp, TrendingDown, Minus, ShieldCheck } from "lucide-react";

/* ─── Types ─── */
interface Criterion {
  name: string;
  score: number;
  maxScore: number;
  value: unknown;
  note: string;
  isPlaceholder: boolean;
}

interface Horizon {
  label: string;
  totalScore: number;
  availableMax: number;
  criteria: Criterion[];
}

interface ScreenerResult {
  ticker: string;
  assetValid: boolean;
  compositeScore: number;
  compositeMax: number;
  disclaimer: string;
  shortTerm: Horizon;
  longTerm: Horizon;
  liquidity?: {
    avgVolume20: number;
    avgNotional20: number;
    liquidityPass: boolean;
    liquidityTier: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA";
    reason: string;
  };
  risk?: {
    atr14: number | null;
    atrPercent: number | null;
    dailyVolatility20: number | null;
    maxDrawdownPercent: number;
    riskScore: number;
    riskTier: "LOW" | "MEDIUM" | "HIGH";
    volatilityRegime: "LOW" | "NORMAL" | "HIGH";
    suggestedStopPct: number;
    suggestedTakeProfitPct: number;
    positionRiskNote: string;
  };
  error?: string;
}

interface ApiResponse {
  totalScanned: number;
  validResults: number;
  rankings: ScreenerResult[];
}

/* ─── Helpers ─── */
function scoreColor(pct: number): string {
  if (pct >= 70) return "text-emerald-400";
  if (pct >= 50) return "text-cyan-300";
  if (pct >= 30) return "text-amber-300";
  return "text-red-400";
}

function scoreBg(pct: number): string {
  if (pct >= 70) return "bg-emerald-500/15 border-emerald-500/30";
  if (pct >= 50) return "bg-cyan-500/15 border-cyan-500/30";
  if (pct >= 30) return "bg-amber-500/15 border-amber-500/30";
  return "bg-red-500/15 border-red-500/30";
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${pct >= 70 ? "bg-emerald-400" : pct >= 50 ? "bg-cyan-400" : pct >= 30 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right font-data text-xs text-slate-400">{pct}%</span>
    </div>
  );
}

function CriterionRow({ c }: { c: Criterion }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${c.isPlaceholder ? "opacity-40" : ""}`}>
      <span className="flex w-4 items-center justify-center">
        {c.isPlaceholder ? (
          <Minus className="h-3 w-3 text-slate-500" />
        ) : c.score / c.maxScore >= 0.7 ? (
          <TrendingUp className="h-3 w-3 text-emerald-400" />
        ) : c.score / c.maxScore >= 0.4 ? (
          <TrendingUp className="h-3 w-3 text-cyan-300" />
        ) : (
          <TrendingDown className="h-3 w-3 text-amber-300" />
        )}
      </span>
      <span className="w-36 truncate font-display text-slate-300">{c.name}</span>
      <div className="flex-1">
        <ScoreBar score={c.score} max={c.maxScore} />
      </div>
      <span className="w-12 text-right font-data text-slate-400">
        {c.score}/{c.maxScore}
      </span>
      <span className="hidden w-40 truncate text-slate-500 sm:block">{c.note}</span>
    </div>
  );
}

function StockCard({ result }: { result: ScreenerResult }) {
  if (!result.assetValid) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="font-display font-bold text-red-300">{result.ticker}</span>
        </div>
        <p className="mt-1 text-xs text-red-400">{result.error}</p>
      </div>
    );
  }

  const pct = result.compositeScore;
  const stPct = result.shortTerm.availableMax > 0 ? Math.round((result.shortTerm.totalScore / result.shortTerm.availableMax) * 100) : 0;
  const ltPct = result.longTerm.availableMax > 0 ? Math.round((result.longTerm.totalScore / result.longTerm.availableMax) * 100) : 0;

  return (
    <div className={`overflow-hidden rounded-2xl border backdrop-blur-xl ${scoreBg(pct)}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold text-slate-100">{result.ticker}</span>
          <span className={`font-data text-2xl font-bold ${scoreColor(pct)}`}>{pct}</span>
          <span className="font-data text-xs text-slate-500">/100</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-data text-[10px] text-slate-500">KISA VADE</div>
            <div className={`font-data text-sm font-semibold ${scoreColor(stPct)}`}>{stPct}%</div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-right">
            <div className="font-data text-[10px] text-slate-500">UZUN VADE</div>
            <div className={`font-data text-sm font-semibold ${scoreColor(ltPct)}`}>{ltPct}%</div>
          </div>
        </div>
      </div>

      {/* Criteria */}
      <div className="space-y-0.5 px-2 py-2">
        <div className="px-3 py-1 font-display text-[10px] font-semibold tracking-wider text-cyan-300/70">
          TEKNIK MOMENTUM
        </div>
        {result.shortTerm.criteria.slice(0, 4).map((c, i) => (
          <CriterionRow key={`st-${i}`} c={c} />
        ))}

        {result.shortTerm.criteria.length > 4 && (
          <>
            <div className="px-3 py-1 font-display text-[10px] font-semibold tracking-wider text-slate-500">
              KURUMSAL AKIS + KATALIZOR
            </div>
            {result.shortTerm.criteria.slice(4).map((c, i) => (
              <CriterionRow key={`st2-${i}`} c={c} />
            ))}
          </>
        )}

        <div className="px-3 py-1 font-display text-[10px] font-semibold tracking-wider text-cyan-300/70">
          BIST OZELU + DEGERLEME
        </div>
        {result.longTerm.criteria.filter((c) => !c.isPlaceholder).map((c, i) => (
          <CriterionRow key={`lt-${i}`} c={c} />
        ))}

        <details className="group">
          <summary className="cursor-pointer px-3 py-1 text-[10px] text-slate-500 hover:text-slate-300">
            Placeholder kriterler ({result.longTerm.criteria.filter((c) => c.isPlaceholder).length})
          </summary>
          <div>
            {result.longTerm.criteria.filter((c) => c.isPlaceholder).map((c, i) => (
              <CriterionRow key={`ph-${i}`} c={c} />
            ))}
          </div>
        </details>
      </div>

      {/* Disclaimer */}
      <div className="border-t border-white/5 px-4 py-2">
        {result.liquidity && result.risk && (
          <div className="mb-2 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/5 p-2 text-[10px] text-slate-400">
            <div>
              <span className="text-slate-500">Likidite:</span>{" "}
              <span className="font-data text-slate-300">{result.liquidity.liquidityTier}</span>
            </div>
            <div>
              <span className="text-slate-500">Risk:</span>{" "}
              <span className="font-data text-slate-300">{result.risk.riskScore}/100 ({result.risk.riskTier})</span>
            </div>
            <div>
              <span className="text-slate-500">Ort Hacim(20g):</span>{" "}
              <span className="font-data text-slate-300">{result.liquidity.avgVolume20.toLocaleString("tr-TR")}</span>
            </div>
            <div>
              <span className="text-slate-500">Ort Islem Degeri:</span>{" "}
              <span className="font-data text-slate-300">₺{result.liquidity.avgNotional20.toLocaleString("tr-TR")}</span>
            </div>
            <div>
              <span className="text-slate-500">ATR%:</span>{" "}
              <span className="font-data text-slate-300">{result.risk.atrPercent?.toFixed(2) ?? "-"}%</span>
            </div>
            <div>
              <span className="text-slate-500">Max DD:</span>{" "}
              <span className="font-data text-slate-300">{result.risk.maxDrawdownPercent.toFixed(1)}%</span>
            </div>
          </div>
        )}
        <p className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <ShieldCheck className="h-3 w-3" />
          {result.disclaimer}
        </p>
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function BistScreener() {
  const [input, setInput] = useState("GARAN,AKBNK,ASELS,THYAO");
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScreener = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/bist/screener?tickers=${encodeURIComponent(input)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: ApiResponse = await resp.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [input]);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/15 bg-slate-950/60 shadow-[0_28px_80px_-40px_rgba(2,132,199,0.3)] backdrop-blur-xl">
      {/* Input */}
      <div className="border-b border-white/5 px-5 py-3">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center rounded-xl border border-white/15 bg-white/5 px-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runScreener()}
              placeholder="GARAN,AKBNK,THYAO"
              className="ml-2 flex-1 bg-transparent py-2 font-data text-sm text-slate-100 outline-none placeholder:text-slate-600"
            />
          </div>
          <button
            type="button"
            onClick={runScreener}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/15 px-4 font-display text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/25 disabled:opacity-50"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            Tara
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["GARAN,AKBNK,THYAO,ASELS,SISE", "EREGL,KCHOL,SAHOL,TCELL,BIMAS", "ENKAI,TTKOM,TUPRS,VESTL,FROTO"].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => { setInput(preset); }}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-data text-[10px] text-slate-400 transition hover:border-cyan-300/30 hover:text-cyan-300"
            >
              {preset.split(",").slice(0, 3).join(",")}...
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="p-5">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {results && (
          <div className="mb-3 flex items-center gap-4 text-xs text-slate-400">
            <span>{results.totalScanned} hisse tarandi</span>
            <span className="text-emerald-400">{results.validResults} gecerli</span>
            <span className="text-red-400">{results.totalScanned - results.validResults} reddedildi</span>
          </div>
        )}

        {results?.rankings && results.rankings.length > 0 ? (
          <div className="space-y-4">
            {results.rankings.map((r, i) => (
              <div key={r.ticker} className="relative">
                {r.assetValid && (
                  <span className="absolute -left-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 ring-1 ring-white/15">
                    {i + 1}
                  </span>
                )}
                <div className="pl-5">
                  <StockCard result={r} />
                </div>
              </div>
            ))}
          </div>
        ) : !loading ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Taramak icin ticker girin ve &quot;Tara&quot; butonuna basin.
          </div>
        ) : null}
      </div>
    </div>
  );
}
