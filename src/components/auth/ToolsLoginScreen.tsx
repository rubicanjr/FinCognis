"use client";

import { startTransition, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { LoginPayloadZodSchema } from "@/lib/contracts/core-schemas";
import {
  createAuthenticatedUser,
  isAuthActive,
  readAuthFromStorage,
  saveAuthToStorage,
} from "@/lib/auth/auth-session";

interface ToolsLoginScreenProps {
  defaultNextPath: string;
}

interface LoginState {
  email: string;
  password: string;
  pending: boolean;
  error: string;
}

function createInitialState(): LoginState {
  // 1) Provide deterministic initial UI state.
  return { email: "", password: "", pending: false, error: "" };
}

function getDemoCredentials() {
  // 1) Return static demo credentials for static deployment flow.
  return {
    email: "demo@fincognis.com",
    password: "Fincognis2026!",
  };
}

export default function ToolsLoginScreen({ defaultNextPath }: ToolsLoginScreenProps) {
  // 1) Initialize router, query helpers and component state.
  const router = useRouter();
  const [state, setState] = useState<LoginState>(createInitialState);
  const nextPath = defaultNextPath;

  useEffect(() => {
    // 1) Read local auth state from storage.
    const auth = readAuthFromStorage();
    // 2) Redirect authenticated users to intended route.
    if (isAuthActive(auth)) {
      router.replace(nextPath);
    }
  }, [nextPath, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // 1) Prevent default browser form submission.
    event.preventDefault();
    // 2) Validate unknown payload using Zod schema.
    const parsed = LoginPayloadZodSchema.safeParse({
      email: state.email,
      password: state.password,
    });
    if (!parsed.success) {
      setState((current) => ({ ...current, error: "Lütfen geçerli e-posta ve şifre girin." }));
      return;
    }
    // 3) Verify credentials and persist auth state.
    const demo = getDemoCredentials();
    setState((current) => ({ ...current, pending: true, error: "" }));
    if (
      parsed.data.email.toLowerCase() !== demo.email ||
      parsed.data.password !== demo.password
    ) {
      setState((current) => ({
        ...current,
        pending: false,
        error: "Giriş başarısız. Bilgileri kontrol edin.",
      }));
      return;
    }
    // 4) Save auth and redirect to protected tools route.
    saveAuthToStorage(createAuthenticatedUser(parsed.data.email.toLowerCase()));
    startTransition(() => {
      router.replace(nextPath);
      router.refresh();
    });
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-surface px-4 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-outline-variant/20 bg-surface-container-low p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="mb-8 space-y-3 text-center">
          <p className="font-label text-xs font-bold uppercase tracking-[0.24em] text-secondary">
            FinCognis Güvenli Giriş
          </p>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface">Araçlara Devam Et</h1>
          <p className="text-sm text-on-surface-variant">
            Komisyon, korelasyon ve stres araçlarına erişim için giriş yapın.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-on-surface-variant">
            E-posta
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-outline-variant/25 bg-surface px-3">
              <Mail className="h-4 w-4 text-secondary" strokeWidth={1.5} aria-hidden />
              <input
                type="email"
                value={state.email}
                onChange={(event) =>
                  setState((current) => ({ ...current, email: event.target.value }))
                }
                className="w-full bg-transparent py-3 text-on-surface outline-none"
                placeholder="demo@fincognis.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="block text-sm text-on-surface-variant">
            Şifre
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-outline-variant/25 bg-surface px-3">
              <LockKeyhole className="h-4 w-4 text-secondary" strokeWidth={1.5} aria-hidden />
              <input
                type="password"
                value={state.password}
                onChange={(event) =>
                  setState((current) => ({ ...current, password: event.target.value }))
                }
                className="w-full bg-transparent py-3 text-on-surface outline-none"
                placeholder="******"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {state.error ? (
            <p className="rounded-lg bg-error/20 px-3 py-2 text-sm text-error">{state.error}</p>
          ) : null}

          <button
            type="submit"
            disabled={state.pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-on-secondary transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.pending ? "Giriş yapılıyor..." : "Giriş Yap"}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-on-surface-variant">
          Demo girişi: <strong>demo@fincognis.com</strong> / <strong>Fincognis2026!</strong>
        </div>
        <div className="mt-2 text-center">
          <Link href="/" className="text-xs text-secondary underline">
            Anasayfaya dön
          </Link>
        </div>
      </div>
    </section>
  );
}
