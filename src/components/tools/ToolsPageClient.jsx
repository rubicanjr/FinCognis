"use client";

import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import CommissionCalculator from "@/components/tools/CommissionCalculator";
import CorrelationTest from "@/components/tools/CorrelationTest";
import StressTest from "@/components/tools/StressTest";

const TOOLS = [
  { id: "commission", label: "Komisyon", icon: "payments" },
  { id: "correlation", label: "Korelasyon", icon: "query_stats" },
  { id: "stress", label: "Stres Testi", icon: "shield" },
];

export default function ToolsPageClient() {
  const [activeTool, setActiveTool] = useState("commission");

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="mx-auto max-w-2xl px-6 pb-6 pt-24">
        <div className="mb-6 text-center">
          <p className="mb-2 font-label text-sm font-bold uppercase tracking-[0.2em] text-secondary">
            Finansal Araçlar
          </p>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface">
            Analiz ve Hesaplama
          </h1>
        </div>

        <div className="flex gap-2 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-1.5">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-headline text-xs font-bold transition-all duration-200 ${
                activeTool === tool.id
                  ? "bg-secondary/15 text-secondary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span
                className="material-symbols-outlined text-base"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {tool.icon}
              </span>
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <main className="pb-16">
        {activeTool === "commission" && <CommissionCalculator />}
        {activeTool === "correlation" && <CorrelationTest />}
        {activeTool === "stress" && <StressTest />}
      </main>
    </div>
  );
}

