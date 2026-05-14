"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Menu, X } from "lucide-react";
import OnlineUsersBadge from "@/components/landing/OnlineUsersBadge";
import { ABOUT_NAV_ITEMS } from "@/lib/about-nav";

const NAV_ITEMS: Array<{ label: string; href: string; highlighted?: boolean; finLab?: boolean }> = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Haberler", href: "/haberler" },
  { label: "FinLab", href: "/finlab", finLab: true },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aboutDesktopOpen, setAboutDesktopOpen] = useState(false);
  const [aboutMobileOpen, setAboutMobileOpen] = useState(false);

  return (
    <nav className="landing-nav fixed top-0 z-50 w-full border-b border-[#22b7ff]/20 bg-[#030915]/75 shadow-[0_14px_35px_rgba(2,8,23,0.65)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-6 py-4">
        <div className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`landing-nav-link font-display transition-colors duration-300 ${
                item.highlighted ? "font-bold tracking-[0.02em] text-[#8ddfff]" : "text-slate-300 hover:text-[#8ddfff]"
              }`}
            >
              {item.finLab ? (
                <span className="inline-flex items-center">
                  <span>Fin</span>
                  <span className="landing-finlab-tag">Lab</span>
                </span>
              ) : (
                item.label
              )}
            </Link>
          ))}

          <div
            className="relative"
            onMouseEnter={() => setAboutDesktopOpen(true)}
            onMouseLeave={() => setAboutDesktopOpen(false)}
            onFocusCapture={() => setAboutDesktopOpen(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setAboutDesktopOpen(false);
              }
            }}
          >
            <button
              type="button"
              className="landing-nav-link inline-flex items-center gap-1 font-display text-slate-300 transition-colors duration-300 hover:text-[#8ddfff]"
              aria-haspopup="true"
              aria-expanded={aboutDesktopOpen}
              aria-controls="about-desktop-menu"
              onClick={() => setAboutDesktopOpen((current) => !current)}
            >
              Hakkımızda
              <ChevronDown className="h-4 w-4" />
            </button>

            <div
              id="about-desktop-menu"
              className={`absolute left-0 top-full z-30 w-[320px] rounded-2xl border border-white/12 bg-slate-950/95 p-2 shadow-[0_18px_50px_rgba(2,8,23,0.75)] transition-all duration-200 ${
                aboutDesktopOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {ABOUT_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-white/10 hover:bg-white/5"
                  onClick={() => setAboutDesktopOpen(false)}
                >
                  <p className="font-display text-sm font-semibold text-slate-100">{item.label}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <OnlineUsersBadge />
          <a
            href="https://itucekirdek.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-itu-link hidden items-center justify-center rounded-lg border border-white/25 bg-white px-2 py-1 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[#22b7ff]/60 md:inline-flex"
            aria-label="İTÜ Çekirdek sitesine git"
          >
            <Image
              src="/partners/itucekirdek-wordmark.png"
              alt="İTÜ Çekirdek"
              width={92}
              height={29}
              className="h-5 w-auto object-contain"
            />
          </a>
          <Link
            href="/tools"
            className="landing-secondary-btn hidden items-center rounded-xl border border-white/12 bg-slate-900/55 px-4 py-2.5 font-display text-sm font-bold tracking-[-0.01em] text-slate-100 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#22b7ff]/60 hover:text-[#8ddfff] sm:inline-flex"
          >
            Araçlar
          </Link>
          <Link
            href="/tools"
            className="landing-primary-btn rounded-xl border border-[#22b7ff]/55 bg-[#22b7ff]/18 px-5 py-2.5 font-display text-sm font-bold tracking-[-0.01em] text-[#dff4ff] transition-all hover:-translate-y-0.5 hover:bg-[#22b7ff]/26 active:scale-95"
          >
            Başla
          </Link>
          <button
            className="ml-1 text-slate-100 md:hidden"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="mobile-nav" className="landing-mobile-nav space-y-4 border-t border-[#22b7ff]/25 bg-[#030915]/90 px-6 py-6 backdrop-blur-xl md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`block font-display ${item.highlighted ? "font-semibold text-[#8ddfff]" : "text-slate-300 hover:text-[#8ddfff]"}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.finLab ? (
                <span className="inline-flex items-center">
                  <span>Fin</span>
                  <span className="landing-finlab-tag">Lab</span>
                </span>
              ) : (
                item.label
              )}
            </Link>
          ))}

          <div className="border-t border-[#22b7ff]/25 pt-2">
            <button
              type="button"
              className="flex w-full items-center justify-between font-display text-slate-300 hover:text-[#8ddfff]"
              onClick={() => setAboutMobileOpen((current) => !current)}
              aria-expanded={aboutMobileOpen}
              aria-controls="about-mobile-menu"
            >
              <span>Hakkımızda</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${aboutMobileOpen ? "rotate-180" : "rotate-0"}`} />
            </button>
            {aboutMobileOpen ? (
              <div id="about-mobile-menu" className="mt-2 space-y-1 rounded-xl border border-white/10 bg-slate-950/50 p-2">
                {ABOUT_NAV_ITEMS.map((item) => (
                  <Link
                    key={`mobile:${item.href}`}
                    href={item.href}
                    className="block rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-white/5 hover:text-[#8ddfff]"
                    onClick={() => {
                      setMobileOpen(false);
                      setAboutMobileOpen(false);
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

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
