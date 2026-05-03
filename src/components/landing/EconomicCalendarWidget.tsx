"use client";

import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

export interface CalendarWidgetProps {
  theme: "dark" | "light";
  defaultCurrency: number;
  importance: string;
  height?: string;
  width?: string;
}

type WidgetStatus = "loading" | "ready" | "error";

const SCRIPT_BASE_URL = "https://www.investing.com/webmaster-tools/economic-calendar-v2/index.php";

function clearContainer(node: HTMLDivElement): void {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function applyIframeSandbox(node: HTMLDivElement): void {
  node.querySelectorAll("iframe").forEach((frame) => {
    frame.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation-by-user-activation",
    );
    frame.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    frame.setAttribute("loading", "lazy");
  });
}

function buildWidgetUrl(importance: string, defaultCurrency: number): string {
  const params = new URLSearchParams({
    importance,
    features: "datepicker,timezone",
    countries: String(defaultCurrency),
    calType: "day",
    timeZone: "55",
    lang: "10",
  });
  return `${SCRIPT_BASE_URL}?${params.toString()}`;
}

function mountWidget(
  node: HTMLDivElement,
  scriptUrl: string,
  onReady: () => void,
  onError: () => void,
): () => void {
  clearContainer(node);

  const script = document.createElement("script");
  script.src = scriptUrl;
  script.async = true;
  script.defer = true;

  const observer = new MutationObserver(() => {
    applyIframeSandbox(node);
    if (node.querySelector("iframe")) {
      onReady();
    }
  });

  observer.observe(node, { childList: true, subtree: true });
  script.addEventListener("load", () => {
    applyIframeSandbox(node);
    if (node.querySelector("iframe")) {
      onReady();
    }
  });
  script.addEventListener("error", onError);
  node.appendChild(script);

  return () => {
    observer.disconnect();
    script.removeEventListener("error", onError);
    clearContainer(node);
  };
}

export default function EconomicCalendarWidget({
  theme,
  defaultCurrency,
  importance,
  height = "740px",
  width = "100%",
}: CalendarWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<WidgetStatus>("loading");

  const scriptUrl = useMemo(() => buildWidgetUrl(importance, defaultCurrency), [defaultCurrency, importance]);
  const filterClass =
    theme === "dark"
      ? "brightness-[0.8] contrast-[1.2] hue-rotate-[190deg] saturate-[1.5]"
      : "brightness-[0.92] contrast-[1.1] hue-rotate-[175deg] saturate-[1.25]";

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    setStatus("loading");
    let isActive = true;

    const timeout = window.setTimeout(() => {
      if (isActive) {
        setStatus("error");
      }
    }, 5000);

    const cleanupMount = mountWidget(
      node,
      scriptUrl,
      () => {
        if (!isActive) return;
        window.clearTimeout(timeout);
        setStatus("ready");
      },
      () => {
        if (!isActive) return;
        window.clearTimeout(timeout);
        setStatus("error");
      },
    );

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
      cleanupMount();
    };
  }, [scriptUrl]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl">
      {status === "loading" ? (
        <div
          className="animate-pulse bg-slate-800/70"
          style={{ height, width }}
          data-testid="calendar-widget-loading"
          aria-live="polite"
        />
      ) : null}

      {status === "error" ? (
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-rose-300/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">
          <AlertCircle className="h-4 w-4" />
          <span>Takvim yüklenemedi. Lütfen tekrar deneyin.</span>
        </div>
      ) : null}

      <div
        ref={containerRef}
        style={{ height, width }}
        className={`w-full overflow-hidden transition-opacity duration-700 ${filterClass} ${
          status === "ready" ? "opacity-100" : "opacity-0"
        }`}
        data-testid="calendar-widget-container"
      />

      <div className="pointer-events-none absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-slate-900 to-transparent" />
    </div>
  );
}
