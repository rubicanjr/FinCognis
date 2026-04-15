import { describe, expect, it } from "vitest";
import {
  createThemeConfigFromUnknown,
  getNextThemeConfig,
} from "@/lib/theme/theme-controller";

describe("theme-controller", () => {
  it("toggles dark mode to light mode with immutable config", () => {
    const current = createThemeConfigFromUnknown({
      mode: "dark",
      isSystemPreferred: false,
      updatedAt: "2026-04-14T12:00:00.000Z",
    });

    const next = getNextThemeConfig(current);

    expect(current.mode).toBe("dark");
    expect(next.mode).toBe("light");
    expect(next.isSystemPreferred).toBe(false);
  });
});

