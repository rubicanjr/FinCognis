import "./globals.css";
import {
  SITE_NAME,
  SITE_URL,
  OG_IMAGE_PATH,
  buildAbsoluteUrl,
  createPageMetadata,
} from "@/lib/seo";

const defaultTitle = `${SITE_NAME} | Finansal Analitik ve Güvenli İşlem Platformu`;
const defaultDescription =
  "FinCognis, komisyon hesaplama, korelasyon analizi ve stres testi araçlarıyla finansal kararları hızlandıran, güvenlik odaklı bir analiz platformudur.";

export const metadata = createPageMetadata({
  title: defaultTitle,
  description: defaultDescription,
  path: "/",
  keywords: [
    "FinCognis",
    "finansal analiz",
    "komisyon hesaplama",
    "korelasyon analizi",
    "portföy stres testi",
    "fintech Türkiye",
  ],
});

const organizationId = `${SITE_URL}#organization`;
const websiteId = `${SITE_URL}#website`;

const globalStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": organizationId,
      name: SITE_NAME,
      url: SITE_URL,
      logo: buildAbsoluteUrl(OG_IMAGE_PATH),
      sameAs: [SITE_URL],
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "tr-TR",
      publisher: {
        "@id": organizationId,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/tools`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(globalStructuredData),
          }}
        />
      </head>
      <body className="bg-surface text-on-surface">{children}</body>
    </html>
  );
}

