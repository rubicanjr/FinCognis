import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { getAllFinlabEntries, getFinlabEntryBySlug } from "@/lib/finlab";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

interface FinlabDetailPageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return getAllFinlabEntries().map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: FinlabDetailPageProps): Promise<Metadata> {
  const entry = await getFinlabEntryBySlug(params.slug);
  if (!entry) {
    return createPageMetadata({
      title: `${SITE_NAME} | FinLab`,
      description: "FinLab blog yazısı bulunamadı.",
      path: "/finlab",
    });
  }

  return createPageMetadata({
    title: `${SITE_NAME} | ${entry.title}`,
    description: `${entry.title} - ${entry.keyword} / ${entry.concept}`,
    path: `/finlab/${entry.slug}`,
  });
}

export default async function FinlabDetailPage({ params }: FinlabDetailPageProps) {
  const entry = await getFinlabEntryBySlug(params.slug);
  if (!entry) notFound();

  return (
    <div className="landing-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="landing-shell__aurora pointer-events-none absolute inset-0" />
      <div className="landing-shell__grid pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-28 sm:px-6">
          <article className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-8 backdrop-blur-xl sm:p-10">
            <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">FinLab Yazısı</p>
            <h1 className="font-display text-3xl font-semibold tracking-[0.01em] text-slate-50 md:text-4xl">{entry.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-xs md:text-sm">
              <span className="rounded-full border border-[#8ddfff]/45 bg-[#082848] px-3 py-1 text-[#c9f1ff]">
                Keyword: {entry.keyword}
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-slate-200">
                Konsept: {entry.concept}
              </span>
            </div>

            <div
              className="finlab-markdown mt-6 rounded-xl border border-white/10 bg-[#020817]/60 p-5"
              dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
            />
          </article>
        </main>
        <Footer />
      </div>
    </div>
  );
}

