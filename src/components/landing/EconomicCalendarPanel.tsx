"use client";

import { useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";

interface CalendarTabConfig {
  key: "economic" | "holidays" | "dividends" | "splits" | "ipo";
  label: string;
  url: string;
}

const CALENDAR_TABS: CalendarTabConfig[] = [
  {
    key: "economic",
    label: "Ekonomik Takvim",
    url: "https://tr.investing.com/economic-calendar/",
  },
  {
    key: "holidays",
    label: "Tatiller",
    url: "https://tr.investing.com/holiday-calendar/",
  },
  {
    key: "dividends",
    label: "Temettüler",
    url: "https://tr.investing.com/dividends-calendar/",
  },
  {
    key: "splits",
    label: "Bölünmeler",
    url: "https://tr.investing.com/stock-split-calendar/",
  },
  {
    key: "ipo",
    label: "Halka Arz",
    url: "https://tr.investing.com/ipo-calendar/",
  },
];

export default function EconomicCalendarPanel() {
  const [activeTab, setActiveTab] = useState<CalendarTabConfig["key"]>("economic");
  const [isLoading, setIsLoading] = useState(true);

  const currentTab = useMemo(
    () => CALENDAR_TABS.find((tab) => tab.key === activeTab) ?? CALENDAR_TABS[0],
    [activeTab],
  );

  return (
    <section className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-6 backdrop-blur-xl sm:p-8">
      <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {CALENDAR_TABS.map((tab) => {
          const isActive = tab.key === currentTab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setIsLoading(true);
              }}
              className={`rounded-lg border px-4 py-2 font-display text-sm font-semibold transition-colors ${
                isActive
                  ? "border-[#22b7ff]/55 bg-[#22b7ff]/18 text-[#dff4ff]"
                  : "border-white/12 bg-slate-900/55 text-slate-300 hover:border-[#22b7ff]/45 hover:text-[#8ddfff]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-300">{currentTab.label} verileri eşleşen kaynak akışından canlı olarak alınır.</p>
        <span className="text-xs text-slate-400">Kaynak senkronu aktif</span>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-white/12 bg-slate-950/70">
        {isLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-slate-950/70 text-slate-300 backdrop-blur-sm">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#8ddfff]" />
            Takvim yükleniyor...
          </div>
        ) : null}

        <iframe
          key={currentTab.key}
          src={currentTab.url}
          title={`${currentTab.label} iframe`}
          className="h-[1250px] w-full"
          loading="lazy"
          sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </section>
  );
}
