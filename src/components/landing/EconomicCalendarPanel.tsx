"use client";

import { useMemo, useState } from "react";

interface CalendarTab {
  key: string;
  label: string;
  href: string;
}

const CALENDAR_TABS: CalendarTab[] = [
  {
    key: "economic",
    label: "Ekonomik Takvim",
    href: "https://www.investing.com/economic-calendar",
  },
  {
    key: "holidays",
    label: "Tatiller",
    href: "https://www.investing.com/holiday-calendar",
  },
  {
    key: "dividends",
    label: "Temettüler",
    href: "https://www.investing.com/dividends-calendar",
  },
  {
    key: "splits",
    label: "Bölünmeler",
    href: "https://www.investing.com/stock-split-calendar",
  },
  {
    key: "ipos",
    label: "Halka Arz",
    href: "https://www.investing.com/ipo-calendar",
  },
];

export default function EconomicCalendarPanel() {
  const [activeTab, setActiveTab] = useState(CALENDAR_TABS[0]?.key ?? "economic");

  const currentTab = useMemo(
    () => CALENDAR_TABS.find((tab) => tab.key === activeTab) ?? CALENDAR_TABS[0],
    [activeTab]
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
              onClick={() => setActiveTab(tab.key)}
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-300">
          {currentTab.label} verisi canlı akıştan alınır ve dış kaynaktaki güncellemeler otomatik yansır.
        </p>
        <a href={currentTab.href} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#8ddfff] underline">
          Tam ekran aç
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/12 bg-slate-950/70">
        <iframe
          title={currentTab.label}
          src={currentTab.href}
          className="h-[860px] w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
