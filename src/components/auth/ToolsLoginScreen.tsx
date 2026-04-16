"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Chrome, ShieldCheck } from "lucide-react";
import { getAuthSessionFromSupabase, isAuthActive } from "@/lib/auth/auth-session";
import { startGoogleOAuthFlow } from "@/lib/auth/google-oauth";
import { createSupabaseBrowserClient, hasSupabasePublicEnv } from "@/utils/supabase";

interface ToolsLoginScreenProps {
  defaultNextPath: string;
}

interface GoogleLoginState {
  pending: boolean;
  error: string;
}

function createInitialState(): GoogleLoginState {
  // 1) Return deterministic initial login state.
  return { pending: false, error: "" };
}

function createRedirectTarget(nextPath: string): string {
  // 1) Build absolute redirect URL for OAuth callback.
  return `${window.location.origin}${nextPath}`;
}

export default function ToolsLoginScreen({ defaultNextPath }: ToolsLoginScreenProps) {
  // 1) Prepare router and auth client instances.
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const hasSupabaseConfig = useMemo(() => hasSupabasePublicEnv(), []);
  const [state, setState] = useState<GoogleLoginState>(createInitialState);

  useEffect(() => {
    // 1) Stop auth check when Supabase client is unavailable.
    if (!supabase) return;
    // 2) Resolve current auth session from Supabase.
    getAuthSessionFromSupabase(supabase).then((session) => {
      // 3) Redirect authenticated users to tools route.
      if (isAuthActive(session)) router.replace(defaultNextPath);
    });
  }, [defaultNextPath, router, supabase]);

  async function handleGoogleSignIn() {
    // 1) Prevent OAuth flow when environment is not configured.
    if (!supabase) {
      setState({
        pending: false,
        error:
          "Supabase yapılandırması eksik. NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY değerlerini tanımlayın.",
      });
      return;
    }
    // 2) Mark UI as pending and clear old errors.
    setState({ pending: true, error: "" });
    // 3) Trigger OAuth flow with strict redirect target.
    const result = await startGoogleOAuthFlow(supabase, createRedirectTarget(defaultNextPath));
    // 4) Return early when provider redirect starts successfully.
    if (result.ok) return;
    // 5) Show fallback error state on failure.
    setState({ pending: false, error: "Google girişi başlatılamadı. Lütfen tekrar deneyin." });
  }

  function goHome() {
    // 1) Navigate back to home screen in non-auth flow.
    startTransition(() => router.replace("/"));
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-surface px-4 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-outline-variant/30 bg-surface-container-low p-6 shadow-xl shadow-surface-container-high/30 sm:p-8">
        <div className="mb-8 space-y-3 text-center">
          <p className="font-label text-xs font-bold uppercase tracking-[0.24em] text-secondary">
            FinCognis Güvenli Giriş
          </p>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface">Araçlara Devam Et</h1>
          <p className="text-sm text-on-surface-variant">
            Komisyon, Korelasyon ve Stres araçlarına erişmek için Google ile giriş yapın.
          </p>
        </div>

        <div className="space-y-4">
          {!hasSupabaseConfig ? (
            <div className="rounded-xl border border-warning/35 bg-warning-container/70 p-3 text-xs text-on-surface">
              <div className="mb-1 flex items-center gap-2 font-semibold text-warning">
                <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
                Yapılandırma Uyarısı
              </div>
              Supabase ortam değişkenleri tanımlanmadan OAuth akışı başlatılamaz.
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={state.pending || !hasSupabaseConfig}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Chrome className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            {state.pending ? "Google yönlendirmesi hazırlanıyor..." : "Google ile Giriş Yap"}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>

          {state.error ? (
            <p className="rounded-lg border border-error/40 bg-error-container/60 px-3 py-2 text-sm text-error">{state.error}</p>
          ) : null}

          <div className="rounded-xl border border-outline-variant/30 bg-surface p-3 text-xs text-on-surface-variant">
            <div className="mb-1 flex items-center gap-2 text-on-surface">
              <ShieldCheck className="h-4 w-4 text-secondary" strokeWidth={1.5} />
              OAuth Güvencesi
            </div>
            Oturum Supabase Auth üzerinden yönetilir ve erişim `/tools` girişinde doğrulanır.
          </div>

          <div className="text-center">
            <button type="button" onClick={goHome} className="text-xs text-secondary underline">
              Anasayfaya dön
            </button>
          </div>
          <div className="text-center">
            <Link href="/tools" className="text-[11px] text-on-surface-variant underline">
              Oturumunuz açıksa doğrudan araçlara geçebilirsiniz
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
