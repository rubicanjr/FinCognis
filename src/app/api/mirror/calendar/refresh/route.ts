import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      status: "DISABLED",
      message: "Takvim yenileme worker akışı devre dışıdır. Lütfen /api/mirror/calendar endpointini kullanın.",
    },
    { status: 410 },
  );
}
