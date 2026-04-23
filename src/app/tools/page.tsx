import type { Metadata } from "next";
import ToolsPageClient from "@/components/tools/ToolsPageClient";
import { SITE_NAME, SITE_URL, buildAbsoluteUrl, createPageMetadata } from "@/lib/seo";

const toolsTitle = `${SITE_NAME} Araçlar | Portföy Karar Motoru`;
const toolsDescription =
  "FinCognis araçlar sayfasında serbest metin yatırım sorularını, risk yoğunluğu ve korelasyon etkisi odağında anlaşılır bir karar çerçevesiyle değerlendirin.";

export const metadata: Metadata = createPageMetadata({
  title: toolsTitle,
  description: toolsDescription,
  path: "/tools",
  keywords: [
    "portföy karar motoru",
    "risk yoğunluğu analizi",
    "korelasyon etkisi",
    "yatırım sorusu analizi",
    "FinCognis araçlar",
  ],
});

const toolsStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/tools#webpage`,
      url: `${SITE_URL}/tools`,
      name: toolsTitle,
      description: toolsDescription,
      inLanguage: "tr-TR",
      isPartOf: {
        "@id": `${SITE_URL}#website`,
      },
      publisher: {
        "@id": `${SITE_URL}#organization`,
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: buildAbsoluteUrl("/social-preview.png"),
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/tools#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Anasayfa",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Araçlar",
          item: `${SITE_URL}/tools`,
        },
      ],
    },
  ],
};

export default function ToolsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(toolsStructuredData),
        }}
      />
      <ToolsPageClient />
    </>
  );
}
