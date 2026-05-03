import type { Metadata } from "next";

const DEFAULT_SITE_URL = "https://fincognis.com";

function normalizeSiteUrl(url?: string | null): string {
  if (!url) {
    return DEFAULT_SITE_URL;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return DEFAULT_SITE_URL;
    }
    return parsed.href.endsWith("/") ? parsed.href.slice(0, -1) : parsed.href;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) || DEFAULT_SITE_URL;
export const SITE_NAME = "FinCognis";
export const OG_IMAGE_PATH = "/social-preview.png";

export function buildAbsoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

interface CreatePageMetadataInput {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  type?: "website" | "article";
}

export function createPageMetadata({
  title,
  description,
  path = "/",
  keywords = [],
  type = "website",
}: CreatePageMetadataInput): Metadata {
  const canonicalUrl = buildAbsoluteUrl(path);

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    alternates: {
      canonical: canonicalUrl,
    },
    keywords,
    openGraph: {
      type,
      url: canonicalUrl,
      title,
      description,
      siteName: SITE_NAME,
      locale: "tr_TR",
      images: [
        {
          url: OG_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} sosyal paylasim gorseli`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}
