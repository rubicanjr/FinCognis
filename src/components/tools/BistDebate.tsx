"use client";

import { useCallback, useState } from "react";
import {
  Swords,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart3,
} from "lucide-react";

/* ─── Types (must match API response) ─── */

interface DebateArgument {
  category: string;
  criterion: string;
  stance: "bull" | "bear" | "neutral";
  strength: number;
  reasoning: string;
  evidence: string;
}

interface DebateVerdict {
  ticker: string;
  overallStance: "STRONG_BULL" | "BULL" | "NEUTRAL" | "BEAR" | "STRONG_BEAR";
  bullScore: number;
  bearScore: number;
  confidence: number;
  bullArguments: DebateArgument[];
  bearArguments: DebateArgument[];
  neutralArguments: DebateArgument[];
  keyRisks: string[];
  keyOpportunities: string[];
  summary: string;
  liquidity: {
    avgVolume20: number;
    avgNotional20: number;
    liquidityPass: boolean;
    liquidityTier: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA";
    reason: string;
  };
  risk: {
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
}

interface DebateApiResponse {
  totalScanned: number;
  debatesGenerated: number;
  verdicts: DebateVerdict[];
  errors: { ticker: string; error: string }[];
}

/* ─── Helpers ─── */

function stanceLabel(s: DebateVerdict["overallStance"]): string {
  const map: Record<string, string> = {
    STRONG_BULL: "GUCLU BOGA",
    BULL: "BOGA",
    NEUTRAL: "NOTER",
    BEAR: "AYI",
    STRONG_BEAR: "GUCLU AYI",
  };
  return map[s] ?? s;
}

function stanceColor(s: DebateVerdict["overallStance"]): string {
  if (s === "STRONG_BULL") return "text-emerald-400";
  if (s === "BULL") return "text-emerald-300";
  if (s === "NEUTRAL") return "text-slate-300";
  if (s === "BEAR") return "text-red-300";
  return "text-red-400";
}

function stanceBg(s: DebateVerdict["overallStance"]): string {
  if (s === "STRONG_BULL") return "bg-emerald-500/10 border-emerald-500/30";
  if (s === "BULL") return "bg-emerald-500/8 border-emerald-500/20";
  if (s === "NEUTRAL") return "bg-slate-500/10 border-slate-500/30";
  if (s === "BEAR") return "bg-red-500/8 border-red-500/20";
  return "bg-red-500/10 border-red-500/30";
}

function strengthBar(strength: number): string {
  if (strength >= 8) return "bg-emerald-400 w-full";
  if (strength >= 6) return "bg-cyan-400 w-3/4";
  if (strength >= 4) return "bg-amber-400 w-1/2";
  return "bg-slate-400 w-1/4";
}

/* ─── Sub-components ─── */

function ArgumentCard({ arg, variant }: { arg: DebateArgument; variant: "bull" | "bear" }) {
  const isBull = variant === "bull";
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
        isBull ? "border-emerald-500/20 bg-emerald-950/15" : "border-red-500/20 bg-red-950/15"
      }`}
    >
      <span className="mt-0.5 flex-shrink-0">
        {isBull ? (
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
        )}
      </span>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <span className={`font-display font-semibold ${isBull ? "text-emerald-300" : "text-red-300"}`}>
            {arg.criterion}
          </span>
          <span className="flex items-center gap-1">
            <Zap className={`h-3 w-3 ${isBull ? "text-emerald-400" : "text-red-400"}`} />
            <span className="font-data text-slate-400">{arg.strength}/10</span>
          </span>
        </div>
        <p className="text-slate-300">{arg.reasoning}</p>
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full transition-all ${strengthBar(arg.strength)}`} />
          </div>
          <span className="font-data text-[10px] text-slate-500">{arg.evidence}</span>
        </div>
      </div>
    </div>
  );
}

