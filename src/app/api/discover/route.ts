import { NextResponse } from "next/server";
import {
  DiscoverRequestSchema,
  DiscoverResponseSchema,
} from "@/lib/contracts/universal-asset-schemas";
import { runDiscover } from "@/lib/services/discover-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = DiscoverRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid discover payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const response = await runDiscover(parsed.data);
    return NextResponse.json(DiscoverResponseSchema.parse(response), { status: 200 });
  } catch (error: unknown) {
    console.error("[api/discover] internal error", {
      message: error instanceof Error ? error.message : String(error),
      horizon: parsed.data.horizon,
    });
    return NextResponse.json(
      {
        error: "Profil keşfi geçici olarak alınamadı.",
        code: "DISCOVER_INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
