"use client";

import { LineChart } from "lucide-react";
import UniversalAssetComparisonPanel from "@/components/tools/correlation/UniversalAssetComparisonPanel";

export default function CorrelationTest() {
  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[28px] border border-outline-variant/35 bg-gradient-to-br from-surface-container-low via-surface to-surface p-5 shadow-[0_20px_60px_rgb(var(--on-surface)/0.08)] sm:p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/15 text-secondary ring-1 ring-secondary/25">
            <LineChart className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="min-w-[230px]">
            <p className="font-label text-[11px] font-bold uppercase tracking-[0.24em] text-secondary">
              FinCognis Risk Laboratuvarı
            </p>
            <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
              Portföy Karar Motoru
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant sm:text-sm">
              Varlıkları ortak bir çerçevede değerlendirir, risk yükünü anlaşılır karar diline çevirir.
            </p>
          </div>
        </div>

        <UniversalAssetComparisonPanel />
      </div>
    </section>
  );
}
