"use client";

import { useEffect } from "react";

interface ToolsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ToolsError({ error, reset }: ToolsErrorProps) {
  useEffect(() => {
    // Surface runtime details in developer console for faster diagnosis.
    console.error("Tools route runtime error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
      <h1 className="font-headline text-2xl font-bold text-on-surface">Araçlar sayfası yüklenemedi</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Tarayıcı ortamı bazı API çağrılarını engellemiş olabilir. Sayfayı yeniden deneyin.
      </p>
      <code className="mt-3 max-w-full break-words rounded-xl border border-error/40 bg-error-container/60 px-3 py-2 text-xs text-error">
        {error.message || "Bilinmeyen route hatası."}
        {error.digest ? ` | digest: ${error.digest}` : ""}
      </code>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg border border-outline-variant/40 bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface hover:border-secondary hover:text-secondary"
      >
        Tekrar Dene
      </button>
    </main>
  );
}
