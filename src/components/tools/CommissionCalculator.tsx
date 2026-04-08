"use client";

import { AnalyticsPanel } from "@/components/tools/commission/AnalyticsPanel";
import { ComparisonPanel } from "@/components/tools/commission/ComparisonPanel";
import { InsightsPanel } from "@/components/tools/commission/InsightsPanel";
import { SelectionPanel } from "@/components/tools/commission/SelectionPanel";
import { SupportPanel } from "@/components/tools/commission/SupportPanel";
import { TopPanel } from "@/components/tools/commission/TopPanel";
import { useCommissionCalculator } from "@/components/tools/commission/useCommissionCalculator";

export default function CommissionCalculator() {
  const vm = useCommissionCalculator();

  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="rounded-[28px] bg-surface-container-low p-5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] sm:p-6">
          <TopPanel vm={vm} />
          <SelectionPanel vm={vm} />
          <ComparisonPanel vm={vm} />
          <InsightsPanel vm={vm} />
          <AnalyticsPanel vm={vm} />
        </div>
        <SupportPanel vm={vm} />
      </div>
    </section>
  );
}
