import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Rajdhani } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SITE_NAME, SITE_URL, OG_IMAGE_PATH, buildAbsoluteUrl, createPageMetadata } from "@/lib/seo";

const defaultTitle = `${SITE_NAME} | Finansal Analitik ve Güvenli İşlem Platformu`;
const defaultDescription =
  "FinCognis, komisyon hesaplama, korelasyon analizi ve stres testi araçlarıyla finansal kararları hızlandıran, güvenlik odaklı bir analiz platformudur.";

export const metadata: Metadata = createPageMetadata({
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

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-editorial-serif",
  weight: ["500", "600", "700"],
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

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

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${inter.variable} ${cormorantGaramond.variable} ${rajdhani.variable} h-full min-h-full bg-surface text-on-surface`}
      style={{ backgroundColor: "rgb(var(--surface))", color: "rgb(var(--on-surface))" }}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(globalStructuredData),
          }}
        />
      </head>
      <body
        className="min-h-screen bg-surface text-on-surface"
        style={{ backgroundColor: "rgb(var(--surface))", color: "rgb(var(--on-surface))" }}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
