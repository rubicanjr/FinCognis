import {
  parseThemeConfig,
  type ThemeConfig,
} from "@/lib/contracts/core-schemas";

const THEME_STORAGE_KEY = "fincognis_theme_config";

export function readThemeConfigFromStorage(fallback: ThemeConfig): ThemeConfig {
  // 1) Read raw storage value.
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  // 2) Return fallback when key does not exist.
  if (!raw) {
    return fallback;
  }
  // 3) Parse JSON safely and validate with Zod-backed parser.
  try {
    const parsed = parseThemeConfig(JSON.parse(raw));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveThemeConfigToStorage(config: ThemeConfig): void {
  // 1) Convert typed config to JSON string.
  const serialized = JSON.stringify(config);
  // 2) Persist to localStorage.
  localStorage.setItem(THEME_STORAGE_KEY, serialized);
}

export function toggleThemeMode(config: ThemeConfig): ThemeConfig {
  // 1) Compute next mode deterministically.
  const nextMode = config.mode === "dark" ? "light" : "dark";
  // 2) Return immutable updated config with timestamp.
  return {
    ...config,
    mode: nextMode,
    isSystemPreferred: false,
    updatedAt: new Date().toISOString(),
  };
}

