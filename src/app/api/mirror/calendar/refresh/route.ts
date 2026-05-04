import { NextResponse } from "next/server";
import { EconomicRangeSchema, EconomicTabSchema, type EconomicRange, type EconomicTab } from "@/lib/economic-calendar/schema";
import { refreshCalendarCache, refreshDefaultCalendarCache } from "@/lib/economic-calendar/mirror";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTab(value: string | null): EconomicTab {
  const parsed = EconomicTabSchema.safeParse(value);
  return parsed.success ? parsed.data : "economic";
}

function parseRange(value: string | null): EconomicRange {
  const parsed = EconomicRangeSchema.safeParse(value);
  return parsed.success ? parsed.data : "today";
}

function isAuthorized(request: Request): boolean {
  const configured = process.env.CALENDAR_REFRESH_SECRET;
  if (!configured) return true;

  const headerToken = request.headers.get("x-refresh-secret");
  const queryToken = new URL(request.url).searchParams.get("secret");
  return headerToken === configured || queryToken === configured;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized refresh request" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") ?? "single";

  try {
    if (mode === "batch") {
      const results = await refreshDefaultCalendarCache();
      return NextResponse.json({ ok: true, mode, results }, { status: 200 });
    }

    const tab = parseTab(params.get("tab"));
    const range = parseRange(params.get("range"));
    const result = await refreshCalendarCache(tab, range);

    return NextResponse.json({ ok: result.ok, mode, result }, { status: result.ok ? 200 : 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown worker error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
