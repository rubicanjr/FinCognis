import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { fetchCalendarEvents } from "@/lib/api/calendar-client";
import { EconomicRangeSchema, EconomicTabSchema, type EconomicRange, type EconomicTab } from "@/lib/economic-calendar/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NONCE_TTL_MS = 5 * 60_000;
const nonceSeen = new Map<string, number>();

function parseTab(value: string | null): EconomicTab {
  const parsed = EconomicTabSchema.safeParse(value);
  return parsed.success ? parsed.data : "economic";
}

function parseRange(value: string | null): EconomicRange {
  const parsed = EconomicRangeSchema.safeParse(value);
  return parsed.success ? parsed.data : "today";
}

function hexBuffer(value: string): Buffer {
  return Buffer.from(value, "hex");
}

function equalHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(hexBuffer(a), hexBuffer(b));
  } catch {
    return false;
  }
}

function cleanupNonceStore(nowMs: number): void {
  for (const [key, value] of nonceSeen.entries()) {
    if (nowMs - value > NONCE_TTL_MS) nonceSeen.delete(key);
  }
}

function verifyRefreshRequest(request: Request): boolean {
  const secret = process.env.CALENDAR_REFRESH_SECRET;
  if (!secret) return false;

  const signature = request.headers.get("x-refresh-signature") ?? "";
  const timestamp = request.headers.get("x-refresh-timestamp") ?? "";
  const nonce = request.headers.get("x-refresh-nonce") ?? "";

  if (!signature || !timestamp || !nonce) return false;

  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;

  const nowMs = Date.now();
  const ageMs = Math.abs(nowMs - ts);
  if (ageMs > NONCE_TTL_MS) return false;

  cleanupNonceStore(nowMs);
  if (nonceSeen.has(nonce)) return false;

  const url = new URL(request.url);
  const bodyHash = createHmac("sha256", secret).update("").digest("hex");
  const payload = `${timestamp}.${nonce}.${request.method}.${url.pathname}.${bodyHash}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  if (!equalHex(signature, expected)) return false;
  nonceSeen.set(nonce, nowMs);
  return true;
}

export async function POST(request: Request) {
  if (!verifyRefreshRequest(request)) {
    return NextResponse.json({ ok: false, status: "UNAUTHORIZED" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const tab = parseTab(searchParams.get("tab"));
  const range = parseRange(searchParams.get("range"));
  const result = await fetchCalendarEvents(tab, range);

  return NextResponse.json({ ok: result.status === "READY" || result.status === "READY_FALLBACK", result }, { status: 200 });
}
