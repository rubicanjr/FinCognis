import type { EconomicTab } from "@/lib/economic-calendar/schema";

export interface SelectorMapping {
  rowPattern: RegExp;
  cellPattern: RegExp;
  eventIdPattern: RegExp;
  classHints: {
    time: string;
    currency: string;
    event: string;
    actual: string;
    forecast: string;
    previous: string;
    importance: string;
  };
}

const COMMON_SELECTOR: SelectorMapping = {
  rowPattern: /<tr[^>]*>([\s\S]*?)<\/tr>/gi,
  cellPattern: /<td[^>]*>([\s\S]*?)<\/td>/gi,
  eventIdPattern: /id="(eventRowId_[^"]+)"/i,
  classHints: {
    time: "time",
    currency: "flagCur",
    event: "event",
    actual: "act",
    forecast: "fore",
    previous: "prev",
    importance: "sentiment",
  },
};

export const SELECTOR_MAP: Record<EconomicTab, SelectorMapping> = {
  economic: {
    ...COMMON_SELECTOR,
    rowPattern: /<tr[^>]*id="eventRowId_[^"]*"[^>]*>[\s\S]*?<\/tr>/gi,
  },
  holidays: COMMON_SELECTOR,
  dividends: COMMON_SELECTOR,
  splits: COMMON_SELECTOR,
  ipo: COMMON_SELECTOR,
};
