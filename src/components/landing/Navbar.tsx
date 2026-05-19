"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Menu, X } from "lucide-react";
import OnlineUsersBadge from "@/components/landing/OnlineUsersBadge";

const NAV_ITEMS: Array<{ label: string; href: string; finLab?: boolean }> = [
  { label: "ANA SAYFA", href: "/" },
  { label: "HABERLER", href: "/haberler" },
  { label: "FINLAB", href: "/finlab", finLab: true },
  { label: "HAKKIMIZDA", href: "/#hakkimizda" },
];

const ABOUT_MENU_ITEMS = [
  { label: "BİZ NASIL ÇALIŞIYORUZ", href: "/nasil-calisiyoruz" },
  { label: "MISYON & VİZYON", href: "/hakkimizda/misyon-vizyon" },
  { label: "FELSEFE", href: "/hakkimizda/felsefe" },
  { label: "YOL HARİTASI", href: "/hakkimizda/yol-haritasi" },
  { label: "TOPLULUK & ERKEN ERİŞİM", href: "/hakkimizda/topluluk-erken-erisim" },
  { label: "BASINDA BİZ / GÜNCELLEMELER", href: "/hakkimizda/basinda-biz-guncellemeler" },
  { label: "CORETEAM", href: "/ekip" },
  { label: "İLETİŞİM", href: "/iletisim" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aboutMenuOpen, setAboutMenuOpen] = useState(false);
  const aboutCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAboutCloseTimer = () => {
    if (aboutCloseTimerRef.current) {
      clearTimeout(aboutCloseTimerRef.current);
      aboutCloseTimerRef.current = null;
    }
  };

  const openAboutMenu = () => {
    clearAboutCloseTimer();
    setAboutMenuOpen(true);
  };

  const scheduleAboutMenuClose = () => {
    clearAboutCloseTimer();
    aboutCloseTimerRef.current = setTimeout(() => {
      setAboutMenuOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => clearAboutCloseTimer();
  }, []);

  return (
    <nav className="landing-nav fixed top-0 z-50 w-full border-b border-[#22b7ff]/20 bg-[#030915]/75 shadow-[0_14px_35px_rgba(2,8,23,0.65)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-6 py-4">
        <div className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => {
            if (item.label === "HAKKIMIZDA") {
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={openAboutMenu}
                  onMouseLeave={scheduleAboutMenuClose}
                >
                  <Link
                    href={item.href}
                    className="landing-nav-link inline-flex items-center gap-1 font-display text-slate-300 transition-colors duration-300 hover:text-[#8ddfff]"
                  >
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.6} />
                  </Link>
                  <div
                    className={`absolute left-0 top-full z-50 mt-2 min-w-[420px] rounded-xl border border-white/25 bg-[#020a1f]/95 p-2 shadow-[0_20px_35px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-200 ${
                      aboutMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0"
                    }`}
                    onMouseEnter={openAboutMenu}
                    onMouseLeave={scheduleAboutMenuClose}
                  >
                    {ABOUT_MENU_ITEMS.map((aboutItem) => (
                      <Link
                        key={aboutItem.label}
                        href={aboutItem.href}
                        className="block whitespace-nowrap rounded-md px-3 py-2 font-display text-[18px] leading-[1.1] tracking-[0.01em] text-slate-100 transition-colors hover:bg-white/5 hover:text-[#8ddfff]"
                        onClick={() => setAboutMenuOpen(false)}
                      >
                        {aboutItem.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className="landing-nav-link font-display text-slate-300 transition-colors duration-300 hover:text-[#8ddfff]"
              >
                {item.finLab ? (
                  <span className="inline-flex items-center">
                    <span>FIN</span>
                    <span className="landing-finlab-tag">LAB</span>
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            );
          })}
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
            className="landing-secondary-btn hidden items-center rounded-xl border border-white/12 bg-slate-900/55 px-4 py-2.5 font-display text-sm font-semibold text-slate-100 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#22b7ff]/60 hover:text-[#8ddfff] sm:inline-flex"
          >
            Araçlar
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
              className="block font-display text-slate-300 hover:text-[#8ddfff]"
              onClick={() => setMobileOpen(false)}
            >
              {item.finLab ? (
                <span className="inline-flex items-center">
                  <span>FIN</span>
                  <span className="landing-finlab-tag">LAB</span>
                </span>
              ) : (
                item.label
              )}
            </Link>
          ))}
          <div className="border-t border-[#22b7ff]/25 pt-2">
            {ABOUT_MENU_ITEMS.map((aboutItem) => (
              <Link
                key={aboutItem.label}
                href={aboutItem.href}
                className="block py-1.5 font-display text-slate-300 hover:text-[#8ddfff]"
                onClick={() => setMobileOpen(false)}
              >
                {aboutItem.label}
              </Link>
            ))}
          </div>
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
