import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TCMB_KUR_BASE = "https://www.tcmb.gov.tr/kurlar";

const KEY_CURRENCIES = new Set(["USD", "EUR", "GBP", "CHF", "JPY", "SAR", "CNY", "KWD"]);

/** Parse currencies from TCMB XML text */
function parseCurrenciesFromXml(xmlText: string): {
  date: string;
  rates: Record<string, { buying: number | null; selling: number | null }>;
} {
  const dateMatch = xmlText.match(/Tarih="([^"]+)"/);
  const rates: Record<string, { buying: number | null; selling: number | null }> = {};

  const blocks = xmlText.split("<Currency ");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const attrsEnd = block.indexOf(">");
    const attrs = attrsEnd > 0 ? block.slice(0, attrsEnd) : "";
    const inner = attrsEnd > 0 ? block.slice(attrsEnd + 1) : block;

    const codeMatch = attrs.match(/CurrencyCode="([^"]+)"/);
    if (!codeMatch || !KEY_CURRENCIES.has(codeMatch[1])) continue;

    const fbMatch = inner.match(/<ForexBuying>([^<]+)<\/ForexBuying>/);
    const fsMatch = inner.match(/<ForexSelling>([^<]+)<\/ForexSelling>/);

    if (fbMatch || fsMatch) {
      rates[codeMatch[1]] = {
        buying: fbMatch ? parseFloat(fbMatch[1]) : null,
        selling: fsMatch ? parseFloat(fsMatch[1]) : null,
      };
    }
  }

  return { date: dateMatch?.[1] ?? "", rates };
}

/** Format date for TCMB URL: DD.MM.YYYY -> YYYYMM/DDMMYYYY */
function formatTcmbUrlPath(dateStr: string): string {
  const [dd, mm, yyyy] = dateStr.split(".");
  return `${yyyy}${mm}/${dd}${mm}${yyyy}.xml`;
}

/**
 * GET /api/tcmb/exchange-rates-history
 *
 * Query params:
 *   startDate - Start date in DD.MM.YYYY format (required)
 *   endDate   - End date in DD.MM.YYYY format (required)
 *   currency  - Comma-separated currency codes (optional, defaults to USD,EUR,GBP,CHF,JPY)
 */
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

  if (!startDateStr || !endDateStr) {
    return NextResponse.json(
      { error: "startDate and endDate are required (DD.MM.YYYY format)" },
      { status: 400 }
    );
  }

  // Parse dates
  const parseDottedDate = (s: string): Date => {
    const [d, m, y] = s.split(".").map(Number);
    return new Date(y, m - 1, d);
  };

  let startDate: Date;
  let endDate: Date;
  try {
    startDate = parseDottedDate(startDateStr);
    endDate = parseDottedDate(endDateStr);
  } catch {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const dayDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (dayDiff > 30) {
    return NextResponse.json(
      { error: "Date range limited to 30 days maximum" },
      { status: 400 }
    );
  }

  // Format date for output
  const formatOutputDate = (d: Date): string =>
    `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

  const results: Array<{
    date: string;
    rates: Record<string, { buying: number | null; selling: number | null }>;
  }> = [];

  const current = new Date(startDate);
  while (current <= endDate) {
    // Skip weekends (TCMB doesn't publish on Sat=6/Sun=0)
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      const dateStr = formatOutputDate(current);
      const url = `${TCMB_KUR_BASE}/${formatTcmbUrlPath(dateStr)}`;

      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "Fincept-Terminal/1.0" },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const xmlText = await response.text();
          const parsed = parseCurrenciesFromXml(xmlText);
          if (Object.keys(parsed.rates).length > 0) {
            results.push({ date: parsed.date || dateStr, rates: parsed.rates });
          }
        }
      } catch {
        // Skip unavailable dates silently
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return NextResponse.json({
    startDate: startDateStr,
    endDate: endDateStr,
    dataPoints: results.length,
    rates: results,
  });
}
