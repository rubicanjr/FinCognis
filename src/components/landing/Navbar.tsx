"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ShieldCheck, X } from "lucide-react";
import ThemeToggleButton from "@/components/theme/ThemeToggleButton";

const NAV_ITEMS: Array<{ label: string; href: string; highlighted?: boolean }> = [
  { label: "Karşılaştırma Modu", href: "/#karsilastir", highlighted: true },
  { label: "Profil Keşif Modu", href: "/#profil-kesif" },
  { label: "Metrik Rehberi", href: "/#metrik-rehberi" },
  { label: "Uyum Bildirimi", href: "/#uyum-bildirimi" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="landing-nav fixed top-0 z-50 w-full border-b border-[#22b7ff]/20 bg-[#030915]/75 shadow-[0_14px_35px_rgba(2,8,23,0.65)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-[#8ddfff]" strokeWidth={1.5} />
          <span className="font-display text-2xl font-semibold tracking-[0.02em] text-[#eaf6ff]">FinCognis</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`landing-nav-link font-display transition-colors duration-300 ${
                item.highlighted ? "font-semibold tracking-[0.02em] text-[#8ddfff]" : "text-slate-300 hover:text-[#8ddfff]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggleButton />
          <Link
            href="/tools"
            className="landing-secondary-btn hidden items-center rounded-xl border border-white/12 bg-slate-900/55 px-4 py-2.5 font-display text-sm font-semibold text-slate-100 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#22b7ff]/60 hover:text-[#8ddfff] sm:inline-flex"
          >
            Araçlar
          </Link>
          <Link
            href="/tools"
            className="landing-primary-btn rounded-xl border border-[#22b7ff]/55 bg-[#22b7ff]/18 px-5 py-2.5 font-display text-sm font-semibold text-[#dff4ff] transition-all hover:-translate-y-0.5 hover:bg-[#22b7ff]/26 active:scale-95"
          >
            Başla
          </Link>
          <button
            className="ml-1 text-slate-100 md:hidden"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label="Menüyü aç"
          >
            {mobileOpen ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="landing-mobile-nav space-y-4 border-t border-[#22b7ff]/25 bg-[#030915]/90 px-6 py-6 backdrop-blur-xl md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`block font-display ${item.highlighted ? "font-semibold text-[#8ddfff]" : "text-slate-300 hover:text-[#8ddfff]"}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/tools"
            className="block border-t border-[#22b7ff]/25 pt-2 font-display font-semibold text-[#8ddfff]"
            onClick={() => setMobileOpen(false)}
          >
            Araçlar
          </Link>
          <Link
            href="/tools"
            className="block font-display text-slate-300 hover:text-[#8ddfff]"
            onClick={() => setMobileOpen(false)}
          >
            Başla
          </Link>
        </div>
      )}
    </nav>
  );
}
