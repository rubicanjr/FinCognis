"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { AlertCircle, LogOut, Network, ShieldAlert, Wallet } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import CommissionCalculator from "@/components/tools/CommissionCalculator";
import CorrelationTest from "@/components/tools/CorrelationTest";
import StressTest from "@/components/tools/StressTest";
import {
  getAuthSessionFromSupabase,
  signOutFromSupabase,
  subscribeAuthSession,
} from "@/lib/auth/auth-session";
import { parseToolDataList, type ToolData } from "@/lib/contracts/core-schemas";
import { resolveToolsAccess } from "@/lib/auth/tools-gateway";
import { normalizeTurkishText } from "@/lib/text/turkish-normalization";
import { createSupabaseBrowserClient, hasSupabasePublicEnv } from "@/utils/supabase";

type ToolId = ToolData["id"];

const TOOL_DATA_SOURCE: unknown = [
  {
    id: "commission",
    title: "Komisyon Analizi",
    description: "Kurum bazlı maliyet karşılaştırması",
    href: "/tools",
    iconKey: "wallet",
    requiresAuth: true,
    premium: true,
  },
  {
    id: "correlation",
    title: "Korelasyon Çarpışması",
    description: "DCC-GARCH + kuyruk riski testi",
    href: "/tools",
    iconKey: "network",
    requiresAuth: true,
    premium: true,
  },
  {
    id: "stress",
    title: "Portföy Stres Simülatörü",
    description: "Kriz replay ve Monte Carlo",
    href: "/tools",
    iconKey: "shield",
    requiresAuth: true,
    premium: true,
  },
];

function createToolRegistry(): ToolData[] {
  // 1) Parse unknown source payload with strict schema guard.
  const parsed = parseToolDataList(TOOL_DATA_SOURCE) ?? [];
  // 2) Normalize Turkish strings for consistent UI quality.
  return parsed.map((tool) => ({
    ...tool,
    title: normalizeTurkishText(tool.title),
    description: normalizeTurkishText(tool.description),
  }));
}

function renderToolIcon(iconKey: ToolData["iconKey"]) {
  // 1) Return a premium Lucide icon for wallet tool.
  if (iconKey === "wallet") return <Wallet className="h-4 w-4" strokeWidth={1.5} aria-hidden />;
  // 2) Return a premium Lucide icon for correlation tool.
  if (iconKey === "network") return <Network className="h-4 w-4" strokeWidth={1.5} aria-hidden />;
  // 3) Return a premium Lucide icon for stress tool.
  return <ShieldAlert className="h-4 w-4" strokeWidth={1.5} aria-hidden />;
}

function getDefaultToolId(registry: ToolData[]): ToolId {
  // 1) Resolve first valid registry item.
  const first = registry[0];
  // 2) Return fallback identifier when list is empty.
  return first?.id ?? "commission";
}

function parseToolId(value: string): ToolId {
  // 1) Validate incoming tab value against known tool identifiers.
  if (value === "commission" || value === "correlation" || value === "stress") return value;
  // 2) Return deterministic fallback id.
  return "commission";
}

export default function ToolsPageClient() {
  // 1) Prepare router, Supabase client, and tool registry.
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const hasSupabaseConfig = useMemo(() => hasSupabasePublicEnv(), []);
  const toolRegistry = useMemo(() => createToolRegistry(), []);
  const [activeTool, setActiveTool] = useState<ToolId>(getDefaultToolId(toolRegistry));

  useEffect(() => {
    // 1) Stop auth checks when Supabase client is unavailable.
    if (!supabase) return;
    // 2) Resolve current auth session once on mount.
    getAuthSessionFromSupabase(supabase).then((session) => {
      // 3) Apply access gateway decision based on auth state.
      const decision = resolveToolsAccess("/tools", session);
      if (decision.action === "redirect" && decision.redirectTo) router.replace(decision.redirectTo);
    });
    // 4) Subscribe auth updates to enforce protected route access.
    return subscribeAuthSession(supabase, (session) => {
      const decision = resolveToolsAccess("/tools", session);
      if (decision.action === "redirect" && decision.redirectTo) router.replace(decision.redirectTo);
    });
  }, [router, supabase]);

  async function handleLogout() {
    // 1) Skip sign-out when Supabase client is unavailable.
    if (!supabase) {
      startTransition(() => router.replace("/tools/login"));
      return;
    }
    // 2) End active Supabase session.
    await signOutFromSupabase(supabase);
    // 3) Redirect user to login route.
    startTransition(() => router.replace("/tools/login"));
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 pb-6 pt-24">
        <div className="mb-6 text-center">
          <p className="mb-2 font-label text-sm font-bold uppercase tracking-[0.2em] text-secondary">
            FinCognis Araç Seti
          </p>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface">Analiz ve Hesaplama</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Supabase Auth ile doğrulanan erişim, erişilebilir sekmeli bilgi mimarisi.
          </p>
        </div>

        {!hasSupabaseConfig ? (
          <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
              Supabase Yapılandırması Eksik
            </div>
            NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY değişkenlerini tanımlayın.
          </div>
        ) : null}

        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/25 bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-secondary/50 hover:text-secondary"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            Çıkış Yap
          </button>
        </div>

        <Tabs.Root
          value={activeTool}
          onValueChange={(value) => setActiveTool(parseToolId(value))}
          className="space-y-3"
        >
          <Tabs.List
            className="grid grid-cols-1 gap-2 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-1.5 md:grid-cols-3"
            aria-label="FinCognis araç sekmeleri"
          >
            {toolRegistry.map((tool) => (
              <Tabs.Trigger
                key={tool.id}
                value={tool.id}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-headline text-xs font-bold text-on-surface-variant transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=active]:bg-secondary/15 data-[state=active]:text-secondary data-[state=active]:shadow-sm"
              >
                {renderToolIcon(tool.iconKey)}
                <span>{tool.title}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="commission">
            <CommissionCalculator />
          </Tabs.Content>
          <Tabs.Content value="correlation">
            <CorrelationTest />
          </Tabs.Content>
          <Tabs.Content value="stress">
            <StressTest />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}
