import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import AnalyticsBento from "@/components/landing/AnalyticsBento";
import SecureTransactions from "@/components/landing/SecureTransactions";
import GlobalCompliance from "@/components/landing/GlobalCompliance";
import Footer from "@/components/landing/Footer";
import SeoContentSection, { HOME_FAQ_ITEMS } from "@/components/landing/SeoContentSection";
import { SITE_NAME, SITE_URL, OG_IMAGE_PATH, buildAbsoluteUrl, createPageMetadata } from "@/lib/seo";

const homeTitle = `${SITE_NAME} | Finansal Analitik, Komisyon ve Risk Araçları`;
const homeDescription =
  "FinCognis ile komisyon maliyeti hesaplayın, varlık korelasyonunu ölçün ve stres testleriyle portföy riskini yönetin. Türkçe finansal analiz platformu.";

export const metadata: Metadata = createPageMetadata({
  title: homeTitle,
  description: homeDescription,
  path: "/",
  keywords: [
    "komisyon hesaplayıcı",
    "portföy korelasyon analizi",
    "stres testi",
    "yatırım risk yönetimi",
    "finansal araçlar",
    "fintech analiz platformu",
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
      featureList: ["Komisyon Hesaplayıcı", "Korelasyon Çarpışması Testi", "Portföy Stres Simülatörü"],
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
    <>
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
    </>
  );
}