function VerdictCard({ verdict }: { verdict: DebateVerdict }) {
  const [expanded, setExpanded] = useState(false);
  const topBull = verdict.bullArguments.slice(0, 3);
  const topBear = verdict.bearArguments.slice(0, 3);

  return (
    <div
      className={`overflow-hidden rounded-2xl border backdrop-blur-xl ${stanceBg(verdict.overallStance)}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold text-slate-100">{verdict.ticker}</span>
          <span className={`font-display text-sm font-bold ${stanceColor(verdict.overallStance)}`}>
            {stanceLabel(verdict.overallStance)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Score comparison bar */}
          <div className="flex items-center gap-1">
            <span className="font-data text-xs text-emerald-400">+{verdict.bullScore}</span>
            <div className="h-3 w-24 overflow-hidden rounded-full bg-white/10">
              <div className="flex h-full">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{
                    width: `${verdict.bullScore + verdict.bearScore > 0 ? (verdict.bullScore / (verdict.bullScore + verdict.bearScore)) * 100 : 50}%`,
                  }}
                />
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{
                    width: `${verdict.bullScore + verdict.bearScore > 0 ? (verdict.bearScore / (verdict.bullScore + verdict.bearScore)) * 100 : 50}%`,
                  }}
                />
              </div>
            </div>
            <span className="font-data text-xs text-red-400">-{verdict.bearScore}</span>
          </div>
          <div className="text-right">
            <div className="font-data text-[10px] text-slate-500">GUVEN</div>
            <div className="font-data text-sm font-semibold text-slate-300">{verdict.confidence}%</div>
          </div>
        </div>
      </div>

      {/* Key points */}
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        {/* Bull column */}
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-display text-[10px] font-semibold tracking-wider text-emerald-300">
              BOGA ARGUMANLARI ({verdict.bullArguments.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {(expanded ? verdict.bullArguments : topBull).map((a, i) => (
              <ArgumentCard key={`bull-${i}`} arg={a} variant="bull" />
            ))}
          </div>
        </div>

        {/* Bear column */}
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            <span className="font-display text-[10px] font-semibold tracking-wider text-red-300">
              AYI ARGUMANLARI ({verdict.bearArguments.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {(expanded ? verdict.bearArguments : topBear).map((a, i) => (
              <ArgumentCard key={`bear-${i}`} arg={a} variant="bear" />
            ))}
          </div>
        </div>
      </div>

      {/* Key risks/opportunities */}
      <div className="border-t border-white/5 px-4 py-2">
        <div className="mb-2 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/5 p-2 text-[10px] text-slate-400">
          <div>
            <span className="text-slate-500">Likidite:</span>{" "}
            <span className="font-data text-slate-300">{verdict.liquidity.liquidityTier}</span>
          </div>
          <div>
            <span className="text-slate-500">Risk:</span>{" "}
            <span className="font-data text-slate-300">{verdict.risk.riskScore}/100 ({verdict.risk.riskTier})</span>
          </div>
          <div>
            <span className="text-slate-500">ATR%:</span>{" "}
            <span className="font-data text-slate-300">{verdict.risk.atrPercent?.toFixed(2) ?? "-"}%</span>
          </div>
          <div>
            <span className="text-slate-500">Max DD:</span>{" "}
            <span className="font-data text-slate-300">{verdict.risk.maxDrawdownPercent.toFixed(1)}%</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 font-display text-[10px] font-semibold tracking-wider text-red-400">
              ANA RISKLER
            </div>
            <ul className="space-y-0.5">
              {verdict.keyRisks.map((r, i) => (
                <li key={i} className="flex items-start gap-1 text-[11px] text-slate-400">
                  <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-red-400" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1 font-display text-[10px] font-semibold tracking-wider text-emerald-400">
              ANA FITRATLAR
            </div>
            <ul className="space-y-0.5">
              {verdict.keyOpportunities.map((o, i) => (
                <li key={i} className="flex items-start gap-1 text-[11px] text-slate-400">
                  <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-emerald-400" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Summary + expand toggle */}
      <div className="border-t border-white/5 px-4 py-2">
        <p className="mb-2 text-xs text-slate-300">{verdict.summary}</p>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <ShieldCheck className="h-3 w-3" />
            Egitim amacli analiz. Yatirim tavsiyesi degildir.
          </p>
          {(verdict.bullArguments.length > 3 || verdict.bearArguments.length > 3) && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 font-display text-[10px] text-slate-400 transition hover:border-cyan-300/30 hover:text-cyan-300"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Daralt
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Tumunu Goster
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─── */

export default function BistDebate() {
  const [input, setInput] = useState("GARAN,AKBNK,ASELS");
  const [results, setResults] = useState<DebateApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDebate = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/bist/debate?tickers=${encodeURIComponent(input)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: DebateApiResponse = await resp.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [input]);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/15 bg-slate-950/60 shadow-[0_28px_80px_-40px_rgba(168,85,247,0.3)] backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-purple-300" />
          <h2 className="font-display text-lg font-bold text-slate-100">BIST Tartisma Motoru</h2>
          <span className="rounded-full border border-purple-300/30 bg-purple-400/10 px-2 py-0.5 font-data text-[10px] text-purple-200">
            BOGA vs AYI
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Her hisse icin Boga (boomer) ve Ayi (bear) argumanlari uretilir, hakem karari verilir.
        </p>
      </div>

      {/* Input */}
      <div className="border-b border-white/5 px-5 py-3">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center rounded-xl border border-white/15 bg-white/5 px-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runDebate()}
              placeholder="GARAN,AKBNK,THYAO"
              className="ml-2 flex-1 bg-transparent py-2 font-data text-sm text-slate-100 outline-none placeholder:text-slate-600"
            />
          </div>
          <button
            type="button"
            onClick={runDebate}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-purple-300/40 bg-purple-400/15 px-4 font-display text-sm font-semibold text-purple-200 transition hover:bg-purple-400/25 disabled:opacity-50"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-300 border-t-transparent" />
            ) : (
              <Swords className="h-4 w-4" />
            )}
            Tartis
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            "GARAN,AKBNK,THYAO",
            "ASELS,SISE,EREGL",
            "BIMAS,SAHOL,KCHOL",
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setInput(preset)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-data text-[10px] text-slate-400 transition hover:border-purple-300/30 hover:text-purple-300"
            >
              {preset}
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
          <div className="mb-4 flex items-center gap-4 text-xs text-slate-400">
            <span>{results.totalScanned} hisse tarandi</span>
            <span className="text-purple-300">{results.debatesGenerated} tartisma</span>
            {results.errors.length > 0 && (
              <span className="text-red-400">{results.errors.length} hata</span>
            )}
          </div>
        )}

        {results?.errors && results.errors.length > 0 && (
          <div className="mb-4 space-y-1">
            {results.errors.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-950/15 px-3 py-1.5 text-xs text-red-300"
              >
                <AlertTriangle className="h-3 w-3" />
                <span className="font-display font-semibold">{e.ticker}</span>
                <span className="text-red-400">{e.error}</span>
              </div>
            ))}
          </div>
        )}

        {results?.verdicts && results.verdicts.length > 0 ? (
          <div className="space-y-4">
            {results.verdicts.map((v) => (
              <VerdictCard key={v.ticker} verdict={v} />
            ))}
          </div>
        ) : !loading ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Ticker girin ve &quot;Tartis&quot; butonuna basin.
          </div>
        ) : null}
      </div>
    </div>
  );
}
