import { NextResponse } from "next/server";

interface PresenceStore {
  sessions: Map<string, number>;
}

const STALE_MS = 90_000;
const BASE_BUFFER = 10;

function getStore(): PresenceStore {
  const globalRef = globalThis as typeof globalThis & { __fincognisPresenceStore?: PresenceStore };
  if (!globalRef.__fincognisPresenceStore) {
    globalRef.__fincognisPresenceStore = { sessions: new Map<string, number>() };
  }
  return globalRef.__fincognisPresenceStore;
}

function cleanupSessions(store: PresenceStore): void {
  const threshold = Date.now() - STALE_MS;
  for (const [sessionId, lastSeen] of store.sessions.entries()) {
    if (lastSeen < threshold) {
      store.sessions.delete(sessionId);
    }
  }
}

function buildPayload(store: PresenceStore) {
  cleanupSessions(store);
  const active = store.sessions.size;
  return {
    activeUsers: active,
    displayUsers: BASE_BUFFER + active,
    updatedAt: new Date().toISOString(),
  };
}

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  return NextResponse.json(buildPayload(store), { status: 200 });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string };
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";

  const store = getStore();
  if (sessionId) {
    store.sessions.set(sessionId, Date.now());
  }

  return NextResponse.json(buildPayload(store), { status: 200 });
}

