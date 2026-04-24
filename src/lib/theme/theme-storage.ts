import {
  parseThemeConfig,
  type ThemeConfig,
} from "@/lib/contracts/core-schemas";
import { getNextThemeConfig } from "@/lib/theme/theme-controller";

const THEME_STORAGE_KEY = "fincognis_theme_config";

function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.localStorage !== "undefined";
}

export function readThemeConfigFromStorage(fallback: ThemeConfig): ThemeConfig {
  if (!isStorageAvailable()) return fallback;
  // 1) Read raw storage value.
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return fallback;
  }
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
  if (!isStorageAvailable()) return;
  // 1) Convert typed config to JSON string.
  const serialized = JSON.stringify(config);
  // 2) Persist to localStorage.
  try {
    localStorage.setItem(THEME_STORAGE_KEY, serialized);
  } catch {
    // Ignore storage write failures in restricted browser contexts.
  }
}

export function toggleThemeMode(config: ThemeConfig): ThemeConfig {
  // 1) Delegate mode transition to theme controller.
  return getNextThemeConfig(config);
}
