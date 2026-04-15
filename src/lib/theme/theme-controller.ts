import {
  parseThemeConfig,
  type ThemeConfig,
} from "@/lib/contracts/core-schemas";

export function createThemeConfigFromUnknown(payload: unknown): ThemeConfig {
  // 1) Attempt strict parsing for unknown payload.
  const parsed = parseThemeConfig(payload);
  // 2) Return parsed config when valid.
  if (parsed) return parsed;
  // 3) Return fallback config when payload is invalid.
  return {
    mode: "dark",
    isSystemPreferred: true,
    updatedAt: new Date().toISOString(),
  };
}

export function getNextThemeConfig(config: ThemeConfig): ThemeConfig {
  // 1) Compute target mode from current mode.
  const mode = config.mode === "dark" ? "light" : "dark";
  // 2) Return immutable next config with updated timestamp.
  return {
    ...config,
    mode,
    isSystemPreferred: false,
    updatedAt: new Date().toISOString(),
  };
}

