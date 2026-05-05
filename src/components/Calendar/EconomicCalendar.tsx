import React from "react";
import { Activity, AlertCircle, RefreshCw } from "lucide-react";
import type { FinCognisState, RapidStockData } from "@/lib/api";

interface EconomicCalendarProps {
  state: FinCognisState;
  rows: RapidStockData[];
  lastUpdated: string | null;
  message: string | null;
}

function formatLastUpdated(iso: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function statusConfig(state: FinCognisState): { label: string; icon: JSX.Element; className: string } {
  if (state === "IDLE") {
    return {
      label: "Canlı akış aktif",
      icon: <Activity className="h-3.5 w-3.5" />,
      className: "border-emerald-400/45 bg-emerald-500/10 text-emerald-200",
    };
  }
  if (state === "SYNCING") {
    return {
      label: "Senkronize ediliyor",
      icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
      className: "border-[#0a84ff]/45 bg-[#0a84ff]/10 text-[#cfe9ff]",
    };
  }
  if (state === "LOADING") {
    return {
      label: "Yükleniyor",
      icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
      className: "border-white/20 bg-white/10 text-slate-200",
    };
  }
  return {
    label: "Kaynak erişimi sınırlı",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    className: "border-amber-400/45 bg-amber-500/10 text-amber-200",
  };
}

function formatSigned(value: number): string {
  if (value > 0) return `+${value.toFixed(2)}`;
  if (value < 0) return value.toFixed(2);
  return "0.00";
}

export default function EconomicCalendar({ state, rows, lastUpdated, message }: EconomicCalendarProps) {
  const syncStatus = statusConfig(state);

  return (
    <section className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.68),rgba(2,6,23,0.9))] p-6 backdrop-blur-xl sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${syncStatus.className}`}>
          {syncStatus.icon}
          <span>{syncStatus.label}</span>
        </div>
        <p className="font-data text-xs text-slate-300">Son güncelleme: {formatLastUpdated(lastUpdated)}</p>
      </div>

      {message ? <p className="mb-4 text-sm text-slate-300">{message}</p> : null}

      <div className="overflow-hidden rounded-xl border border-white/12 bg-slate-950/65">
        <div className="grid grid-cols-[120px_120px_140px_160px_1fr] gap-0 border-b border-white/10 px-4 py-3 font-display text-xs tracking-[0.08em] text-slate-300">
          <span>Sembol</span>
          <span className="font-data">Fiyat</span>
          <span className="font-data">Değişim</span>
          <span className="font-data">Değişim %</span>
          <span className="font-data">Hacim</span>
        </div>

        <div className="max-h-[720px] overflow-auto p-3">
          {rows.length === 0 ? (
            <div data-testid="calendar-empty-state" className="rounded-lg border border-white/10 bg-slate-900/55 px-4 py-6 text-center text-sm text-slate-300">
              Canlı veri şu anda bulunamadı.
            </div>
          ) : (
            rows.map((row) => (
              <article
                key={`${row.symbol}-${row.volume}`}
                data-testid="calendar-row"
                className="mb-2 grid grid-cols-[120px_120px_140px_160px_1fr] items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-md"
              >
                <span className="font-display text-sm font-semibold text-slate-100">{row.symbol}</span>
                <span className="font-data text-sm text-slate-100">{row.price.toFixed(2)}</span>
                <span className={`font-data text-sm ${row.change >= 0 ? "text-emerald-300" : "text-red-300"}`}>{formatSigned(row.change)}</span>
                <span className={`font-data text-sm ${row.change >= 0 ? "text-emerald-300" : "text-red-300"}`}>{row.changePercentage}</span>
                <span className="font-data text-sm text-slate-200">{row.volume}</span>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
