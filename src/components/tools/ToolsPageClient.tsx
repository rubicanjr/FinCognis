"use client";

import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import Navbar from "@/components/landing/Navbar";
import CorrelationTest from "@/components/tools/CorrelationTest";
import TcmbExchangeRates from "@/components/tools/TcmbExchangeRates";
import BistScreener from "@/components/tools/BistScreener";
import BistDebate from "@/components/tools/BistDebate";
import BistBacktest from "@/components/tools/BistBacktest";

interface ClientBoundaryState {
  hasError: boolean;
  message: string;
}

class ToolsClientBoundary extends Component<{ children: ReactNode }, ClientBoundaryState> {
  state: ClientBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): ClientBoundaryState {
    return {
      hasError: true,
      message: error.message || "İstemci tarafında bilinmeyen bir hata oluştu.",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep verbose details available in console for diagnosis.
    console.error("Tools client boundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center text-slate-100">
          <h1 className="font-display text-2xl font-bold tracking-[0.02em]">Araçlar arayüzü hatası</h1>
          <p className="mt-2 text-sm text-slate-300">
            İstemci tarafında bir bileşen çöktü. Aşağıdaki mesajı paylaşarak hızlıca düzeltebiliriz.
          </p>
          <code className="mt-3 max-w-full break-words rounded-xl border border-red-500/45 bg-red-950/45 px-3 py-2 text-xs text-red-200">
            {this.state.message}
          </code>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/70 hover:text-cyan-200"
          >
            Sayfayı Yeniden Yükle
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

function RuntimeIssueBanner() {
  const [runtimeIssue, setRuntimeIssue] = useState<string | null>(null);

  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      const message = event.error instanceof Error ? event.error.message : event.message;
      setRuntimeIssue(message || "Bilinmeyen istemci hatası.");
      event.preventDefault();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Yakalanmamış promise hatası.";
      setRuntimeIssue(message);
      event.preventDefault();
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  if (!runtimeIssue) return null;

  return (
    <div className="mb-3 rounded-xl border border-red-500/45 bg-red-950/45 px-3 py-2 text-xs text-red-200">
      Runtime uyarısı: {runtimeIssue}
    </div>
  );
}

export default function ToolsPageClient() {
  return (
    <ToolsClientBoundary>
      <div className="tools-shell relative min-h-screen overflow-x-clip bg-surface">
        <div className="pointer-events-none absolute inset-0">
          <div className="tools-shell__base absolute inset-0" />
          <div className="tools-shell__aurora absolute inset-0" />
          <div className="tools-shell__grid absolute inset-0" />
        </div>

        <Navbar />

        <main className="relative z-10 mx-auto max-w-[1320px] px-4 pb-10 pt-24 sm:px-6">
          <RuntimeIssueBanner />

          <CorrelationTest />

          {/* BIST Screener Section */}
          <div className="mt-6">
            <BistScreener />
          </div>

          {/* BIST Debate Section */}
          <div className="mt-6">
            <BistDebate />
          </div>

          {/* BIST Backtest Section */}
          <div className="mt-6">
            <BistBacktest />
          </div>

          {/* TCMB Exchange Rates Section */}
          <div className="mt-6">
            <TcmbExchangeRates />
          </div>
        </main>
      </div>
    </ToolsClientBoundary>
  );
}



