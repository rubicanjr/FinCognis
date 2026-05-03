import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { fetchInvestingNews } from "@/lib/investing";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: `${SITE_NAME} | Haberler`,
  description: "Dinamik finans haber akışı ve piyasa gündemi.",
  path: "/haberler",
});

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Tarih belirtilmedi";
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NewsPage() {
  const items = await fetchInvestingNews(24);

  return (
    <div className="landing-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="landing-shell__aurora pointer-events-none absolute inset-0" />
      <div className="landing-shell__grid pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-28 sm:px-6">
          <section className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-8 backdrop-blur-xl sm:p-10">
            <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Haberler</p>
            <h1 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
              Canlı Finans Haber Akışı
            </h1>
            <p className="mt-4 text-slate-300">Piyasa gündemindeki gelişmeler bu alanda dinamik olarak güncellenir.</p>
          </section>

          <section className="mt-8 space-y-4">
            {items.length === 0 ? (
              <article className="landing-card rounded-2xl border border-white/12 bg-slate-950/60 p-6 backdrop-blur-xl">
                <h2 className="font-display text-2xl font-semibold text-slate-100">Haber akışı geçici olarak alınamadı</h2>
                <p className="mt-2 text-sm text-slate-300">Bağlantı yeniden kurulduğunda içerik otomatik olarak yenilenecektir.</p>
              </article>
            ) : (
              items.map((item) => {
                const articleId = Buffer.from(item.link).toString("base64url");
                const detailHref = `/haberler/${articleId}?u=${encodeURIComponent(item.link)}&t=${encodeURIComponent(item.title)}&d=${encodeURIComponent(item.description)}&p=${encodeURIComponent(item.pubDate)}`;
                return (
                <article key={`${item.link}-${item.pubDate}`} className="landing-card rounded-2xl border border-white/12 bg-slate-950/60 p-6 backdrop-blur-xl">
                  <Link
                    href={detailHref}
                    className="font-display text-2xl font-semibold leading-tight text-slate-100 transition-colors hover:text-[#8ddfff]"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-3 text-sm text-slate-300">{item.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="rounded-full border border-white/12 bg-slate-900/65 px-3 py-1">Piyasa Akışı</span>
                    <span>{formatDate(item.pubDate)}</span>
                  </div>
                </article>
                );
              })
            )}
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
