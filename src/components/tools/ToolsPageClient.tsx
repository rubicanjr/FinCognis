"use client";

import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
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
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
          <h1 className="font-headline text-2xl font-bold text-on-surface">Araçlar arayüzü hatası</h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            İstemci tarafında bir bileşen çöktü. Aşağıdaki mesajı paylaşarak hızlıca düzeltebiliriz.
          </p>
          <code className="mt-3 max-w-full break-words rounded-xl border border-error/40 bg-error-container/60 px-3 py-2 text-xs text-error">
            {this.state.message}
          </code>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl border border-outline-variant/40 bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface hover:border-secondary hover:text-secondary"
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
    <div className="mb-3 rounded-xl border border-error/40 bg-error-container/60 px-3 py-2 text-xs text-error">
      Runtime uyarısı: {runtimeIssue}
    </div>
  );
}

export default function ToolsPageClient() {
  return (
    <ToolsClientBoundary>
      <div className="min-h-screen bg-surface">
        <Navbar />
        <main className="mx-auto max-w-[1320px] px-4 pb-10 pt-24 sm:px-6">
          <RuntimeIssueBanner />
          <div className="mb-3 flex justify-end">
            <Link
              href="/tools/login"
              className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-secondary hover:text-secondary"
            >
              Giriş Sayfası
            </Link>
          </div>

          <CorrelationTest />
        </main>
      </div>
    </ToolsClientBoundary>
  );
}
