import { ArrowRight, BadgeCheck, Globe2, Shield, TrendingUp } from "lucide-react";
import Link from "next/link";

const TRUSTED_BRANDS = ["MITSUBISHI", "PSEG", "BANK OF CHINA", "Rockwell", "Marriott", "amazon"];

export default function HeroSection() {
  return (
    <header id="karsilastir" className="landing-section relative overflow-hidden px-4 pb-20 pt-28 sm:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_5%,rgba(34,183,255,0.32),transparent_44%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(34,211,238,0.26),transparent_42%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_95%,rgba(2,132,199,0.2),transparent_48%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(3,10,24,0.92),rgba(2,8,22,0.82))] px-6 py-16 shadow-[0_40px_120px_rgba(2,8,23,0.68)] backdrop-blur-xl sm:px-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#22b7ff]/45 bg-[#22b7ff]/12 px-4 py-1.5">
              <BadgeCheck className="h-4 w-4 text-[#8ddfff]" />
              <span className="font-display text-[11px] font-semibold tracking-[0.1em] text-[#dff4ff]">Future-Ready Decision Intelligence</span>
            </div>

            <h1 className="mt-8 font-display text-4xl font-semibold leading-tight tracking-[0.01em] text-slate-50 sm:text-5xl md:text-6xl">
              Yatırım Kararlarını
              <br />
              <span className="landing-accent-text">Kurumsal Seviye Bir Sistemle</span> Yönetin
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              FinCognis; stratejiden uygulamaya, riskten getiri dengesine kadar yatırım kararlarını daha görünür, ölçülebilir ve sürdürülebilir hale getirir.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/tools"
                className="landing-primary-btn inline-flex items-center gap-2 rounded-full border border-[#22b7ff]/55 bg-[#22b7ff]/18 px-8 py-3.5 font-display text-base font-semibold text-[#dff4ff] transition-all hover:-translate-y-0.5 hover:bg-[#22b7ff]/28"
              >
                Başla
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/finlab"
                className="landing-secondary-btn rounded-full border border-white/12 bg-slate-900/55 px-8 py-3.5 font-display text-base font-semibold text-slate-100 transition-all hover:-translate-y-0.5 hover:border-[#22b7ff]/60 hover:text-[#8ddfff]"
              >
                FinLab’i Keşfet
              </Link>
            </div>
          </div>

          <div className="mt-16 rounded-2xl border border-white/10 bg-slate-950/45 px-6 py-5 backdrop-blur-xl">
            <p className="text-center font-display text-xs tracking-[0.08em] text-slate-400">Trusted by high-standard teams</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-3 md:grid-cols-6">
              {TRUSTED_BRANDS.map((brand) => (
                <div key={brand} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 font-display text-xs font-semibold tracking-[0.08em] text-slate-300">
                  {brand}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <div className="mb-2 inline-flex rounded-lg border border-[#22b7ff]/30 bg-[#22b7ff]/12 p-2">
                <Shield className="h-4 w-4 text-[#8ddfff]" />
              </div>
              <p className="font-display text-sm font-semibold text-slate-100">Risk Katmanı</p>
              <p className="mt-1 text-xs text-slate-300">Karar öncesi senaryo kırılma noktalarını görün.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <div className="mb-2 inline-flex rounded-lg border border-[#22b7ff]/30 bg-[#22b7ff]/12 p-2">
                <TrendingUp className="h-4 w-4 text-[#8ddfff]" />
              </div>
              <p className="font-display text-sm font-semibold text-slate-100">Getiri Potansiyeli</p>
              <p className="mt-1 text-xs text-slate-300">Profil uyumlu büyüme alanlarını sayısallaştırın.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <div className="mb-2 inline-flex rounded-lg border border-[#22b7ff]/30 bg-[#22b7ff]/12 p-2">
                <Globe2 className="h-4 w-4 text-[#8ddfff]" />
              </div>
              <p className="font-display text-sm font-semibold text-slate-100">Global Sinyaller</p>
              <p className="mt-1 text-xs text-slate-300">Makro, haber ve varlık akışlarını aynı panelde toplayın.</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
