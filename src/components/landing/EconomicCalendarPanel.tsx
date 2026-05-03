"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";

interface CalendarTab {
  key: string;
  label: string;
}

interface RangeTab {
  key: "yesterday" | "today" | "tomorrow" | "week";
  label: string;
}

interface CalendarEntry {
  id: string;
  timeLabel: string;
  currency: string;
  event: string;
  importance: "Yüksek" | "Orta" | "Düşük";
  actual: string;
  forecast: string;
  previous: string;
}

const CALENDAR_TABS: Array<CalendarTab & { apiKey: string }> = [
  {
    key: "economic",
    label: "Ekonomik Takvim",
    apiKey: "economic",
  },
  {
    key: "holidays",
    label: "Tatiller",
    apiKey: "holidays",
  },
  {
    key: "dividends",
    label: "Temettüler",
    apiKey: "dividends",
  },
  {
    key: "splits",
    label: "Bölünmeler",
    apiKey: "splits",
  },
  {
    key: "ipos",
    label: "Halka Arz",
    apiKey: "ipo",
  },
];

const RANGE_TABS: RangeTab[] = [
  { key: "yesterday", label: "Dün" },
  { key: "today", label: "Bugün" },
  { key: "tomorrow", label: "Yarın" },
  { key: "week", label: "Bu Hafta" },
];

export default function EconomicCalendarPanel() {
  const [activeTab, setActiveTab] = useState(CALENDAR_TABS[0]?.key ?? "economic");
  const [activeRange, setActiveRange] = useState<RangeTab["key"]>("today");
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  const currentTab = useMemo(
    () => CALENDAR_TABS.find((tab) => tab.key === activeTab) ?? CALENDAR_TABS[0],
    [activeTab]
  );

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    async function loadEntries() {
      setLoading(true);
      try {
        const response = await fetch(`/api/market/calendar?tab=${currentTab.apiKey}&range=${activeRange}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as { entries?: CalendarEntry[]; updatedAt?: string };
        if (!mounted) return;
        setEntries(Array.isArray(payload.entries) ? payload.entries : []);
        setUpdatedAt(payload.updatedAt ?? "");
      } catch {
        if (!mounted) return;
        setEntries([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadEntries();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [activeRange, currentTab.apiKey]);

  const updatedLabel = useMemo(() => {
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return "Canlı güncelleme aktif";
    return `Son güncelleme: ${date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [updatedAt]);

  const importanceClass = (importance: CalendarEntry["importance"]) => {
    if (importance === "Yüksek") return "text-rose-300 border-rose-300/35 bg-rose-500/15";
    if (importance === "Orta") return "text-amber-300 border-amber-300/35 bg-amber-500/15";
    return "text-emerald-300 border-emerald-300/35 bg-emerald-500/15";
  };

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
        <p className="text-sm text-slate-300">{currentTab.label} verileri sistem akışından güncel olarak işlenir.</p>
        <span className="text-xs text-slate-400">{updatedLabel}</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {RANGE_TABS.map((rangeTab) => {
          const active = rangeTab.key === activeRange;
          return (
            <button
              key={rangeTab.key}
              type="button"
              onClick={() => setActiveRange(rangeTab.key)}
              className={`rounded-full border px-3 py-1.5 font-display text-xs font-semibold transition-colors ${
                active
                  ? "border-[#22b7ff]/55 bg-[#22b7ff]/18 text-[#dff4ff]"
                  : "border-white/12 bg-slate-900/55 text-slate-300 hover:border-[#22b7ff]/45 hover:text-[#8ddfff]"
              }`}
            >
              {rangeTab.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/12 bg-slate-950/70">
        <div className="grid grid-cols-12 border-b border-white/10 bg-slate-900/65 px-4 py-3 font-display text-xs tracking-[0.08em] text-slate-300">
          <div className="col-span-3">Zaman</div>
          <div className="col-span-1">Döviz</div>
          <div className="col-span-4">Olay</div>
          <div className="col-span-1 text-center">Önem</div>
          <div className="col-span-1 text-right">Açıklanan</div>
          <div className="col-span-1 text-right">Beklenti</div>
          <div className="col-span-2 text-right">Önceki</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-slate-300">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#8ddfff]" />
            Veriler yükleniyor...
          </div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-14 text-center text-slate-300">Bu sekme için şu an listelenecek veri bulunamadı.</div>
        ) : (
          <div className="max-h-[780px] overflow-y-auto">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="grid grid-cols-12 items-center gap-3 border-b border-white/8 px-4 py-3 transition-colors hover:bg-white/5"
              >
                <div className="col-span-3 text-sm text-slate-300">{entry.timeLabel}</div>
                <div className="col-span-1">
                  <span className="rounded-md border border-white/15 bg-slate-900/55 px-2 py-1 text-xs font-semibold text-slate-200">{entry.currency || "-"}</span>
                </div>
                <div className="col-span-4 text-sm text-slate-100">{entry.event}</div>
                <div className="col-span-1 text-center">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${importanceClass(entry.importance)}`}>
                    {entry.importance}
                  </span>
                </div>
                <div className="col-span-1 text-right text-xs text-slate-300">{entry.actual}</div>
                <div className="col-span-1 text-right text-xs text-slate-300">{entry.forecast}</div>
                <div className="col-span-2 text-right text-xs text-slate-400">{entry.previous}</div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
