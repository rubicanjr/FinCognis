"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ShieldCheck, X } from "lucide-react";
import ThemeToggleButton from "@/components/theme/ThemeToggleButton";

export default function Navbar() {
  // 1) Keep mobile drawer visibility in local component state.
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-outline-variant/35 bg-surface-container-low/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.5} />
          <span className="font-headline text-2xl font-bold tracking-tighter text-primary">FinCognis</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#analytics" className="font-headline font-semibold text-secondary transition-colors duration-300">
            Ürün
          </a>
          <a href="#security" className="font-headline text-on-surface-variant transition-colors duration-300 hover:text-secondary">
            Çözümler
          </a>
          <a href="#security" className="font-headline text-on-surface-variant transition-colors duration-300 hover:text-secondary">
            Güvenlik
          </a>
          <a href="#compliance" className="font-headline text-on-surface-variant transition-colors duration-300 hover:text-secondary">
            Fiyatlandırma
          </a>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggleButton />
          <Link
            href="/tools"
            className="hidden rounded-lg border border-outline-variant/45 bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-on-surface transition-all hover:bg-surface-container-high sm:inline-flex"
          >
            Araçlar
          </Link>
          <button className="rounded-lg bg-secondary px-5 py-2.5 font-bold text-on-secondary transition-all hover:brightness-110 active:scale-95">
            Başla
          </button>
          <button
            className="ml-1 text-on-surface md:hidden"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label="Menüyü aç"
          >
            {mobileOpen ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="space-y-4 border-t border-outline-variant/30 bg-surface-container-low px-6 py-6 md:hidden">
          <a href="#analytics" className="block font-headline font-semibold text-secondary" onClick={() => setMobileOpen(false)}>
            Ürün
          </a>
          <a
            href="#security"
            className="block font-headline text-on-surface-variant hover:text-secondary"
            onClick={() => setMobileOpen(false)}
          >
            Çözümler
          </a>
          <a
            href="#security"
            className="block font-headline text-on-surface-variant hover:text-secondary"
            onClick={() => setMobileOpen(false)}
          >
            Güvenlik
          </a>
          <a
            href="#compliance"
            className="block font-headline text-on-surface-variant hover:text-secondary"
            onClick={() => setMobileOpen(false)}
          >
            Fiyatlandırma
          </a>
          <Link
            href="/tools"
            className="block border-t border-outline-variant/30 pt-2 font-headline font-bold text-secondary"
            onClick={() => setMobileOpen(false)}
          >
            Araçlar
          </Link>
        </div>
      )}
    </nav>
  );
}
