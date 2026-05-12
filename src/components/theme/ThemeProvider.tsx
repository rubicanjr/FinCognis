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
import { saveThemeConfigToStorage } from "@/lib/theme/theme-storage";

interface ThemeContextValue {
  config: ThemeConfig;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getDefaultThemeConfig(): ThemeConfig {
  return {
    mode: "dark",
    isSystemPreferred: false,
    updatedAt: "1970-01-01T00:00:00.000Z",
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 1) Initialize state from strict defaults.
  const [config, setConfig] = useState<ThemeConfig>(getDefaultThemeConfig);

  useEffect(() => {
    setConfig({
      mode: "dark",
      isSystemPreferred: false,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  useEffect(() => {
    // 1) Persist current config after every change.
    saveThemeConfigToStorage(config);
  }, [config]);

  useEffect(() => {
    // 1) Apply theme directly on root html element to prevent nested theme bleed.
    try {
      const root = document.documentElement;
      root.setAttribute("data-theme", config.mode);
      root.classList.remove("dark", "light");
      root.classList.add(config.mode);
    } catch {
      // Ignore theme DOM failures in restricted embedded browsers.
    }
  }, [config.mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      config,
      toggleMode: () => undefined,
    }),
    [config]
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
        isSystemPreferred: true,
        updatedAt: new Date().toISOString(),
      },
      toggleMode: () => undefined,
    };
  }
  // 3) Return typed context.
  return context;
}
