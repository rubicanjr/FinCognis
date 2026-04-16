import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SITE_NAME, SITE_URL, OG_IMAGE_PATH, buildAbsoluteUrl, createPageMetadata } from "@/lib/seo";

const defaultTitle = `${SITE_NAME} | Finansal Analitik ve Güvenli İşlem Platformu`;
const defaultDescription =
  "FinCognis, komisyon hesaplama, korelasyon analizi ve stres testi araçlarıyla finansal kararları hızlandıran, güvenlik odaklı bir analiz platformudur.";

const THEME_STORAGE_KEY = "fincognis_theme_config";

const THEME_INIT_SCRIPT = `(function(){try{var mode='dark';var raw=localStorage.getItem('${THEME_STORAGE_KEY}');if(raw){var parsed=JSON.parse(raw);if(parsed&&(parsed.mode==='dark'||parsed.mode==='light')){mode=parsed.mode;}}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches){mode='light';}var root=document.documentElement;root.setAttribute('data-theme',mode);root.classList.toggle('dark',mode==='dark');root.classList.toggle('light',mode==='light');}catch(error){var fallbackRoot=document.documentElement;fallbackRoot.setAttribute('data-theme','dark');fallbackRoot.classList.add('dark');fallbackRoot.classList.remove('light');}})();`;

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
  // 1) Render global document shell with shared metadata and fonts.
  // 2) Set root-level theme classes/attributes before hydration.
  // 3) Wrap app in ThemeProvider for persistent adaptive theming.
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className="h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 bg-surface text-on-surface"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(globalStructuredData),
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 bg-surface text-on-surface">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
