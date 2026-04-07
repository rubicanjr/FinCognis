import { useState } from "react";
import CommissionCalculator from "./CommissionCalculator";
import CorrelationTest from "./CorrelationTest";
import StressTest from "./StressTest";

const TOOLS = [
  { id: "commission", label: "Komisyon", icon: "💰" },
  { id: "correlation", label: "Korelasyon", icon: "📊" },
  { id: "stress", label: "Stres Testi", icon: "🛡️" },
];

export default function App() {
  const [activeTool, setActiveTool] = useState("commission");

  return (
    <div className="min-h-screen bg-[#050A14]">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-[#050A14]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[#00C896] font-bold text-lg tracking-tight">
                FinCognis
              </span>
              <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded-md font-medium">
                BETA
              </span>
            </div>
          </div>

          <div className="flex gap-1 bg-[#0B1120] rounded-xl p-1">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                  activeTool === tool.id
                    ? "bg-[#00C896]/15 text-[#00C896] shadow-sm"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <span className="mr-0.5">{tool.icon}</span>
                {tool.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main>
        {activeTool === "commission" && <CommissionCalculator />}
        {activeTool === "correlation" && <CorrelationTest />}
        {activeTool === "stress" && <StressTest />}
      </main>
    </div>
  );
}
