import { NextResponse } from "next/server";
import { fetchInvestingNews } from "@/lib/investing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedLimit = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.floor(parsedLimit), 1), 50) : 20;

  const items = await fetchInvestingNews(limit);
  return NextResponse.json(
    {
      source: "Investing.com RSS",
      items,
      fetchedAt: new Date().toISOString(),
    },
    { status: 200 }
  );
}

