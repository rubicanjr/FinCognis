import React from "react";
import {
  ArrowLeftRight,
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

const SPONSORS = [
  {
    name: "Spindor AI",
    href: "https://www.spindorai.com/",
    logo: "/partners/spindor-s.webp",
    className: "h-12 w-12 landing-sponsor-logo--vivid",
  },
  {
    name: "Masqot",
    href: "https://www.masqot.co/",
    logo: "/partners/masqot.png",
    className: "h-9 w-auto landing-sponsor-logo--masqot",
  },
];

export default function HeroSection() {
  return (
    <header id="karsilastir" className="landing-section relative flex min-h-[980px] flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-28 sm:px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 82%, rgb(34 211 238 / 0.26) 0%, transparent 44%), radial-gradient(circle at 12% 4%, rgb(34 183 255 / 0.18) 0%, transparent 34%), radial-gradient(circle at 88% 6%, rgb(79 70 229 / 0.16) 0%, transparent 34%), linear-gradient(180deg, rgba(2,9,21,0.98) 0%, rgba(1,7,18,0.98) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 -translate-y-10 overflow-hidden opacity-[0.14] blur-[0.45px]">
        <svg viewBox="0 0 1440 860" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="heroCandleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3bf4ff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#1d95ff" stopOpacity="0.72" />
            </linearGradient>
          </defs>

          {[120, 170, 220, 270, 320, 370, 420, 470, 520, 570].map((x) => (
            <line key={`g-${x}`} x1={x} y1="70" x2={x} y2="790" stroke="rgba(75, 211, 255, 0.20)" strokeWidth="1" />
          ))}

          <path
            d="M 20 610 C 140 520, 220 450, 300 500 C 380 550, 460 570, 560 470 C 660 370, 740 490, 840 410 C 940 330, 1040 420, 1140 320 C 1240 230, 1330 170, 1420 130"
            fill="none"
            stroke="rgba(54, 226, 255, 0.62)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          <path
            d="M 0 520 C 180 430, 240 560, 360 520 C 460 490, 520 470, 650 520 C 760 560, 820 410, 950 460 C 1080 510, 1180 380, 1440 450"
            fill="none"
            stroke="rgba(39, 191, 255, 0.45)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {[
            [120, 640, 34], [165, 612, 56], [205, 585, 42], [245, 560, 66], [292, 540, 48],
            [338, 565, 38], [382, 540, 44], [425, 505, 74], [470, 522, 36], [515, 492, 62],
            [560, 455, 82], [606, 470, 44], [650, 430, 94], [694, 452, 52], [738, 392, 112],
            [785, 415, 62], [830, 360, 126], [875, 390, 58], [920, 340, 136], [966, 370, 72],
            [1010, 316, 142], [1054, 335, 82], [1098, 290, 156], [1142, 320, 88], [1186, 256, 168],
            [1232, 285, 98], [1278, 220, 186], [1324, 190, 194], [1366, 168, 204]
          ].map(([x, y, h], index) => (
            <g key={`candle-${x}-${index}`}>
              <line x1={String(x)} y1={String(y - h / 2)} x2={String(x)} y2={String(y + h / 2)} stroke="rgba(77, 244, 255, 0.62)" strokeWidth="2" />
              <rect x={String(x - 7)} y={String(y - h / 3)} width="14" height={String(h / 1.45)} fill="url(#heroCandleGrad)" rx="1.5" />
            </g>
          ))}

          <g fontFamily="var(--font-kusanagi-heading)" fontSize="42" fontWeight="700" fill="rgba(173, 241, 255, 0.86)">
            <text x="130" y="675">07.28</text>
            <text x="475" y="655">18.75</text>
            <text x="555" y="510">22.10</text>
            <text x="695" y="550">24.78</text>
            <text x="815" y="485">25.01</text>
            <text x="1060" y="430">25.21</text>
            <text x="1225" y="250">29.79</text>
          </g>
        </svg>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,23,0.14)_0%,rgba(2,8,23,0.32)_55%,rgba(2,8,23,0.44)_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.07)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-2 pb-10 pt-12 text-center sm:px-6">
        <div className="animate-fade-in-up relative left-[calc(-50vw+50%)] mb-20 w-screen pl-4 text-left sm:mb-24 sm:pl-6 md:pl-8 lg:pl-10">
          <span className="font-display text-[54px] font-semibold leading-none tracking-[-0.03em] text-white sm:text-[68px]">
            FınCognıs
          </span>
        </div>

        <h1 className="animate-fade-in-up-delay-1 mb-5 font-display text-[2.55rem] font-semibold leading-[1.04] tracking-[-0.03em] text-white sm:text-[3.2rem] md:text-[4.1rem] lg:text-[5.75rem]">
          <span className="block whitespace-nowrap">
            <span className="font-display text-[0.9em]">FİNANSAL</span>{" "}
            <span className="hero-exclusive-dynamic text-[1.08em] font-semibold">KARARLAR</span>
          </span>
          <span className="block whitespace-nowrap">
            <span className="font-display text-[0.9em]">VERİYLE</span>{" "}
            <span className="hero-exclusive-dynamic text-[1.08em] font-semibold">ŞEKİLLENİYOR</span>
          </span>
          <span className="block whitespace-nowrap">
            <span className="font-display text-[0.9em]">FINCOGNIS İLE</span>{" "}
            <span className="hero-exclusive-dynamic text-[1.08em] font-semibold">NETLEŞİYOR</span>
          </span>
        </h1>

        <div className="animate-fade-in-up-delay-3 mt-10 flex justify-center">
          <a
            href="https://fincognis.onrender.com/tools"
            target="_blank"
            rel="noreferrer"
            className="landing-primary-btn w-full rounded-xl border border-[#22b7ff]/55 bg-[#22b7ff]/18 px-8 py-4 text-center font-display text-lg font-semibold text-[#dff4ff] transition-all hover:-translate-y-0.5 hover:bg-[#22b7ff]/26 active:scale-95 sm:w-auto"
          >
            ARACI AÇ
          </a>
        </div>

        <div className="animate-fade-in-up-delay-3 mt-16 grid grid-cols-1 items-start gap-8 text-left sm:grid-cols-3 sm:gap-12 lg:gap-20">
          <div className="min-w-0">
            <div className="font-display text-3xl font-semibold text-white sm:text-4xl">
              <span>60 Milyon TL</span>
              <span className="relative -top-[0.28em] ml-1 inline-block text-[0.8em] leading-none">+</span>
            </div>
            <div className="mt-2 text-sm text-slate-300">Bireysel Finansal Hacim</div>
          </div>
          <div className="min-w-0">
            <div className="font-display text-3xl font-semibold text-white sm:text-4xl">+30</div>
            <div className="mt-2 text-sm text-slate-300">yıllık tecrübe</div>
          </div>
          <div className="min-w-0 sm:-ml-2 lg:-ml-4">
            <div className="font-display whitespace-nowrap text-3xl font-semibold leading-none text-white sm:text-4xl">Decısıon Intellıgence</div>
            <div className="mt-2 text-sm text-slate-300">yaklaşımı</div>
          </div>
        </div>
      </div>

      <div className="animate-fade-in-up-delay-3 relative mx-auto mt-56 w-full max-w-6xl">
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
                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="font-display text-[10px] tracking-[0.08em] text-slate-400">{card.label}</span>
                          <MetricIcon className="relative top-px h-4 w-4 text-slate-400" strokeWidth={1.5} />
                        </div>
                        <div className="font-data tabular-nums lining-nums text-base font-semibold tracking-[0.01em] text-slate-100 sm:text-lg">{card.value}</div>
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
                      <text x="40" y="42" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">
                        64%
                      </text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative left-1/2 mt-8 w-screen -translate-x-1/2 overflow-hidden py-3">
          <div className="mb-3 text-center">
            <span className="font-display text-sm font-semibold tracking-[0.08em] text-white/75">Stratejik Partnerlerimiz</span>
          </div>
          <div className="landing-sponsor-marquee">
            {[...SPONSORS, ...SPONSORS, ...SPONSORS, ...SPONSORS].map((sponsor, index) => (
              <a
                key={`${sponsor.name}-${index}`}
                href={sponsor.href}
                target="_blank"
                rel="noreferrer"
                className="landing-sponsor-item group"
                aria-label={sponsor.name}
              >
                <img
                  src={sponsor.logo}
                  alt={sponsor.name}
                  className={`landing-sponsor-logo object-contain ${sponsor.className}`}
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

