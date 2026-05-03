"use client";

import { useMemo } from "react";
import { useThemeContext } from "@/components/theme/ThemeProvider";
import EconomicCalendarWidget from "@/components/landing/EconomicCalendarWidget";

export default function EconomicCalendarPanel() {
  const { config } = useThemeContext();
  const widgetTheme = useMemo<"dark" | "light">(
    () => (config.mode === "light" ? "light" : "dark"),
    [config.mode],
  );

  return (
    <section className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-6 backdrop-blur-xl sm:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Canlı Takvim</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-slate-50 md:text-3xl">Ekonomik Takvim Paneli</h2>
        </div>
        <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-slate-300">
          Tema: {widgetTheme === "dark" ? "Koyu" : "Açık"}
        </span>
      </div>

      <p className="mb-5 max-w-3xl text-sm text-slate-300">
        Takvim akışı izole bir widget konteyneri üzerinden yüklenir. Cam efektli Cobalt filtre katmanı ile FinCognis
        arayüz diline uyarlanmıştır.
      </p>

      <EconomicCalendarWidget theme={widgetTheme} defaultCurrency={5} importance="1,2,3" height="760px" width="100%" />
    </section>
  );
}
