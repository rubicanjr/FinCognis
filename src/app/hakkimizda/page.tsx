import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { ABOUT_NAV_ITEMS } from "@/lib/about-nav";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: `${SITE_NAME} | Hakkımızda`,
  description: "FinCognis hakkında: yaklaşımımız, yol haritamız ve topluluk programları.",
  path: "/hakkimizda",
});

export default function AboutIndexPage() {
  return (
    <div className="landing-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="landing-shell__aurora pointer-events-none absolute inset-0" />
      <div className="landing-shell__grid pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-28 sm:px-6">
          <section className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-8 backdrop-blur-xl sm:p-10">
            <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Hakkımızda</p>
            <h1 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
              FinCognis'i Daha Yakından Tanıyın
            </h1>
            <p className="mt-4 max-w-3xl text-slate-300">
              Misyonumuz, ürün yaklaşımımız ve topluluk planlarımızı tek merkezden okuyabilirsiniz.
            </p>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-2">
            {ABOUT_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.52),rgba(2,6,23,0.78))] p-5 backdrop-blur-xl transition-colors hover:border-[#8ddfff]/45"
              >
                <p className="font-display text-xl font-semibold text-slate-100">{item.label}</p>
                {item.description ? <p className="mt-2 text-sm text-slate-300">{item.description}</p> : null}
              </Link>
            ))}
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
