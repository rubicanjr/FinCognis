"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Network, ShieldAlert, Wallet } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import CommissionCalculator from "@/components/tools/CommissionCalculator";
import CorrelationTest from "@/components/tools/CorrelationTest";
import StressTest from "@/components/tools/StressTest";
import {
  clearAuthFromStorage,
  isAuthActive,
  readAuthFromStorage,
} from "@/lib/auth/auth-session";
import {
  parseToolInformationList,
  type ToolInformationSchema,
} from "@/lib/contracts/core-schemas";
import { normalizeTurkishText } from "@/lib/text/turkish-normalization";

type ToolId = ToolInformationSchema["id"];

const TOOL_DATA_SOURCE: unknown = [
  {
    id: "commission",
    title: "Komisyon Analizi",
    description: "Kurum bazli maliyet karsilastirmasi",
    href: "/tools",
    iconKey: "wallet",
    requiresAuth: true,
    premium: true,
  },
  {
    id: "correlation",
    title: "Korelasyon Carpismasi",
    description: "DCC-GARCH + kuyruk riski testi",
    href: "/tools",
    iconKey: "network",
    requiresAuth: true,
    premium: true,
  },
  {
    id: "stress",
    title: "Portfoy Stres Simulasyonu",
    description: "Kriz replay ve Monte Carlo",
    href: "/tools",
    iconKey: "shield",
    requiresAuth: true,
    premium: true,
  },
];

function createToolRegistry(): ToolInformationSchema[] {
  // 1) Validate unknown source payload with strict schema parsing.
  const parsed = parseToolInformationList(TOOL_DATA_SOURCE) ?? [];
  // 2) Normalize Turkish UI strings for stable rendering.
  return parsed.map((tool) => ({
    ...tool,
    title: normalizeTurkishText(tool.title),
    description: normalizeTurkishText(tool.description),
  }));
}

const TOOL_REGISTRY = createToolRegistry();

function renderToolIcon(iconKey: ToolInformationSchema["iconKey"]) {
  // 1) Return icon component by strict icon key.
  if (iconKey === "wallet") return <Wallet className="h-4 w-4" strokeWidth={1.5} aria-hidden />;
  // 2) Resolve network icon variant.
  if (iconKey === "network") return <Network className="h-4 w-4" strokeWidth={1.5} aria-hidden />;
  // 3) Fallback to stress icon.
  return <ShieldAlert className="h-4 w-4" strokeWidth={1.5} aria-hidden />;
}

function getDefaultToolId(): ToolId {
  // 1) Resolve first valid tool from validated registry.
  const first = TOOL_REGISTRY[0];
  // 2) Return stable fallback id.
  return first?.id ?? "commission";
}

export default function ToolsPageClient() {
  // 1) Initialize routing and active tab state.
  const router = useRouter();
  const [activeTool, setActiveTool] = useState<ToolId>(getDefaultToolId);
  const toolIds = useMemo(() => TOOL_REGISTRY.map((item) => item.id), []);

  useEffect(() => {
    // 1) Read auth state from local storage.
    const auth = readAuthFromStorage();
    // 2) Redirect guests to login.
    if (!isAuthActive(auth)) {
      router.replace("/tools/login?next=%2Ftools");
    }
  }, [router]);

  function handleLogout() {
    // 1) Clear local auth session.
    clearAuthFromStorage();
    // 2) Redirect user to login route.
    startTransition(() => {
      router.replace("/tools/login?next=%2Ftools");
      router.refresh();
    });
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentTool: ToolId) {
    // 1) Exit early when key is not part of horizontal navigation.
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }
    // 2) Compute next tab index in a cyclic way.
    const currentIndex = toolIds.indexOf(currentTool);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + offset + toolIds.length) % toolIds.length;
    // 3) Activate next tab.
    setActiveTool(toolIds[nextIndex] ?? currentTool);
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
            Giriş doğrulaması aktif. Tüm hesaplamalar tek panelde erişilebilir sekmelerle sunulur.
          </p>
        </div>

        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-outline-variant/25 bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-secondary/50 hover:text-secondary"
          >
            Çıkış Yap
          </button>
        </div>

        <div
          className="flex gap-2 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-1.5"
          role="tablist"
          aria-label="FinCognis araç sekmeleri"
        >
          {TOOL_REGISTRY.map((tool) => (
            <button
              key={tool.id}
              id={`tool-tab-${tool.id}`}
              role="tab"
              aria-selected={activeTool === tool.id}
              aria-controls={`tool-panel-${tool.id}`}
              tabIndex={activeTool === tool.id ? 0 : -1}
              onKeyDown={(event) => handleTabKeyDown(event, tool.id)}
              onClick={() => setActiveTool(tool.id)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-headline text-xs font-bold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                activeTool === tool.id
                  ? "bg-secondary/15 text-secondary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {renderToolIcon(tool.iconKey)}
              <span>{tool.title}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="pb-16">
        <section
          id="tool-panel-commission"
          role="tabpanel"
          aria-labelledby="tool-tab-commission"
          hidden={activeTool !== "commission"}
        >
          <CommissionCalculator />
        </section>
        <section
          id="tool-panel-correlation"
          role="tabpanel"
          aria-labelledby="tool-tab-correlation"
          hidden={activeTool !== "correlation"}
        >
          <CorrelationTest />
        </section>
        <section
          id="tool-panel-stress"
          role="tabpanel"
          aria-labelledby="tool-tab-stress"
          hidden={activeTool !== "stress"}
        >
          <StressTest />
        </section>
      </main>
    </div>
  );
}
