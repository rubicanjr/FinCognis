import { describe, expect, it } from "vitest";
import {
  createPaperTradingLog,
  createPaperTradingSession,
  type PaperTradeEntry,
} from "@/validation/paper-trading-log";

describe("paper-trading-log", () => {
  it("creates a session and appends trades with notes", async () => {
    const repository = createPaperTradingLog();
    const session = await createPaperTradingSession(repository, {
      id: "session-1",
      symbol: "TUPRS.IS",
      startedAt: new Date("2026-01-01T00:00:00.000Z").getTime(),
      initialCapital: 100_000,
    });

    expect(session.id).toBe("session-1");

    const entry: PaperTradeEntry = {
      id: "trade-1",
      sessionId: session.id,
      timestamp: new Date("2026-01-02T10:00:00.000Z").getTime(),
      action: "BUY",
      quantity: 100,
      price: 120.5,
      reason: "Layer4+Layer5 alignment",
      note: "Macro neutral",
    };

    await repository.append(entry);
    const trades = await repository.listBySession(session.id);

    expect(trades).toHaveLength(1);
    expect(trades[0]?.note).toContain("Macro");
  });

  it("reports 3-month readiness from session age", async () => {
    const repository = createPaperTradingLog();
    await createPaperTradingSession(repository, {
      id: "session-2",
      symbol: "THYAO.IS",
      startedAt: new Date("2026-01-01T00:00:00.000Z").getTime(),
      initialCapital: 100_000,
    });

    const status = await repository.getReadiness(
      "session-2",
      new Date("2026-04-15T00:00:00.000Z").getTime()
    );

    expect(status.ready).toBe(true);
    expect(status.elapsedDays).toBeGreaterThanOrEqual(90);
  });
});
