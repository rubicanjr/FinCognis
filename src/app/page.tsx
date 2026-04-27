import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import AnalyticsBento from "@/components/landing/AnalyticsBento";
import SecureTransactions from "@/components/landing/SecureTransactions";
import GlobalCompliance from "@/components/landing/GlobalCompliance";
import Footer from "@/components/landing/Footer";
import SeoContentSection, { HOME_FAQ_ITEMS } from "@/components/landing/SeoContentSection";
import { SITE_NAME, SITE_URL, OG_IMAGE_PATH, buildAbsoluteUrl, createPageMetadata } from "@/lib/seo";

const homeTitle = `${SITE_NAME} | Varlık Karşılaştırma ve Profil Keşif Aracı`;
const homeDescription =
  "FinCognis ile varlıkları Risk Düzeyi, Kazanç Potansiyeli, Nakde Çevirme Kolaylığı ve Portföy Dengeleme Gücü metriklerinde karşılaştırın; profil keşif akışıyla araştırma alanınızı daraltın.";

export const metadata: Metadata = createPageMetadata({
  title: homeTitle,
  description: homeDescription,
  path: "/",
  keywords: [
    "varlık karşılaştırma",
    "profil keşif",
    "risk düzeyi analizi",
    "nakde çevirme kolaylığı",
    "portföy dengeleme gücü",
    "finansal karar destek",
  ],
});

const organizationId = `${SITE_URL}#organization`;
const websiteId = `${SITE_URL}#website`;
const webpageId = `${SITE_URL}#webpage`;

const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": webpageId,
      url: SITE_URL,
      name: homeTitle,
      description: homeDescription,
      inLanguage: "tr-TR",
      isPartOf: {
        "@id": websiteId,
      },
      publisher: {
        "@id": organizationId,
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: buildAbsoluteUrl(OG_IMAGE_PATH),
      },
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["h1", "h2"],
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}#application`,
      name: SITE_NAME,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      inLanguage: "tr-TR",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "TRY",
      },
      featureList: ["Karşılaştırma Modu", "Profil Keşif Modu", "Profil Uyum Skoru", "Karşılaştırmalı Metrik Analizi"],
      publisher: {
        "@id": organizationId,
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}#faq`,
      mainEntity: HOME_FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Anasayfa",
          item: SITE_URL,
        },
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030915] text-slate-100">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% -12%, rgb(34 183 255 / 0.34) 0%, transparent 46%), radial-gradient(circle at 84% 3%, rgb(168 85 247 / 0.22) 0%, transparent 38%), linear-gradient(180deg, rgb(2 8 23) 0%, rgb(2 6 18) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative z-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeStructuredData),
        }}
      />
      <Navbar />
      <HeroSection />
      <AnalyticsBento />
      <SecureTransactions />
      <GlobalCompliance />
      <SeoContentSection />
      <Footer />
      </div>
    </div>
  );
}
