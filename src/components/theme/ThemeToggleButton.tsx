"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useThemeContext } from "@/components/theme/ThemeProvider";

export default function ThemeToggleButton() {
  // 1) Read theme state and action from context.
  const { config, toggleMode } = useThemeContext();
  // 2) Render an accessible toggle button with premium iconography.
  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label="Tema değiştir"
      className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-slate-900/55 px-3 py-2 font-display text-xs font-semibold text-slate-100 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[#22b7ff]/60 hover:text-[#8ddfff]"
    >
      {config.mode === "dark" ? (
        <SunMedium className="h-4 w-4 text-[#8ddfff]" strokeWidth={1.5} />
      ) : (
        <MoonStar className="h-4 w-4 text-[#8ddfff]" strokeWidth={1.5} />
      )}
      {config.mode === "dark" ? "Aydınlık Mod" : "Karanlık Mod"}
    </button>
  );
}
