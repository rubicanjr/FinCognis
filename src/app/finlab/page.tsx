import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { FINLAB_SERIES, toFinlabSlug } from "@/lib/finlab";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: `${SITE_NAME} | FinLab`,
  description: "FinLab içerik merkezi: Yatırım karar kalitesine odaklanan başlık bazlı blog kütüphanesi.",
  path: "/finlab",
});

export default function FinLabPage() {
  return (
    <div className="landing-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="landing-shell__aurora pointer-events-none absolute inset-0" />
      <div className="landing-shell__grid pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-28 sm:px-6">
          <section className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-8 backdrop-blur-xl sm:p-10">
            <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">FinLab</p>
            <h1 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">FinCognis Blog Başlıkları</h1>
            <p className="mt-4 max-w-4xl text-slate-300">
              Bu sayfada yalnızca blog başlıkları listelenir. Bir başlığa tıkladığınızda yazı yeni sekmede açılır.
            </p>
          </section>

          <section className="mt-8 grid gap-6">
            {FINLAB_SERIES.map((series) => (
              <article
                key={series.title}
                className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.52),rgba(2,6,23,0.78))] p-6 backdrop-blur-xl sm:p-8"
              >
                <h2 className="font-display text-2xl font-semibold text-slate-50 md:text-3xl">{series.title}</h2>
                <p className="mt-2 text-sm text-slate-300 md:text-base">{series.subtitle}</p>

                <div className="mt-6 grid gap-3">
                  {series.entries.map((entry) => {
                    const slug = toFinlabSlug(entry);
                    return (
                      <Link
                        key={slug}
                        href={`/finlab/${slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-white/12 bg-[#07122a]/70 px-4 py-3 transition-colors hover:border-[#8ddfff]/45 hover:bg-[#0a1731]/85"
                      >
                        <p className="text-xs font-semibold tracking-[0.08em] text-[#8ddfff]">YAZI {entry.id}</p>
                        <h3 className="mt-1 text-lg font-semibold leading-snug text-slate-100">{entry.title}</h3>
                      </Link>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
