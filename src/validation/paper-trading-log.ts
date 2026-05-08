import { evaluatePaperTradingReadiness, type PaperTradingReadiness } from "@/validation/backtest-engine";

export type PaperTradeAction = "BUY" | "SELL" | "HOLD";

export interface PaperTradingSession {
  id: string;
  symbol: string;
  startedAt: number;
  initialCapital: number;
}

export interface PaperTradeEntry {
  id: string;
  sessionId: string;
  timestamp: number;
  action: PaperTradeAction;
  quantity: number;
  price: number;
  reason: string;
  note: string;
}

export interface PaperTradingLogRepository {
  createSession(session: PaperTradingSession): Promise<PaperTradingSession>;
  getSession(sessionId: string): Promise<PaperTradingSession | null>;
  append(entry: PaperTradeEntry): Promise<void>;
  listBySession(sessionId: string): Promise<PaperTradeEntry[]>;
  getReadiness(sessionId: string, nowTimestamp: number): Promise<PaperTradingReadiness>;
}

interface InMemoryPaperTradingStore {
  sessions: Map<string, PaperTradingSession>;
  entries: Map<string, PaperTradeEntry[]>;
}

const EMPTY_READINESS: PaperTradingReadiness = {
  ready: false,
  elapsedDays: 0,
  requiredDays: 90,
};

export function createPaperTradingLog(
  seedStore?: InMemoryPaperTradingStore
): PaperTradingLogRepository {
  const store: InMemoryPaperTradingStore = seedStore ?? {
    sessions: new Map<string, PaperTradingSession>(),
    entries: new Map<string, PaperTradeEntry[]>(),
  };

  return {
    async createSession(session) {
      store.sessions.set(session.id, session);
      store.entries.set(session.id, []);
      return session;
    },

    async getSession(sessionId) {
      return store.sessions.get(sessionId) ?? null;
    },

    async append(entry) {
      const list = store.entries.get(entry.sessionId) ?? [];
      store.entries.set(entry.sessionId, [...list, entry]);
    },

    async listBySession(sessionId) {
      return store.entries.get(sessionId) ?? [];
    },

    async getReadiness(sessionId, nowTimestamp) {
      const session = store.sessions.get(sessionId);
      if (!session) return EMPTY_READINESS;
      return evaluatePaperTradingReadiness(session.startedAt, nowTimestamp);
    },
  };
}

export async function createPaperTradingSession(
  repository: PaperTradingLogRepository,
  input: PaperTradingSession
): Promise<PaperTradingSession> {
  return repository.createSession(input);
}
