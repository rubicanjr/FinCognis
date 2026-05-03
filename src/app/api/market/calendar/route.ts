import { NextResponse } from "next/server";
import { fetchInvestingNews } from "@/lib/investing";

type CalendarTab = "economic" | "holidays" | "dividends" | "splits" | "ipo";

interface CalendarItem {
  id: string;
  timeLabel: string;
  event: string;
  region: string;
  importance: "Yüksek" | "Orta" | "Düşük";
  category: string;
}

const TAB_KEYWORDS: Record<CalendarTab, string[]> = {
  economic: [
    "enflasyon",
    "faiz",
    "pmi",
    "gdp",
    "işsizlik",
    "fed",
    "ecb",
    "tarım dışı",
    "tüfe",
    "üfe",
    "sanayi",
    "perakende",
  ],
  holidays: ["tatil", "holiday", "bayram", "kapanış günü", "resmi tatil"],
  dividends: ["temettü", "dividend", "kar payı"],
  splits: ["split", "bölünme", "hisse bölünmesi", "stock split"],
  ipo: ["ipo", "halka arz", "arz"],
};

const IMPORTANCE_KEYWORDS = {
  high: ["faiz", "fed", "ecb", "enflasyon", "tüfe", "üfe", "tarım dışı", "gdp", "işsizlik"],
  medium: ["pmi", "sanayi", "perakende", "temettü", "halka arz", "ipo"],
};

function toDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih güncelleniyor";
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function inferRegion(title: string): string {
  const normalized = title.toLowerCase();
  if (normalized.includes("türkiye") || normalized.includes("bist") || normalized.includes("tcmb")) return "TR";
  if (normalized.includes("abd") || normalized.includes("fed") || normalized.includes("nasdaq") || normalized.includes("s&p")) return "US";
  if (normalized.includes("avrupa") || normalized.includes("ecb") || normalized.includes("euro")) return "EU";
  if (normalized.includes("çin") || normalized.includes("japonya") || normalized.includes("asya")) return "ASYA";
  return "GLOBAL";
}

function inferImportance(title: string): "Yüksek" | "Orta" | "Düşük" {
  const normalized = title.toLowerCase();
  if (IMPORTANCE_KEYWORDS.high.some((keyword) => normalized.includes(keyword))) return "Yüksek";
  if (IMPORTANCE_KEYWORDS.medium.some((keyword) => normalized.includes(keyword))) return "Orta";
  return "Düşük";
}

function mapCategory(tab: CalendarTab): string {
  if (tab === "economic") return "Makro Veri";
  if (tab === "holidays") return "Tatil";
  if (tab === "dividends") return "Temettü";
  if (tab === "splits") return "Bölünme";
  return "Halka Arz";
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tabParam = (searchParams.get("tab") ?? "economic").toLowerCase() as CalendarTab;
  const tab: CalendarTab = ["economic", "holidays", "dividends", "splits", "ipo"].includes(tabParam)
    ? tabParam
    : "economic";

  const allItems = await fetchInvestingNews(120);
  const keywords = TAB_KEYWORDS[tab];

  const filtered = allItems.filter((item) => {
    const haystack = `${item.title} ${item.description}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  });

  const activeList = filtered.length > 0 ? filtered : allItems;

  const entries: CalendarItem[] = activeList.slice(0, 24).map((item, index) => ({
    id: `${tab}-${index}-${item.link}`,
    timeLabel: toDateLabel(item.pubDate),
    event: item.title,
    region: inferRegion(item.title),
    importance: inferImportance(item.title),
    category: mapCategory(tab),
  }));

  return NextResponse.json(
    {
      tab,
      updatedAt: new Date().toISOString(),
      entries,
    },
    { status: 200 }
  );
}

