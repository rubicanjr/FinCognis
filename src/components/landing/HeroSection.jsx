import Image from "next/image";

export default function HeroSection() {
  return (
    <header className="relative pt-32 pb-24 px-6 overflow-hidden min-h-[795px] flex flex-col items-center justify-center">
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      <div className="absolute inset-0 spotlight-bg pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-highest border border-outline-variant/20 mb-8 animate-fade-in-up">
          <span
            className="material-symbols-outlined text-secondary text-sm"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified
          </span>
          <span className="text-xs font-medium tracking-widest uppercase text-on-surface-variant font-label">
            Fortune 500 Güvencesiyle
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold font-headline tracking-tighter text-on-surface mb-6 leading-[1.1] animate-fade-in-up-delay-1">
          Hassas Finansal{" "}
          <span className="text-secondary">Zekâ</span>
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed font-body animate-fade-in-up-delay-2">
          Yüksek frekanslı analitik ve kurumsal düzeyde güvenlik kasası.
          Fintech operasyonlarınızı mutlak güvenle ölçeklendirin.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up-delay-3">
          <button className="w-full sm:w-auto px-8 py-4 bg-secondary text-on-secondary rounded-xl font-bold font-headline text-lg hover:brightness-110 transition-all shadow-[0_0_20px_rgba(158,202,255,0.3)] active:scale-95">
            Platformu Keşfet
          </button>
          <button className="w-full sm:w-auto px-8 py-4 bg-transparent border border-outline-variant/30 text-on-surface rounded-xl font-bold font-headline text-lg hover:bg-surface-bright transition-all active:scale-95">
            Dokümantasyon
          </button>
        </div>
      </div>

      <div className="relative mt-20 w-full max-w-6xl mx-auto animate-fade-in-up-delay-3">
        <div className="glass-panel p-3 sm:p-4 rounded-2xl border border-outline-variant/20 shadow-2xl overflow-hidden">
          <Image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD71a1NE4ixqO6I4DfvCFs9r45uTFdnPo5eEonNPVVZjt-NAbLRqKH-eQpM22MAyUaJP0JMafNJGlQA5ffPm4OVGOybvBklEeogXr2227Yiy4cK-n01y4JRbd1c3uzWcK8ozjSGRjcD3jxjIX8Mqss-aMbiPdQGypeZvPD8MWsLYtfh5gu9HCj737jcuKaBkAnQ7VwQScQV35IUV4DOZpnpGxDgOJWA_DRGNO6McgjlVnhgkPNUuEdWU_BZWDWUDGCDM_rbQYmcggmY"
            alt="FinCognis Dashboard Önizleme"
            width={1920}
            height={1080}
            className="w-full rounded-xl opacity-90 brightness-75"
            priority
          />
        </div>
      </div>
    </header>
  );
}
