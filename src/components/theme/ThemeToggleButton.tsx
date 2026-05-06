"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useThemeContext } from "@/components/theme/ThemeProvider";

export default function ThemeToggleButton() {
  const { config, toggleMode } = useThemeContext();

  const modeAwareClass =
    config.mode === "dark"
      ? "border-white/12 bg-slate-900/55 text-slate-100 hover:border-[#22b7ff]/60 hover:text-[#8ddfff]"
      : "border-slate-300/80 bg-white/90 text-slate-700 hover:border-sky-400/80 hover:text-sky-700";

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label="Tema değiştir"
      className={`theme-toggle-btn inline-flex items-center gap-2 rounded-xl px-3 py-2 font-display text-xs font-semibold backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 ${modeAwareClass}`}
    >
      {config.mode === "dark" ? (
        <SunMedium className="h-4 w-4 text-[#8ddfff]" strokeWidth={1.5} />
      ) : (
        <MoonStar className="h-4 w-4 text-sky-600" strokeWidth={1.5} />
      )}
      {config.mode === "dark" ? "Aydınlık Mod" : "Karanlık Mod"}
    </button>
  );
}
