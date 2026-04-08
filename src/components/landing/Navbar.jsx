"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#111417]/80 backdrop-blur-xl shadow-[0px_24px_48px_-12px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            security
          </span>
          <span className="text-2xl font-bold tracking-tighter text-primary font-headline">
            FinCognis
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a
            href="#analytics"
            className="text-secondary font-semibold font-headline transition-colors duration-300"
          >
            Ürün
          </a>
          <a
            href="#security"
            className="text-primary/70 hover:text-secondary font-headline transition-colors duration-300"
          >
            Çözümler
          </a>
          <a
            href="#security"
            className="text-primary/70 hover:text-secondary font-headline transition-colors duration-300"
          >
            Güvenlik
          </a>
          <a
            href="#compliance"
            className="text-primary/70 hover:text-secondary font-headline transition-colors duration-300"
          >
            Fiyatlandırma
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/tools"
            className="hidden sm:inline-flex bg-transparent border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-lg font-bold font-headline text-sm hover:bg-surface-bright transition-all"
          >
            Araçlar
          </Link>
          <button className="bg-secondary text-on-secondary px-5 py-2.5 rounded-lg font-bold font-headline hover:brightness-110 active:scale-95 transition-all">
            Başla
          </button>
          <button
            className="md:hidden text-primary ml-1"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menüyü aç"
          >
            <span className="material-symbols-outlined">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-surface-container-low/95 backdrop-blur-xl border-t border-outline-variant/10 px-6 py-6 space-y-4">
          <a
            href="#analytics"
            className="block text-secondary font-semibold font-headline"
            onClick={() => setMobileOpen(false)}
          >
            Ürün
          </a>
          <a
            href="#security"
            className="block text-primary/70 hover:text-secondary font-headline"
            onClick={() => setMobileOpen(false)}
          >
            Çözümler
          </a>
          <a
            href="#security"
            className="block text-primary/70 hover:text-secondary font-headline"
            onClick={() => setMobileOpen(false)}
          >
            Güvenlik
          </a>
          <a
            href="#compliance"
            className="block text-primary/70 hover:text-secondary font-headline"
            onClick={() => setMobileOpen(false)}
          >
            Fiyatlandırma
          </a>
          <Link
            href="/tools"
            className="block text-secondary font-bold font-headline pt-2 border-t border-outline-variant/10"
            onClick={() => setMobileOpen(false)}
          >
            Araçlar →
          </Link>
        </div>
      )}
    </nav>
  );
}
