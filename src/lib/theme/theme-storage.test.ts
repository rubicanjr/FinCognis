import { beforeEach, describe, expect, it } from "vitest";
import {
  readThemeConfigFromStorage,
  saveThemeConfigToStorage,
  toggleThemeMode,
} from "@/lib/theme/theme-storage";
import type { ThemeConfig } from "@/lib/contracts/core-schemas";

describe("theme storage persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists toggle state between reads", () => {
    const initial: ThemeConfig = {
      mode: "dark",
      isSystemPreferred: false,
      updatedAt: "2026-04-14T10:00:00.000Z",
    };

    saveThemeConfigToStorage(initial);
    const toggled = toggleThemeMode(readThemeConfigFromStorage(initial));
    saveThemeConfigToStorage(toggled);
    const restored = readThemeConfigFromStorage(initial);

    expect(restored.mode).toBe("light");
  });
});

