import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import EconomicCalendar from "@/components/Calendar/EconomicCalendar";
import { getMostActiveStocks } from "@/lib/api";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: `${SITE_NAME} | Ekonomik Takvim`,
  description: "Ekonomik Takvim, Tatiller, Temettüler, Bölünmeler ve Halka Arz akışlarına tek panelden erişim.",
  path: "/ekonomik-takvim",
});

export default async function EconomicCalendarPage() {
  const stockFlow = await getMostActiveStocks();

  return (
    <div className="landing-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="landing-shell__aurora pointer-events-none absolute inset-0" />
      <div className="landing-shell__grid pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-28 sm:px-6">
          <section className="landing-card mb-8 rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-8 backdrop-blur-xl sm:p-10">
            <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Ekonomik Takvim</p>
            <h1 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
              Piyasa Etkinliklerini Anlık İzleyin
            </h1>
            <p className="mt-4 max-w-3xl text-slate-300">
              RapidAPI destekli akış üzerinden en aktif varlıkları canlı takip edin ve güncel market hızını tek panelde görün.
            </p>
          </section>

          <EconomicCalendar state={stockFlow.state} rows={stockFlow.rows} lastUpdated={stockFlow.lastUpdated} message={stockFlow.message} />
        </main>
        <Footer />
      </div>
    </div>
  );
}
