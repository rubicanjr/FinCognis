import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TCMB_KUR_BASE = "https://www.tcmb.gov.tr/kurlar";

interface TcmbCurrency {
  currencyCode: string;
  unit: number;
  nameTR: string;
  nameEN: string;
  forexBuying: number | null;
  forexSelling: number | null;
  banknoteBuying: number | null;
  banknoteSelling: number | null;
  crossRateUSD: number | null;
}

interface TcmbRatesResponse {
  date: string;
  bulletinNo: string;
  currencyCount: number;
  currencies: TcmbCurrency[];
}

/** Parse TCMB XML exchange rate bulletin */
function parseTcmbXml(xmlText: string): TcmbRatesResponse {
  const dateMatch = xmlText.match(/Tarih="([^"]+)"/);
  const bulletinMatch = xmlText.match(/Bulten_No="([^"]+)"/);

  const currencies: TcmbCurrency[] = [];
  const blocks = xmlText.split("<Currency ");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const attrsEnd = block.indexOf(">");
    const attrs = attrsEnd > 0 ? block.slice(0, attrsEnd) : "";
    const inner = attrsEnd > 0 ? block.slice(attrsEnd + 1) : block;

    const codeMatch = attrs.match(/CurrencyCode="([^"]+)"/);
    const unitMatch = inner.match(/<Unit>([^<]+)<\/Unit>/);
    const nameTrMatch = inner.match(/<Isim>([^<]+)<\/Isim>/);
    const nameEnMatch = inner.match(/<CurrencyName>([^<]+)<\/CurrencyName>/);
    const fbMatch = inner.match(/<ForexBuying>([^<]+)<\/ForexBuying>/);
    const fsMatch = inner.match(/<ForexSelling>([^<]+)<\/ForexSelling>/);
    const bbMatch = inner.match(/<BanknoteBuying>([^<]+)<\/BanknoteBuying>/);
    const bsMatch = inner.match(/<BanknoteSelling>([^<]+)<\/BanknoteSelling>/);
    const crMatch = inner.match(/<CrossRateUSD>([^<]+)<\/CrossRateUSD>/);

    if (codeMatch) {
      currencies.push({
        currencyCode: codeMatch[1],
        unit: unitMatch ? parseInt(unitMatch[1], 10) : 1,
        nameTR: nameTrMatch?.[1]?.trim() ?? "",
        nameEN: nameEnMatch?.[1]?.trim() ?? "",
        forexBuying: fbMatch ? parseFloat(fbMatch[1]) : null,
        forexSelling: fsMatch ? parseFloat(fsMatch[1]) : null,
        banknoteBuying: bbMatch ? parseFloat(bbMatch[1]) : null,
        banknoteSelling: bsMatch ? parseFloat(bsMatch[1]) : null,
        crossRateUSD: crMatch ? parseFloat(crMatch[1]) : null,
      });
    }
  }

  return {
    date: dateMatch?.[1] ?? "",
    bulletinNo: bulletinMatch?.[1] ?? "",
    currencyCount: currencies.length,
    currencies,
  };
}

/** Build TCMB XML URL for a specific date */
function buildTcmbUrl(date?: string): string {
  if (!date) return `${TCMB_KUR_BASE}/today.xml`;

  // Parse DD.MM.YYYY
  const parts = date.split(".");
  if (parts.length !== 3) throw new Error("Invalid date format. Use DD.MM.YYYY");
  const [dd, mm, yyyy] = parts;
  return `${TCMB_KUR_BASE}/${yyyy}${mm}/${dd}${mm}${yyyy}.xml`;
}

/**
 * GET /api/tcmb/exchange-rates
 *
 * Query params:
 *   date - Date in DD.MM.YYYY format (optional, defaults to today)
 *   currency - Filter by currency code(s), comma-separated (optional, e.g. "USD,EUR,GBP")
 */
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const date = searchParams.get("date") || undefined;
  const currencyFilter = searchParams.get("currency");

  try {
    const url = buildTcmbUrl(date);
    const response = await fetch(url, {
      headers: { "User-Agent": "Fincept-Terminal/1.0" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `TCMB bulletin not found for date: ${date ?? "today"}`, status: response.status },
        { status: response.status }
      );
    }

    const xmlText = await response.text();
    const data = parseTcmbXml(xmlText);

    // Apply currency filter if specified
    if (currencyFilter) {
      const codes = new Set(currencyFilter.toUpperCase().split(",").map((c) => c.trim()));
      data.currencies = data.currencies.filter((c) => codes.has(c.currencyCode));
      data.currencyCount = data.currencies.length;
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
