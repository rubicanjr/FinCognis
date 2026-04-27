"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ShieldCheck, X } from "lucide-react";
import ThemeToggleButton from "@/components/theme/ThemeToggleButton";

export default function Navbar() {
  // 1) Keep mobile drawer visibility in local component state.
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[#22b7ff]/20 bg-[#030915]/75 shadow-[0_14px_35px_rgba(2,8,23,0.65)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-[#8ddfff]" strokeWidth={1.5} />
          <span className="font-display text-2xl font-semibold tracking-[0.02em] text-[#eaf6ff]">FinCognis</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#analytics" className="font-display font-semibold tracking-[0.02em] text-[#8ddfff] transition-colors duration-300">
            Ürün
          </a>
          <a href="#security" className="font-display text-slate-300 transition-colors duration-300 hover:text-[#8ddfff]">
            Çözümler
          </a>
          <a href="#security" className="font-display text-slate-300 transition-colors duration-300 hover:text-[#8ddfff]">
            Güvenlik
          </a>
          <a href="#compliance" className="font-display text-slate-300 transition-colors duration-300 hover:text-[#8ddfff]">
            Fiyatlandırma
          </a>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggleButton />
          <Link
            href="/tools"
            className="hidden items-center rounded-xl border border-white/12 bg-slate-900/55 px-4 py-2.5 font-display text-sm font-semibold text-slate-100 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#22b7ff]/60 hover:text-[#8ddfff] sm:inline-flex"
          >
            Araçlar
          </Link>
          <button className="rounded-xl border border-[#22b7ff]/55 bg-[#22b7ff]/18 px-5 py-2.5 font-display text-sm font-semibold text-[#dff4ff] transition-all hover:-translate-y-0.5 hover:bg-[#22b7ff]/26 active:scale-95">
            Başla
          </button>
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
        <div className="space-y-4 border-t border-[#22b7ff]/25 bg-[#030915]/90 px-6 py-6 backdrop-blur-xl md:hidden">
          <a href="#analytics" className="block font-display font-semibold text-[#8ddfff]" onClick={() => setMobileOpen(false)}>
            Ürün
          </a>
          <a
            href="#security"
            className="block font-display text-slate-300 hover:text-[#8ddfff]"
            onClick={() => setMobileOpen(false)}
          >
            Çözümler
          </a>
          <a
            href="#security"
            className="block font-display text-slate-300 hover:text-[#8ddfff]"
            onClick={() => setMobileOpen(false)}
          >
            Güvenlik
          </a>
          <a
            href="#compliance"
            className="block font-display text-slate-300 hover:text-[#8ddfff]"
            onClick={() => setMobileOpen(false)}
          >
            Fiyatlandırma
          </a>
          <Link
            href="/tools"
            className="block border-t border-[#22b7ff]/25 pt-2 font-display font-semibold text-[#8ddfff]"
            onClick={() => setMobileOpen(false)}
          >
            Araçlar
          </Link>
        </div>
      )}
    </nav>
  );
}
