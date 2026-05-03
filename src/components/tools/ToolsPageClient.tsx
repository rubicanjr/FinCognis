"use client";

import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { CircleGauge, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import CorrelationTest from "@/components/tools/CorrelationTest";

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

          <div className="tools-premium-banner mb-6 overflow-hidden rounded-3xl border border-white/15 p-5 shadow-[0_28px_80px_-40px_rgba(2,132,199,0.52)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/45 bg-cyan-400/10 px-3 py-1 font-display text-[11px] font-semibold tracking-[0.12em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                FinCognis Decision Engine
              </span>
              <Link
                href="/tools/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2 font-display text-xs font-semibold tracking-[0.07em] text-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/70 hover:text-cyan-200"
              >
                <ShieldCheck className="h-4 w-4" />
                Giriş Sayfası
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <h1 className="font-display text-3xl font-semibold leading-tight tracking-[0.01em] text-slate-50 sm:text-4xl">
                Premium Karar Deneyimi
              </h1>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/45 bg-cyan-400/12 px-3 py-1 font-data text-xs text-cyan-100">
                <CircleGauge className="h-3.5 w-3.5" />
                Canlı analiz katmanı
              </span>
            </div>

            <p className="mt-3 max-w-4xl text-sm text-slate-300 sm:text-base">
              Karşılaştırma, profil keşfi ve metrik içgörülerini tek bir profesyonel akışta birleştiren kullanıcı
              paneli. Aynı premium görsel dil, aynı karar netliği.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "Kobalt Mavi UI",
                "Canlı Varlık Eşleşmesi",
                "Şeffaf Risk Metrikleri",
              ].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/20 bg-slate-900/65 px-3 py-1 font-display text-[11px] tracking-[0.04em] text-slate-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <CorrelationTest />
        </main>
      </div>
    </ToolsClientBoundary>
  );
}



