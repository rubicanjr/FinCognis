"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { AlertCircle, LogOut, Network } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import CorrelationTest from "@/components/tools/CorrelationTest";
import {
  getAuthSessionFromSupabase,
  signOutFromSupabase,
  subscribeAuthSession,
} from "@/lib/auth/auth-session";
import { parseToolDataList, type ToolData } from "@/lib/contracts/core-schemas";
import { resolveToolsAccess } from "@/lib/auth/tools-gateway";
import { createSupabaseBrowserClient, hasSupabasePublicEnv } from "@/utils/supabase";

type ToolId = ToolData["id"];

const TOOL_DATA_SOURCE: unknown = [
  {
    id: "correlation",
    title: "Karar Destek Motoru",
    description:
      "Serbest metin yatırım sorularını risk maruziyeti ve korelasyon bağlamında yorumlayan akıllı analiz alanı",
    href: "/tools",
    iconKey: "network",
    requiresAuth: true,
    premium: true,
  },
];

function createToolRegistry(): ToolData[] {
  return parseToolDataList(TOOL_DATA_SOURCE) ?? [];
}

export default function ToolsPageClient() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const hasSupabaseConfig = useMemo(() => hasSupabasePublicEnv(), []);
  const toolRegistry = useMemo(() => createToolRegistry(), []);
  const [activeTool, setActiveTool] = useState<ToolId>("correlation");

  const activeToolMeta = useMemo(
    () => toolRegistry.find((tool) => tool.id === activeTool),
    [activeTool, toolRegistry]
  );

  useEffect(() => {
    if (!supabase) return;
    getAuthSessionFromSupabase(supabase).then((session) => {
      const decision = resolveToolsAccess("/tools", session);
      if (decision.action === "redirect" && decision.redirectTo) router.replace(decision.redirectTo);
    });
    return subscribeAuthSession(supabase, (session) => {
      const decision = resolveToolsAccess("/tools", session);
      if (decision.action === "redirect" && decision.redirectTo) router.replace(decision.redirectTo);
    });
  }, [router, supabase]);

  async function handleLogout() {
    if (!supabase) {
      startTransition(() => router.replace("/tools/login"));
      return;
    }
    await signOutFromSupabase(supabase);
    startTransition(() => router.replace("/tools/login"));
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-24">
        <div className="mb-6 text-center">
          <p className="mb-2 font-label text-sm font-bold uppercase tracking-[0.24em] text-secondary">
            FinCognis Karar Merkezi
          </p>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface sm:text-4xl">
            Riski Gör, Etkiyi Anla, Kararı Netleştir
          </h1>
          <p className="mx-auto mt-2 max-w-3xl text-sm text-on-surface-variant sm:text-base">
            Dahili API ile çalışan bu alan, yatırım tavsiyesi üretmez; sadece portföyünüzdeki risk
            yoğunluğunu ve birlikte hareket etkisini anlaşılır biçimde gösterir.
          </p>
        </div>

        {!hasSupabaseConfig ? (
          <div className="mb-4 rounded-2xl border border-warning/40 bg-warning-container/65 p-4 text-sm text-on-surface">
            <div className="mb-1 flex items-center gap-2 font-semibold text-warning">
              <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
              Supabase yapılandırması eksik
            </div>
            <code>NEXT_PUBLIC_SUPABASE_URL</code> ve <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> değişkenlerini tanımlayın.
          </div>
        ) : null}

        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-secondary hover:text-secondary"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            Çıkış Yap
          </button>
        </div>

        <Tabs.Root value={activeTool} onValueChange={() => setActiveTool("correlation")} className="space-y-3">
          <Tabs.List
            className="grid grid-cols-1 gap-2 rounded-2xl border border-outline-variant/35 bg-surface-container-low p-2"
            aria-label="FinCognis araç sekmeleri"
          >
            {toolRegistry.map((tool) => (
              <Tabs.Trigger
                key={tool.id}
                value={tool.id}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-transparent bg-surface-container-lowest px-3 py-2.5 font-headline text-xs font-bold text-on-surface-variant transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=active]:border-outline-variant data-[state=active]:bg-surface-container-high data-[state=active]:text-on-surface data-[state=active]:shadow-sm"
              >
                <Network className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                <span>{tool.title}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-secondary">Aktif Araç</p>
            <p className="mt-1 font-headline text-lg font-bold text-on-surface">{activeToolMeta?.title}</p>
            <p className="text-sm text-on-surface-variant">{activeToolMeta?.description}</p>
          </div>

          <Tabs.Content value="correlation">
            <CorrelationTest />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}
