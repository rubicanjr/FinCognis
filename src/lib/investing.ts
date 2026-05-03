export interface InvestingNewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

const INVESTING_NEWS_FEEDS = [
  "https://tr.investing.com/rss/news.rss",
  "https://www.investing.com/rss/news.rss",
];

const INVESTING_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getTag(item: string, tagName: string): string {
  const match = item.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function parseNewsRss(xmlText: string, limit: number): InvestingNewsItem[] {
  const items = xmlText.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  return items
    .map((item) => {
      const title = decodeHtmlEntities(stripTags(getTag(item, "title")));
      const link = decodeHtmlEntities(stripTags(getTag(item, "link")));
      const pubDate = decodeHtmlEntities(stripTags(getTag(item, "pubDate")));
      const description = decodeHtmlEntities(stripTags(getTag(item, "description")));
      const source = decodeHtmlEntities(stripTags(getTag(item, "source"))) || "Investing.com";

      if (!title || !link) return null;

      return {
        title,
        link,
        pubDate,
        description,
        source,
      };
    })
    .filter((item): item is InvestingNewsItem => item !== null)
    .slice(0, limit);
}

export async function fetchInvestingNews(limit = 20): Promise<InvestingNewsItem[]> {
  for (const feedUrl of INVESTING_NEWS_FEEDS) {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
          "User-Agent": INVESTING_USER_AGENT,
        },
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        continue;
      }

      const xmlText = await response.text();
      const parsed = parseNewsRss(xmlText, limit);
      if (parsed.length > 0) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return [];
}

