import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

interface NewsDetailPageProps {
  params: { articleId: string };
  searchParams: {
    u?: string;
    t?: string;
    d?: string;
    p?: string;
  };
}

export const metadata: Metadata = createPageMetadata({
  title: `${SITE_NAME} | Haber Detayı`,
  description: "FinCognis haber detayı sayfası.",
  path: "/haberler",
});

function safeDecode(value?: string): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function formatDate(value?: string): string {
  if (!value) return "Tarih belirtilmedi";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchArticleParagraphs(url: string): Promise<string[]> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });
    if (!response.ok) return [];

    const html = await response.text();
    const articleMatch =
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ??
      html.match(/<div[^>]*class="[^"]*(?:article|content|WYSIWYG)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const area = articleMatch?.[1] ?? html;
    const paragraphs = area.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [];
    const jsonLdBlocks = Array.from(html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi));

    const textFromJsonLd: string[] = [];
    for (const block of jsonLdBlocks) {
      try {
        const raw = block[1]?.trim();
        if (!raw) continue;
        const parsed = JSON.parse(raw) as unknown;
        const queue = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of queue) {
          if (!item || typeof item !== "object") continue;
          const record = item as Record<string, unknown>;
          const body = typeof record.articleBody === "string" ? stripHtml(record.articleBody) : "";
          if (body.length > 80) {
            const chunks = body.split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ])/).map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 35);
            textFromJsonLd.push(...chunks);
          }
        }
      } catch {
        continue;
      }
    }

    const cleanedParagraphs = paragraphs
      .map((paragraph) => stripHtml(paragraph))
      .filter((text) => text.length > 40)
      .slice(0, 24);

    if (cleanedParagraphs.length > 0) return cleanedParagraphs;
    if (textFromJsonLd.length > 0) return textFromJsonLd.slice(0, 24);
    return [];
  } catch {
    return [];
  }
}

export default async function NewsDetailPage({ searchParams }: NewsDetailPageProps) {
  const sourceUrl = safeDecode(searchParams.u);
  const title = safeDecode(searchParams.t) || "Haber Detayı";
  const summary = safeDecode(searchParams.d);
  const publishedAt = formatDate(safeDecode(searchParams.p));
  const paragraphs = sourceUrl ? await fetchArticleParagraphs(sourceUrl) : [];

  return (
    <div className="landing-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="landing-shell__aurora pointer-events-none absolute inset-0" />
      <div className="landing-shell__grid pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-28 sm:px-6">
          <article className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-8 backdrop-blur-xl sm:p-10">
            <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Haber Detayı</p>
            <h1 className="font-display text-3xl font-semibold tracking-[0.01em] text-slate-50 md:text-4xl">{title}</h1>
            <p className="mt-3 text-sm text-slate-400">{publishedAt}</p>

            {summary ? <p className="mt-6 rounded-xl border border-white/10 bg-slate-950/55 p-4 text-slate-200">{summary}</p> : null}

            <section className="mt-8 space-y-4">
              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 24)}`} className="text-base leading-relaxed text-slate-200">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-slate-300">Haber içeriği hazırlanıyor. Lütfen kısa süre sonra tekrar kontrol edin.</p>
              )}
            </section>
          </article>
        </main>
        <Footer />
      </div>
    </div>
  );
}
