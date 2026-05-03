import {
  ArrowLeftRight,
  BadgeCheck,
  BarChart3,
  CandlestickChart,
  Diamond,
  Landmark,
  LayoutDashboard,
  PieChart,
  ShieldCheck,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}

interface MetricCard {
  icon: LucideIcon;
  label: string;
  value: string;
  change: string;
  up: boolean;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { icon: LayoutDashboard, label: "Karşılaştırma Modu", active: true },
  { icon: CandlestickChart, label: "Profil Keşif Modu" },
  { icon: Wallet, label: "Profil Eşleşme Tablosu" },
  { icon: ArrowLeftRight, label: "Radar Karşılaştırma" },
  { icon: BarChart3, label: "Metrik Rehberi" },
  { icon: ShieldCheck, label: "Uyum Bildirimi" },
];

const METRIC_CARDS: MetricCard[] = [
  { icon: ShieldCheck, label: "Risk Düzeyi", value: "4.8 / 10", change: "Düşük-Olgun", up: true },
  { icon: TrendingUp, label: "Kazanç Potansiyeli", value: "7.2 / 10", change: "Görece Güçlü", up: true },
  { icon: Landmark, label: "Nakde Çevirme Kolaylığı", value: "8.4 / 10", change: "Yüksek", up: true },
  { icon: ArrowLeftRight, label: "Portföy Dengeleme Gücü", value: "6.3 / 10", change: "Dengeli", up: true },
];

