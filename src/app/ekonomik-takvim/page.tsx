import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: `${SITE_NAME} | Ekonomik Takvim`,
  description: "Ekonomik Takvim, Tatiller, Temettüler, Bölünmeler ve Halka Arz akışlarına tek panelden erişim.",
  path: "/ekonomik-takvim",
});

export default function EconomicCalendarPage() {
  return (
    <div className="landing-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="landing-shell__aurora pointer-events-none absolute inset-0" />
      <div className="landing-shell__grid pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-28 sm:px-6">
          <section className="landing-card mb-8 rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-10 text-center backdrop-blur-xl sm:p-14">
            <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Ekonomik Takvim</p>
            <h1 className="font-display text-5xl font-semibold tracking-[0.06em] text-slate-50 md:text-6xl">BAKIMDA</h1>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
