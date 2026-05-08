import { describe, expect, it } from "vitest";
import {
  CRON_TR_0900,
  shouldRunDailyPaperTradingUpdate,
  toIstanbulParts,
} from "@/validation/paper-trading-scheduler";

describe("paper-trading-scheduler", () => {
  it("exposes 09:00 TRT cron expression", () => {
    expect(CRON_TR_0900).toBe("0 9 * * 1-5");
  });

  it("converts timestamp to Istanbul date parts", () => {
    const ts = new Date("2026-05-08T06:00:00.000Z").getTime();
    const parts = toIstanbulParts(ts);
    expect(parts.hour).toBe(9);
  });

  it("runs only once in target minute window", () => {
    const candidate = new Date("2026-05-08T06:00:20.000Z").getTime(); // 09:00:20 TRT
    const duplicate = new Date("2026-05-08T06:00:40.000Z").getTime();

    const first = shouldRunDailyPaperTradingUpdate({
      nowTimestamp: candidate,
      lastRunTimestamp: null,
    });
    const second = shouldRunDailyPaperTradingUpdate({
      nowTimestamp: duplicate,
      lastRunTimestamp: candidate,
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
