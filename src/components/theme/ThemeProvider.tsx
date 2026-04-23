"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ThemeConfig } from "@/lib/contracts/core-schemas";
import {
  readThemeConfigFromStorage,
  saveThemeConfigToStorage,
  toggleThemeMode,
} from "@/lib/theme/theme-storage";

interface ThemeContextValue {
  config: ThemeConfig;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemPreference(): "dark" | "light" {
  // 1) Guard against non-browser contexts.
  if (typeof window === "undefined") {
    return "dark";
  }
  // 2) Resolve browser preference with a deterministic fallback.
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getDefaultThemeConfig(): ThemeConfig {
  // 1) Read system preference once.
  const mode = getSystemPreference();
  // 2) Return strict default config.
  return {
    mode,
    isSystemPreferred: true,
    updatedAt: new Date().toISOString(),
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 1) Initialize state from strict defaults.
  const [config, setConfig] = useState<ThemeConfig>(getDefaultThemeConfig);

  useEffect(() => {
    // 1) Resolve persisted config from storage.
    const persisted = readThemeConfigFromStorage(getDefaultThemeConfig());
    // 2) Keep state synchronized with persisted config.
    setConfig(persisted);
  }, []);

  useEffect(() => {
    // 1) Persist current config after every change.
    saveThemeConfigToStorage(config);
  }, [config]);

  useEffect(() => {
    // 1) Apply theme directly on root html element to prevent nested theme bleed.
    const root = document.documentElement;
    root.setAttribute("data-theme", config.mode);
    root.classList.remove("dark", "light");
    root.classList.add(config.mode);
  }, [config.mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      config,
      toggleMode: () => {
        // 1) Compute next theme using pure helper.
        const next = toggleThemeMode(config);
        // 2) Update local state immutably.
        setConfig(next);
      },
    }),
    [config]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  // 1) Read context once.
  const context = useContext(ThemeContext);
  // 2) Throw explicit error when provider is missing.
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider.");
  }
  // 3) Return typed context.
  return context;
}
