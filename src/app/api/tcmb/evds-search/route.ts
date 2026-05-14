import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EVDS3_BASE = "https://evds3.tcmb.gov.tr/igmevdsms-dis";
const EVDS_API_KEY = process.env.EVDS_API_KEY || "";

/**
 * GET /api/tcmb/evds-search
 *
 * Search EVDS (TCMB) database for available time-series by keyword.
 * Uses EVDS3 public search endpoint.
 *
 * Query params:
 *   keyword - Search keyword (required, e.g. "dolar", "faiz", "enflasyon")
 *   type    - Result type: "series" | "groups" | "all" (default: "all")
 */
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const keyword = searchParams.get("keyword");

  if (!keyword) {
    return NextResponse.json(
      { error: "keyword parameter is required" },
      { status: 400 }
    );
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (EVDS_API_KEY) {
      headers.key = EVDS_API_KEY;
    }

    const response = await fetch(
      `${EVDS3_BASE}/searchResults?searchVal=${encodeURIComponent(keyword)}`,
      { headers, signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `EVDS search failed: HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Simplify the response
    const series = (data.seriler || []).slice(0, 20).map(
      (s: Record<string, unknown>) => ({
        serieCode: s.serieCode,
        serieName: s.serieName,
        serieNameEng: s.serieNameEng,
        frequency: s.frequencyStr,
        defaultAggMethod: s.defaultAggMethodStr,
      })
    );

    const dataGroups = (data.veriGruplari || []).slice(0, 10).map(
      (g: Record<string, unknown>) => ({
        dataGroupCode: g.dataGroupCode,
        dataGroupType: g.dataGroupType,
        dataGroupTypeEng: g.dataGroupTypeEng,
        frequency: g.frequencyStr,
      })
    );

    return NextResponse.json({ series, dataGroups });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
