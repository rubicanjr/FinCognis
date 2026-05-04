import { NextResponse } from "next/server";
import {
  EconomicMirrorResponseSchema,
  EconomicRangeSchema,
  EconomicTabSchema,
  type EconomicRange,
  type EconomicTab,
} from "@/lib/economic-calendar/schema";
import { fetchCalendarData } from "@/lib/economic-calendar/mirror";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseTab(value: string | null): EconomicTab {
  const parsed = EconomicTabSchema.safeParse(value);
  return parsed.success ? parsed.data : "economic";
}

function parseRange(value: string | null): EconomicRange {
  const parsed = EconomicRangeSchema.safeParse(value);
  return parsed.success ? parsed.data : "today";
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const tab = parseTab(searchParams.get("tab"));
  const range = parseRange(searchParams.get("range"));

  try {
    const result = await fetchCalendarData(tab, range);

    if (result.events.length === 0) {
      return NextResponse.json(
        {
          error: "Veri sunucusu senkronizasyonunda geçici bir gecikme yaşanıyor.",
          tab,
          range,
          updatedAt: result.updatedAt,
          events: [],
        },
        {
          status: 503,
          headers: {
            "X-Data-Age": result.dataAge,
          },
        },
      );
    }

    const responsePayload = EconomicMirrorResponseSchema.parse({
      tab,
      range,
      updatedAt: result.updatedAt,
      events: result.events,
    });

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: {
        "X-Data-Age": result.dataAge,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen takvim hatası";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
