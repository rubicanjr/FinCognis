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

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState("commission");

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      {/* Tool selector — below navbar */}
      <div className="pt-24 pb-6 px-6 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <p className="text-secondary font-label font-bold tracking-[0.2em] uppercase text-sm mb-2">
            Finansal Araçlar
          </p>
          <h1 className="text-3xl font-headline font-extrabold text-on-surface">
            Analiz & Hesaplama
          </h1>
        </div>

        <div className="flex gap-2 bg-surface-container-low rounded-2xl p-1.5 border border-outline-variant/10">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold font-headline transition-all duration-200 cursor-pointer ${
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
