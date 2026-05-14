"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { ThemeConfig } from "@/lib/contracts/core-schemas";
import { saveThemeConfigToStorage } from "@/lib/theme/theme-storage";

interface ThemeContextValue {
  config: ThemeConfig;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_THEME_CONFIG: ThemeConfig = {
  mode: "dark",
  isSystemPreferred: false,
  updatedAt: "1970-01-01T00:00:00.000Z",
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Persist forced dark-mode config for consumers that read storage directly.
    saveThemeConfigToStorage(DARK_THEME_CONFIG);
  }, []);

  useEffect(() => {
    // 1) Apply theme directly on root html element to prevent nested theme bleed.
    try {
      const root = document.documentElement;
      root.setAttribute("data-theme", DARK_THEME_CONFIG.mode);
      root.classList.remove("dark", "light");
      root.classList.add(DARK_THEME_CONFIG.mode);
    } catch {
      // Ignore theme DOM failures in restricted embedded browsers.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      config: DARK_THEME_CONFIG,
      toggleMode: () => undefined,
    }),
    []
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  // 1) Read context once.
  const context = useContext(ThemeContext);
  // 2) Return no-op fallback when provider is missing.
  if (!context) {
    return {
      config: {
        mode: "dark",
        isSystemPreferred: false,
        updatedAt: new Date().toISOString(),
      },
      toggleMode: () => undefined,
    };
  }
  // 3) Return typed context.
  return context;
}
