"use client";

import React, { useMemo, useState } from "react";
import { AlertCircle, Diamond } from "lucide-react";
import { useEconomicCalendar } from "@/hooks/useEconomicCalendar";
import type { EconomicRange, EconomicTab } from "@/lib/economic-calendar/schema";

interface CalendarTabConfig {
  key: EconomicTab;
  label: string;
}

interface CalendarRangeConfig {
  key: EconomicRange;
  label: string;
}

const CALENDAR_TABS: CalendarTabConfig[] = [
  { key: "economic", label: "Ekonomik Takvim" },
  { key: "holidays", label: "Tatiller" },
  { key: "dividends", label: "Temettüler" },
  { key: "splits", label: "Bölünmeler" },
  { key: "ipo", label: "Halka Arz" },
];

const RANGE_TABS: CalendarRangeConfig[] = [
  { key: "yesterday", label: "Dün" },
  { key: "today", label: "Bugün" },
  { key: "tomorrow", label: "Yarın" },
  { key: "week", label: "Bu Hafta" },
];

function impactChip(importance: 1 | 2 | 3): string {
  if (importance === 3) return "◆◆◆";
  if (importance === 2) return "◆◆";
  return "◆";
}

function eventTone(importance: 1 | 2 | 3): string {
  if (importance === 3) return "border-red-400/40 bg-red-500/10 text-red-200";
  if (importance === 2) return "border-[#0a84ff]/45 bg-[#0a84ff]/12 text-[#cfe9ff]";
  return "border-white/20 bg-white/5 text-slate-200";
}

function formatUpdateTime(iso: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function LoadingSkeleton() {
  return (
    <div data-testid="calendar-loading-skeleton" className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`calendar-skeleton-${index}`} className="h-10 animate-pulse rounded-lg border border-white/10 bg-slate-900/45" />
      ))}
    </div>
  );
}

export default function EconomicCalendarPanel() {
  const [activeTab, setActiveTab] = useState<EconomicTab>("economic");
  const [activeRange, setActiveRange] = useState<EconomicRange>("today");

  const { events, isLoading, error, updatedAt, emptyStateMessage, toast } = useEconomicCalendar(activeTab, activeRange);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()),
    [events],
  );

  return (
    <section className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-6 backdrop-blur-xl sm:p-8">
      <div className="mb-4 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {CALENDAR_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg border px-4 py-2 font-display text-sm font-semibold transition-colors ${
                isActive
                  ? "border-[#0a84ff]/70 bg-[#0a84ff]/20 text-[#dff4ff]"
                  : "border-white/12 bg-slate-900/55 text-slate-300 hover:border-[#0a84ff]/45 hover:text-[#8ddfff]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {RANGE_TABS.map((range) => {
            const isActive = range.key === activeRange;
            return (
              <button
                key={range.key}
                type="button"
                onClick={() => setActiveRange(range.key)}
                className={`rounded-full border px-4 py-1.5 font-display text-sm transition-colors ${
                  isActive
                    ? "border-[#0a84ff]/70 bg-[#0a84ff]/20 text-[#dff4ff]"
                    : "border-white/12 bg-slate-900/45 text-slate-300 hover:border-[#0a84ff]/45 hover:text-[#8ddfff]"
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
        <p className="font-data text-xs text-slate-400">Son güncelleme: {formatUpdateTime(updatedAt)}</p>
      </div>

      {toast ? (
        <div data-testid="calendar-toast" className="mb-4 flex items-start gap-2 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{toast}</span>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-white/12 bg-slate-950/65">
        <div className="grid grid-cols-[88px_92px_minmax(220px,1fr)_96px_120px_120px_120px] gap-0 border-b border-white/10 px-4 py-3 font-display text-xs tracking-[0.08em] text-slate-300">
          <span>Zaman</span>
          <span>Döviz</span>
          <span>Olay</span>
          <span>Önem</span>
          <span className="font-data">Açıklanan</span>
          <span className="font-data">Beklenti</span>
          <span className="font-data">Önceki</span>
        </div>

        <div className="max-h-[720px] overflow-auto p-3">
          {isLoading ? <LoadingSkeleton /> : null}

          {!isLoading && error ? (
            <div className="rounded-lg border border-white/10 bg-slate-900/55 px-4 py-6 text-center text-sm text-slate-300">
              Veri akışı geçici olarak yanıt vermiyor. Lütfen kısa süre sonra tekrar deneyin.
            </div>
          ) : null}

          {!isLoading && !error && emptyStateMessage ? (
            <div data-testid="calendar-empty-state" className="rounded-lg border border-white/10 bg-slate-900/55 px-4 py-6 text-center text-sm text-slate-300">
              {emptyStateMessage}
            </div>
          ) : null}

          {!isLoading && !error && sortedEvents.length > 0
            ? sortedEvents.map((event, index) => (
                <article
                  key={event.id}
                  className="animate-fade-in-up mb-2 grid grid-cols-[88px_92px_minmax(220px,1fr)_96px_120px_120px_120px] items-center gap-0 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-md"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="font-data text-sm text-slate-200">{new Date(event.time).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="font-data text-sm text-slate-300">{event.currency}</span>
                  <span className="pr-2 text-sm text-slate-100">{event.eventTitle}</span>
                  <span className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs ${eventTone(event.importance)}`}>
                    <Diamond className="mr-1 h-3 w-3" />
                    {impactChip(event.importance)}
                  </span>
                  <span className="font-data text-sm text-slate-200">{event.actual ?? "-"}</span>
                  <span className="font-data text-sm text-slate-200">{event.forecast ?? "-"}</span>
                  <span className="font-data text-sm text-slate-200">{event.previous ?? "-"}</span>
                </article>
              ))
            : null}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Veriler sunucu tarafında eşlenir, yerel bileşenlerle işlenir ve FinCognis arayüz standartlarıyla sunulur.
      </p>
    </section>
  );
}
