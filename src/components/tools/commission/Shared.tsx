import type { ReactNode } from "react";
import type { QuoteBreakdown } from "@/components/tools/commission/types";
import { formatMoney, formatPercent } from "@/components/tools/commissionHelpers";

interface CostSegment {
  id: string;
  label: string;
  colorVar: string;
  value: number;
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span
      className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-surface-container-high text-[10px] font-bold text-secondary"
      title={text}
      aria-label={text}
    >
      ?
    </span>
  );
}

export function CostRow({ label, value, tip }: { label: string; value: number; tip: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-3">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          {label}
          <InfoTip text={tip} />
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold text-on-surface">{formatMoney(value)}</p>
    </div>
  );
}

export function ScenarioRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">{label}</p>
      <p className="mt-1 text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}

export function CostPie({ breakdown, total }: { breakdown: QuoteBreakdown; total: number }) {
  const segments: CostSegment[] = [
    { id: "commission", label: "Komisyon", colorVar: "--chart-commission", value: breakdown.commission },
    { id: "bsmv", label: "BSMV", colorVar: "--chart-bsmv", value: breakdown.bsmv },
    { id: "bistPayi", label: "BIST", colorVar: "--chart-bist", value: breakdown.bistPayi },
    { id: "takasbank", label: "Takasbank", colorVar: "--chart-takasbank", value: breakdown.takasbank },
    { id: "spread", label: "Spread", colorVar: "--chart-spread", value: breakdown.spread },
    { id: "swap", label: "Swap", colorVar: "--chart-swap", value: breakdown.swap },
    { id: "fxConversion", label: "Döviz", colorVar: "--chart-fx", value: breakdown.fxConversion },
    { id: "stopaj", label: "Stopaj", colorVar: "--chart-stopaj", value: breakdown.stopaj },
  ].filter((item) => item.value > 0);

  if (!total || segments.length === 0) {
    return (
      <div className="flex h-40 w-40 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container-high text-xs text-on-surface-variant">
        Veri yok
      </div>
    );
  }

  let progress = 0;
  const gradient = segments
    .map((segment) => {
      const start = progress * 360;
      const ratio = segment.value / total;
      progress += ratio;
      const end = progress * 360;
      return `rgb(var(${segment.colorVar})) ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-40 w-40 rounded-full border border-outline-variant/30" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="absolute inset-5 flex items-center justify-center rounded-full border border-outline-variant/20 bg-surface text-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">Toplam</p>
            <p className="font-headline text-sm font-bold text-on-surface">{formatMoney(total)}</p>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {segments.map((segment) => (
          <div key={segment.id} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `rgb(var(${segment.colorVar}))` }} />
            <span className="min-w-[72px] text-on-surface-variant">{segment.label}</span>
            <span className="font-semibold text-on-surface">{formatPercent((segment.value / total) * 100, 1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