export default function HeroSection() {
  return (
    <header id="karsilastir" className="landing-section relative flex min-h-[795px] flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-32 sm:px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 22% -6%, rgb(34 183 255 / 0.22) 0%, transparent 44%), radial-gradient(circle at 82% 7%, rgb(168 85 247 / 0.18) 0%, transparent 38%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-[#22b7ff]/45 bg-[#22b7ff]/12 px-4 py-1.5">
          <BadgeCheck className="h-4 w-4 text-[#8ddfff]" strokeWidth={1.5} />
          <span className="font-display text-[11px] font-semibold tracking-[0.1em] text-[#dff4ff]">
            FinCognis Karşılaştırma ve Profil Keşif Katmanı
          </span>
        </div>

        <h1 className="animate-fade-in-up-delay-1 mb-6 font-display text-5xl font-semibold leading-[1.05] tracking-[0.01em] text-slate-50 sm:text-6xl md:text-8xl">
          Yatırım kararlarını <span className="text-[#8ddfff]">sistemle al</span>
        </h1>

        <p className="animate-fade-in-up-delay-2 mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl md:text-2xl">
          FinCognis ile karar vermeden önce riski görün, yatırım gücünüzü artırın.
        </p>

        <div className="animate-fade-in-up-delay-3 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/tools"
            className="landing-primary-btn w-full rounded-xl border border-[#22b7ff]/55 bg-[#22b7ff]/18 px-8 py-4 text-center font-display text-lg font-semibold text-[#dff4ff] transition-all hover:-translate-y-0.5 hover:bg-[#22b7ff]/26 active:scale-95 sm:w-auto"
          >
            Karşılaştırmayı Aç
          </Link>
          <Link
            href="/#profil-kesif"
            className="landing-secondary-btn w-full rounded-xl border border-white/12 bg-slate-900/55 px-8 py-4 text-center font-display text-lg font-semibold text-slate-100 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#22b7ff]/60 hover:text-[#8ddfff] active:scale-95 sm:w-auto"
          >
            Profil Keşfi İncele
          </Link>
        </div>
      </div>

      <div className="animate-fade-in-up-delay-3 relative mx-auto mt-20 w-full max-w-6xl">
        <div className="landing-card overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.78))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-4">
          <div className="w-full select-none overflow-hidden rounded-xl border border-white/12 bg-slate-950/70" aria-label="FinCognis Dashboard Önizleme">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-error" />
              <span className="h-3 w-3 rounded-full bg-warning" />
              <span className="h-3 w-3 rounded-full bg-success" />
              <span className="ml-4 font-data text-[11px] tracking-[0.04em] text-slate-400">app.fincognis.com/dashboard</span>
            </div>

            <div className="flex min-h-[340px] sm:min-h-[420px]">
              <div className="hidden w-48 shrink-0 flex-col gap-1 border-r border-white/10 bg-slate-900/55 p-3 sm:flex">
                <div className="mb-4 flex items-center gap-2 px-2">
                  <Diamond className="h-4 w-4 text-[#8ddfff]" strokeWidth={1.5} />
                  <span className="font-display text-sm font-semibold tracking-[0.02em] text-slate-100">FinCognis</span>
                </div>
                {SIDEBAR_ITEMS.map((item) => {
                  const SidebarIcon = item.icon;
                  const itemClass = item.active
                    ? "border border-[#22b7ff]/35 bg-[#22b7ff]/15 text-[#dff4ff]"
                    : "text-slate-400 hover:text-slate-100";
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-display text-xs tracking-[0.02em] transition-colors ${itemClass}`}
                    >
                      <SidebarIcon className="h-4 w-4" strokeWidth={1.5} />
                      {item.label}
                    </div>
                  );
                })}
              </div>

              <div className="flex-1 space-y-4 overflow-hidden p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {METRIC_CARDS.map((card) => {
                    const MetricIcon = card.icon;
                    const changeTone = card.up ? "text-success" : "text-error";
                    return (
                      <div key={card.label} className="rounded-xl border border-white/12 bg-slate-900/55 p-3 backdrop-blur-xl">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-display text-[10px] tracking-[0.08em] text-slate-400">{card.label}</span>
                          <MetricIcon className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                        </div>
                        <div className="font-data text-base font-semibold tracking-[0.01em] text-slate-100 sm:text-lg">{card.value}</div>
                        <div className={`mt-1 font-display text-[10px] tracking-[0.06em] ${changeTone}`}>{card.change}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-3 lg:flex-row">
                  <div className="flex-1 rounded-xl border border-white/12 bg-slate-900/55 p-4 backdrop-blur-xl">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-display text-xs tracking-[0.08em] text-slate-400">Portföy Performansı</span>
                      <div className="flex gap-1.5">
                        {["1G", "1H", "1A", "1Y"].map((timeRange) => {
                          const spanClass =
                            timeRange === "1A"
                              ? "border border-[#22b7ff]/35 bg-[#22b7ff]/15 font-semibold text-[#dff4ff]"
                              : "border border-white/10 bg-slate-800/50 text-slate-400";
                          return (
                            <span key={timeRange} className={`rounded px-2 py-0.5 font-display text-[10px] tracking-[0.06em] ${spanClass}`}>
                              {timeRange}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <svg viewBox="0 0 480 140" className="h-auto w-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22b7ff" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#22b7ff" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {[28, 56, 84, 112].map((y) => (
                        <line
                          key={y}
                          x1="0"
                          y1={y}
                          x2="480"
                          y2={y}
                          stroke="rgba(148,163,184,0.35)"
                          strokeOpacity="0.45"
                          strokeDasharray="4 4"
                        />
                      ))}
                      <path
                        d="M0,110 C40,105 60,95 100,85 C140,75 160,90 200,70 C240,50 280,60 320,40 C360,20 400,30 440,15 C460,10 480,12 480,12 L480,140 L0,140 Z"
                        fill="url(#chartGrad)"
                      />
                      <path
                        d="M0,110 C40,105 60,95 100,85 C140,75 160,90 200,70 C240,50 280,60 320,40 C360,20 400,30 440,15 C460,10 480,12 480,12"
                        fill="none"
                        stroke="#22b7ff"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx="480" cy="12" r="4" fill="#22b7ff" />
                      <circle cx="480" cy="12" r="7" fill="rgba(34,183,255,0.24)" />
                    </svg>
                  </div>

                  <div className="flex w-full flex-col items-center justify-center rounded-xl border border-white/12 bg-slate-900/55 p-4 backdrop-blur-xl lg:w-44">
                    <span className="mb-3 font-display text-[10px] tracking-[0.08em] text-slate-400">Dağılım</span>
                    <PieChart className="mb-2 h-6 w-6 text-[#8ddfff]" strokeWidth={1.5} />
                    <svg viewBox="0 0 80 80" className="h-20 w-20">
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke="rgba(148,163,184,0.3)"
                        strokeWidth="8"
                        strokeOpacity="0.5"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke="#22b7ff"
                        strokeWidth="8"
                        strokeDasharray="94 94"
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="8"
                        strokeDasharray="38 150"
                        strokeDashoffset="-94"
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="8"
                        strokeDasharray="28 160"
                        strokeDashoffset="-132"
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                      />
                      <text x="40" y="42" textAnchor="middle" fill="#f1f5f9" fontSize="10" fontFamily="Inter" fontWeight="700">
                        64%
                      </text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <a
            href="https://www.spindorai.com/"
            target="_blank"
            rel="noreferrer"
            className="landing-card flex items-center justify-center rounded-2xl border border-white/12 bg-slate-950/65 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#22b7ff]/55"
          >
            <img
              src="https://www.google.com/s2/favicons?sz=128&domain=spindorai.com"
              alt="Spindor AI"
              className="h-20 w-20 rounded-2xl object-contain"
              loading="lazy"
            />
          </a>
          <a
            href="https://www.masqot.co/"
            target="_blank"
            rel="noreferrer"
            className="landing-card flex items-center justify-center rounded-2xl border border-white/12 bg-slate-950/65 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#22b7ff]/55"
          >
            <img
              src="/partners/masqot.png"
              alt="Masqot"
              className="h-20 w-auto object-contain"
              loading="lazy"
            />
          </a>
          <a
            href="https://natuvisio.com/tr"
            target="_blank"
            rel="noreferrer"
            className="landing-card flex items-center justify-center rounded-2xl border border-white/12 bg-slate-950/65 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#22b7ff]/55"
          >
            <img
              src="https://www.google.com/s2/favicons?sz=128&domain=natuvisio.com"
              alt="Natuvisio"
              className="h-20 w-20 rounded-full object-contain"
              loading="lazy"
            />
          </a>
        </div>
      </div>
    </header>
  );
}
