import { NextResponse } from "next/server";
import { getMostActiveStocks } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getMostActiveStocks();
  return NextResponse.json(result, { status: 200 });
}
