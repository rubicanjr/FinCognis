import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "link"; label: string; href: string };

interface AboutPageSection {
  heading?: string;
  blocks: ContentBlock[];
}

interface AboutPageContent {
  slug: string;
  title: string;
  description: string;
  sections: AboutPageSection[];
}

const ABOUT_PAGE_CONTENT: AboutPageContent[] = [
  {
    slug: "misyon-vizyon",
    title: "Misyon & Vizyon",
    description: "FinCognis'in misyonu ve vizyonu.",
    sections: [
      {
        heading: "Misyon",
        blocks: [
          {
            type: "paragraph",
            text: "FinCognis’in misyonu, yatırımcıların karar anındaki belirsizliği azaltarak daha sistematik, rasyonel ve sürdürülebilir yatırım kararları almasına yardımcı olmaktır.",
          },
          {
            type: "paragraph",
            text: "Veriyi yalnızca göstermek değil; riskleri, kırılganlıkları ve davranışsal hataları görünür hale getiren bir karar altyapısı inşa etmeyi hedefliyoruz.",
          },
        ],
      },
      {
        heading: "Vizyon",
        blocks: [
          {
            type: "paragraph",
            text: "FinCognis’i, bireysel yatırımcılar için yeni nesil bir “Decision Intelligence” standardına dönüştürmeyi amaçlıyoruz.",
          },
          {
            type: "paragraph",
            text: "Uzun vadede hedefimiz:",
          },
          {
            type: "list",
            items: ["BIST,", "ABD piyasaları", "ve devamında global piyasalarda yatırım kararlarının daha şeffaf, ölçülebilir ve sistematik hale gelmesini sağlayan AI-native bir finansal karar ekosistemi kurmak."],
          },
        ],
      },
    ],
  },
  {
    slug: "felsefe",
    title: "Felsefe",
    description: "FinCognis yaklaşımı ve felsefesi.",
    sections: [
      {
        blocks: [
          {
            type: "paragraph",
            text: "Bugünün finans dünyasında problem bilgiye erişim değil, doğru anda doğru kararı verebilmek.",
          },
          {
            type: "paragraph",
            text: "İnsanlar çoğu zaman:",
          },
          {
            type: "list",
            items: [
              "veri eksikliğinden değil,",
              "aşırı bilgi,",
              "panik,",
              "FOMO,",
              "yanlış risk algısı",
              "nedeniyle kaybediyor.",
            ],
          },
          {
            type: "paragraph",
            text: "FinCognis bu yüzden yalnızca analiz sunan bir platform değildir.",
          },
          {
            type: "paragraph",
            text: "Yaklaşımımız:",
          },
          {
            type: "paragraph",
            text: "“Ne yükselecek?” sorusundan çok,",
          },
          {
            type: "paragraph",
            text: "“Bu karar hangi koşulda bozulur?” sorusuna odaklanır.",
          },
          {
            type: "paragraph",
            text: "Risk görünürlüğü, davranışsal finans, sentiment analizi ve decision simulation yaklaşımını bir araya getirerek yatırım kararlarını daha bilinçli hale getirmeyi hedefliyoruz.",
          },
          {
            type: "paragraph",
            text: "Çünkü inanıyoruz ki:",
          },
          {
            type: "paragraph",
            text: "Piyasa değil, sistem kazandırır.",
          },
        ],
      },
    ],
  },
  {
    slug: "yol-haritasi",
    title: "Yol Haritası",
    description: "FinCognis yol haritası.",
    sections: [
      {
        heading: "Faz 1 — Decision Core",
        blocks: [
          {
            type: "list",
            items: [
              "Temel karar simülasyonu altyapısı",
              "Risk ve volatilite analizleri",
              "BIST odaklı ilk sistemler",
              "Erken erişim topluluğu",
            ],
          },
        ],
      },
      {
        heading: "Faz 2 — AI & Sentiment Layer",
        blocks: [
          {
            type: "list",
            items: [
              "AI destekli analiz motorları",
              "Sentiment ve haber analizi",
              "Behavioral finance katmanları",
              "Kullanıcı karar pattern analizi",
            ],
          },
        ],
      },
      {
        heading: "Faz 3 — Global Market Expansion",
        blocks: [
          {
            type: "list",
            items: [
              "ABD hisse piyasaları",
              "Global piyasa entegrasyonları",
              "Gelişmiş decision workflows",
              "Çok katmanlı risk sistemleri",
            ],
          },
        ],
      },
      {
        heading: "Faz 4 — Decision Operating System",
        blocks: [
          {
            type: "list",
            items: [
              "AI-native yatırım karar altyapısı",
              "Multi-agent decision systems",
              "API & B2B çözümler",
              "Finansal karar ekosistemi",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "topluluk-erken-erisim",
    title: "Topluluk & Erken Erişim",
    description: "Topluluk ve erken erişim programı.",
    sections: [
      {
        blocks: [
          {
            type: "paragraph",
            text: "FinCognis yalnızca bir platform değil; karar kalitesini önemseyen yatırımcıların oluşturduğu bir topluluktur.",
          },
          {
            type: "paragraph",
            text: "Erken erişim topluluğumuzda:",
          },
          {
            type: "list",
            items: [
              "ürün geliştirmeleri,",
              "yeni feature testleri,",
              "yatırımcı davranışı analizleri,",
              "kapalı demo süreçleri,",
              "özel içerikler",
              "paylaşılmaktadır.",
            ],
          },
          {
            type: "paragraph",
            text: "Topluluğumuz özellikle:",
          },
          {
            type: "list",
            items: [
              "sistematik düşünmeye çalışan,",
              "risk yönetimine önem veren,",
              "yatırım psikolojisini anlamaya çalışan",
              "kişileri bir araya getirmeyi hedefler.",
            ],
          },
          {
            type: "paragraph",
            text: "FinCognis’i kullanıcılarla birlikte geliştiriyoruz.",
          },
          {
            type: "paragraph",
            text: "Whatsapp Erken Erişim Grubu:",
          },
          {
            type: "link",
            label: "https://chat.whatsapp.com/BVhi3mgGIMWLpBIJH75O3r",
            href: "https://chat.whatsapp.com/BVhi3mgGIMWLpBIJH75O3r",
          },
        ],
      },
    ],
  },
  {
    slug: "basinda-biz-guncellemeler",
    title: "Basında Biz / Güncellemeler",
    description: "Basın ve güncellemeler.",
    sections: [
      {
        blocks: [
          {
            type: "paragraph",
            text: "FinCognis tarafında:",
          },
          {
            type: "list",
            items: [
              "ürün geliştirmeleri,",
              "yeni analiz sistemleri,",
              "topluluk etkinlikleri,",
              "webinarlar,",
              "startup ve fintech ekosistemi gelişmeleri",
              "düzenli olarak paylaşılmaktadır.",
            ],
          },
          {
            type: "paragraph",
            text: "Son gelişmeleri takip etmek için:",
          },
          {
            type: "list",
            items: [
              "FinLab içerik merkezi",
              "Haberler bölümü",
              "LinkedIn ve topluluk kanallarımız",
              "üzerinden bize ulaşabilirsiniz.",
            ],
          },
          {
            type: "paragraph",
            text: "Çünkü FinCognis yaşayan bir sistemdir.",
          },
        ],
      },
    ],
  },
];

function findAboutPage(slug: string): AboutPageContent | undefined {
  return ABOUT_PAGE_CONTENT.find((item) => item.slug === slug);
}

interface AboutDetailPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return ABOUT_PAGE_CONTENT.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: AboutDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = findAboutPage(slug);
  if (!page) {
    return createPageMetadata({
      title: `${SITE_NAME} | Hakkımızda`,
      description: "FinCognis hakkında bilgi sayfası.",
      path: "/hakkimizda",
    });
  }

  return createPageMetadata({
    title: `${SITE_NAME} | ${page.title}`,
    description: page.description,
    path: `/hakkimizda/${page.slug}`,
  });
}

export default async function AboutDetailPage({ params }: AboutDetailPageProps) {
  const { slug } = await params;
  const page = findAboutPage(slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="landing-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="landing-shell__aurora pointer-events-none absolute inset-0" />
      <div className="landing-shell__grid pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-28 sm:px-6">
          <section className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-8 backdrop-blur-xl sm:p-10">
            <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Hakkımızda</p>
            <h1 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">{page.title}</h1>
          </section>

          <section className="mt-8 space-y-4">
            {page.sections.map((section, sectionIndex) => (
              <article
                key={`${page.slug}:section:${sectionIndex}`}
                className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.52),rgba(2,6,23,0.78))] p-6 backdrop-blur-xl"
              >
                {section.heading ? <h2 className="font-display text-2xl font-semibold text-slate-100">{section.heading}</h2> : null}
                <div className="space-y-3 text-sm text-slate-200">
                  {section.blocks.map((block, blockIndex) => {
                    if (block.type === "paragraph") {
                      return <p key={`${page.slug}:section:${sectionIndex}:block:${blockIndex}`}>{block.text}</p>;
                    }
                    if (block.type === "list") {
                      return (
                        <ul
                          key={`${page.slug}:section:${sectionIndex}:block:${blockIndex}`}
                          className="list-disc space-y-2 pl-5 text-sm text-slate-300"
                        >
                          {block.items.map((item) => (
                            <li key={`${page.slug}:section:${sectionIndex}:block:${blockIndex}:item:${item}`}>{item}</li>
                          ))}
                        </ul>
                      );
                    }

                    return (
                      <Link
                        key={`${page.slug}:section:${sectionIndex}:block:${blockIndex}`}
                        href={block.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-[#8ddfff] underline underline-offset-4 hover:text-[#b6e9ff]"
                      >
                        {block.label}
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
