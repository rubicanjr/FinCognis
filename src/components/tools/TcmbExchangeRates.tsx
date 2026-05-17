"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Banknote, CalendarDays, RefreshCw } from "lucide-react";
import { SPK_LEGAL_DISCLAIMER } from "@/lib/legal/spk-disclaimer";

/* ─── Types ─── */

interface TcmbCurrency {
  currencyCode: string;
  unit: number;
  nameTR: string;
  nameEN: string;
  forexBuying: number | null;
  forexSelling: number | null;
  banknoteBuying: number | null;
  banknoteSelling: number | null;
  crossRateUSD: number | null;
}

interface TcmbRatesResponse {
  date: string;
  bulletinNo: string;
  currencyCount: number;
  currencies: TcmbCurrency[];
}

/* ─── Key currencies to highlight ─── */

const MAJOR_CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY", "SAR", "CNY", "KWD"];

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", CHF: "🇨🇭", JPY: "🇯🇵",
  SAR: "🇸🇦", CNY: "🇨🇳", KWD: "🇰🇼", AUD: "🇦🇺", DKK: "🇩🇰",
  SEK: "🇸🇪", CAD: "🇨🇦", NOK: "🇳🇴", RON: "🇷🇴", RUB: "🇷🇺",
  PKR: "🇵🇰", QAR: "🇶🇦", KRW: "🇰🇷", AZN: "🇦🇿", AED: "🇦🇪",
  KZT: "🇰🇿", XDR: "🌐",
};

/* ─── Helpers ─── */

function formatRate(value: number | null): string {
  if (value === null) return "—";
  if (value >= 100) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(5);
}

function formatBulletinDate(raw: string): string {
  if (!raw) return "";
  // raw is DD.MM.YYYY from TCMB
  const [dd, mm, yyyy] = raw.split(".");
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return date.toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ─── Component ─── */

export default function TcmbExchangeRates() {
  const [data, setData] = useState<TcmbRatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tcmb/exchange-rates");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TcmbRatesResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const majorRates = data?.currencies.filter((c) => MAJOR_CURRENCIES.includes(c.currencyCode)) ?? [];
  const otherRates = data?.currencies.filter((c) => !MAJOR_CURRENCIES.includes(c.currencyCode)) ?? [];
  const displayRates = showAll ? data?.currencies : majorRates;

  return (
    <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 p-5 shadow-[0_28px_80px_-40px_rgba(2,132,199,0.32)] backdrop-blur-xl sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/10">
            <Banknote className="h-4.5 w-4.5 text-cyan-300" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-[0.01em] text-slate-50">
              TCMB Resmi Kurlar
            </h2>
            {data?.date && (
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <CalendarDays className="h-3 w-3" />
                {formatBulletinDate(data.date)}
                {data.bulletinNo && (
                  <span className="ml-1 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px]">
                    #{data.bulletinNo}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={fetchRates}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/8 px-3 py-1.5 font-display text-[11px] font-semibold tracking-[0.06em] text-slate-200 transition-all duration-200 hover:border-cyan-300/60 hover:text-cyan-200 disabled:opacity-40"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          Hata: {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="h-4 w-16 rounded bg-white/10" />
              <div className="mt-2 h-6 w-24 rounded bg-white/10" />
              <div className="mt-1 h-3 w-20 rounded bg-white/8" />
            </div>
          ))}
        </div>
      )}

      {/* Rate cards */}
      {data && displayRates && (
        <>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {displayRates.map((c) => {
              const spread =
                c.forexBuying && c.forexSelling
                  ? ((c.forexSelling - c.forexBuying) / c.forexBuying) * 100
                  : null;

              return (
                <div
                  key={c.currencyCode}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3.5 transition-all duration-300 hover:border-cyan-300/30 hover:bg-white/8"
                >
                  {/* Flag + code */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="text-lg">{CURRENCY_FLAGS[c.currencyCode] ?? "💱"}</span>
                      <span className="font-display text-sm font-semibold tracking-wide text-slate-100">
                        {c.currencyCode}
                      </span>
                      {c.unit > 1 && (
                        <span className="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                          ×{c.unit}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Buying / Selling */}
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-data text-xl font-bold text-slate-50">
                      {formatRate(c.forexSelling)}
                    </span>
                    <span className="text-[10px] text-slate-500">TRY</span>
                  </div>

                  {/* Spread */}
                  {spread !== null && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                      {spread > 0.1 ? (
                        <ArrowUpRight className="h-3 w-3 text-amber-400" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-emerald-400" />
                      )}
                      <span>
                        Alış: {formatRate(c.forexBuying)}
                      </span>
                      <span className="text-slate-600">|</span>
                      <span>
                        Spread: {spread.toFixed(3)}%
                      </span>
                    </div>
                  )}

                  {/* Currency name */}
                  <p className="mt-1.5 truncate text-[11px] text-slate-500">
                    {c.nameTR}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Toggle show all */}
          {otherRates.length > 0 && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 font-display text-[11px] font-semibold tracking-[0.06em] text-slate-300 transition-all duration-200 hover:border-cyan-300/50 hover:text-cyan-200"
              >
                {showAll
                  ? `Sadece Ana Kurlar (${MAJOR_CURRENCIES.length})`
                  : `Tümünü Göster (${data.currencyCount} kur)`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <p className="mt-4 text-center text-[10px] text-slate-600">
        Kaynak: TCMB Kur Bülteni • {SPK_LEGAL_DISCLAIMER}
      </p>
    </section>
  );
}
