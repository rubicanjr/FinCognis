"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full bg-[#111417]/80 shadow-[0px_24px_48px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            security
          </span>
          <span className="font-headline text-2xl font-bold tracking-tighter text-primary">FinCognis</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#analytics" className="font-headline font-semibold text-secondary transition-colors duration-300">
            Urun
          </a>
          <a
            href="#security"
            className="font-headline text-primary/70 transition-colors duration-300 hover:text-secondary"
          >
            Cozumler
          </a>
          <a
            href="#security"
            className="font-headline text-primary/70 transition-colors duration-300 hover:text-secondary"
          >
            Guvenlik
          </a>
          <a
            href="#compliance"
            className="font-headline text-primary/70 transition-colors duration-300 hover:text-secondary"
          >
            Fiyatlandirma
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/tools"
            className="hidden rounded-lg border border-outline-variant/30 bg-transparent px-4 py-2.5 text-sm font-bold text-on-surface transition-all hover:bg-surface-bright sm:inline-flex"
          >
            Araclar
          </Link>
          <button className="rounded-lg bg-secondary px-5 py-2.5 font-bold text-on-secondary transition-all hover:brightness-110 active:scale-95">
            Basla
          </button>
          <button
            className="ml-1 text-primary md:hidden"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label="Menuyu ac"
          >
            <span className="material-symbols-outlined">{mobileOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="space-y-4 border-t border-outline-variant/10 bg-surface-container-low/95 px-6 py-6 backdrop-blur-xl md:hidden">
          <a href="#analytics" className="block font-headline font-semibold text-secondary" onClick={() => setMobileOpen(false)}>
            Urun
          </a>
          <a
            href="#security"
            className="block font-headline text-primary/70 hover:text-secondary"
            onClick={() => setMobileOpen(false)}
          >
            Cozumler
          </a>
          <a
            href="#security"
            className="block font-headline text-primary/70 hover:text-secondary"
            onClick={() => setMobileOpen(false)}
          >
            Guvenlik
          </a>
          <a
            href="#compliance"
            className="block font-headline text-primary/70 hover:text-secondary"
            onClick={() => setMobileOpen(false)}
          >
            Fiyatlandirma
          </a>
          <Link
            href="/tools"
            className="block border-t border-outline-variant/10 pt-2 font-headline font-bold text-secondary"
            onClick={() => setMobileOpen(false)}
          >
            Araclar
          </Link>
        </div>
      )}
    </nav>
  );
}
