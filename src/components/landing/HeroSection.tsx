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
  { icon: LayoutDashboard, label: "Genel Bakış", active: true },
  { icon: CandlestickChart, label: "Piyasalar" },
  { icon: Wallet, label: "Portföy" },
  { icon: ArrowLeftRight, label: "İşlemler" },
  { icon: BarChart3, label: "Analitik" },
  { icon: ShieldCheck, label: "Güvenlik" },
];

const METRIC_CARDS: MetricCard[] = [
  { icon: Landmark, label: "Toplam Varlık", value: "₺2.847.320", change: "+12.4%", up: true },
  { icon: TrendingUp, label: "Günlük Hacim", value: "₺184.5K", change: "+8.2%", up: true },
  { icon: ArrowLeftRight, label: "Açık Pozisyon", value: "24", change: "-3", up: false },
  { icon: ShieldCheck, label: "Risk Skoru", value: "72/100", change: "Yüksek", up: true },
];

export default function HeroSection() {
  return (
    <header className="relative flex min-h-[795px] flex-col items-center justify-center overflow-hidden px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute inset-0 grid-pattern" />
      <div className="pointer-events-none absolute inset-0 spotlight-bg" />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-high px-3 py-1.5">
          <BadgeCheck className="h-4 w-4 text-secondary" strokeWidth={1.5} />
          <span className="font-label text-xs font-medium uppercase tracking-widest text-on-surface-variant">
            Finansal Kararı Hızlandıran Altyapı
          </span>
        </div>

        <h1 className="animate-fade-in-up-delay-1 mb-6 font-headline text-5xl font-extrabold leading-[1.1] tracking-tighter text-on-surface sm:text-6xl md:text-8xl">
          Hassas Finansal <span className="text-secondary">Zekâ</span>
        </h1>

        <p className="animate-fade-in-up-delay-2 mx-auto mb-10 max-w-2xl font-body text-lg leading-relaxed text-on-surface-variant sm:text-xl md:text-2xl">
          Yüksek frekanslı analitik ve kurumsal güvenlik katmanı ile operasyonlarınızı güvenle ölçeklendirin.
        </p>

        <div className="animate-fade-in-up-delay-3 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button className="w-full rounded-xl bg-secondary px-8 py-4 font-headline text-lg font-bold text-on-secondary shadow-lg shadow-secondary/20 transition-all hover:brightness-110 active:scale-95 sm:w-auto">
            Platformu Keşfet
          </button>
          <button className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-8 py-4 font-headline text-lg font-bold text-on-surface transition-all hover:bg-surface-container-high active:scale-95 sm:w-auto">
            Dokümantasyon
          </button>
        </div>
      </div>

      <div className="animate-fade-in-up-delay-3 relative mx-auto mt-20 w-full max-w-6xl">
        <div className="glass-panel overflow-hidden rounded-2xl p-3 sm:p-4">
          <div className="w-full select-none overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest" aria-label="FinCognis Dashboard Önizleme">
            <div className="flex items-center gap-2 border-b border-outline-variant/40 px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-error" />
              <span className="h-3 w-3 rounded-full bg-warning" />
              <span className="h-3 w-3 rounded-full bg-success" />
              <span className="ml-4 font-label text-[11px] tracking-wide text-on-surface-variant">app.fincognis.com/dashboard</span>
            </div>

            <div className="flex min-h-[340px] sm:min-h-[420px]">
              <div className="hidden w-48 shrink-0 flex-col gap-1 border-r border-outline-variant/30 bg-surface-container p-3 sm:flex">
                <div className="mb-4 flex items-center gap-2 px-2">
                  <Diamond className="h-4 w-4 text-secondary" strokeWidth={1.5} />
                  <span className="font-headline text-sm font-bold tracking-tight text-on-surface">FinCognis</span>
                </div>
                {SIDEBAR_ITEMS.map((item) => {
                  const SidebarIcon = item.icon;
                  const itemClass = item.active
                    ? "bg-info-container text-on-surface"
                    : "text-on-surface-variant hover:text-on-surface";
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-label text-xs transition-colors ${itemClass}`}
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
                      <div key={card.label} className="rounded-xl border border-outline-variant/40 bg-surface-container p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">{card.label}</span>
                          <MetricIcon className="h-4 w-4 text-on-surface-variant" strokeWidth={1.5} />
                        </div>
                        <div className="font-headline text-base font-bold tracking-tight text-on-surface sm:text-lg">{card.value}</div>
                        <div className={`mt-1 font-label text-[10px] ${changeTone}`}>{card.change}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-3 lg:flex-row">
                  <div className="flex-1 rounded-xl border border-outline-variant/40 bg-surface-container p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant">Portföy Performansı</span>
                      <div className="flex gap-1.5">
                        {["1G", "1H", "1A", "1Y"].map((timeRange) => {
                          const spanClass =
                            timeRange === "1A"
                              ? "bg-info-container font-semibold text-on-surface"
                              : "bg-surface-container-high text-on-surface-variant";
                          return (
                            <span key={timeRange} className={`rounded px-2 py-0.5 font-label text-[10px] ${spanClass}`}>
                              {timeRange}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <svg viewBox="0 0 480 140" className="h-auto w-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(var(--secondary))" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="rgb(var(--secondary))" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {[28, 56, 84, 112].map((y) => (
                        <line
                          key={y}
                          x1="0"
                          y1={y}
                          x2="480"
                          y2={y}
                          stroke="rgb(var(--outline-variant))"
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
                        stroke="rgb(var(--secondary))"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx="480" cy="12" r="4" fill="rgb(var(--secondary))" />
                      <circle cx="480" cy="12" r="7" fill="rgb(var(--secondary-container))" />
                    </svg>
                  </div>

                  <div className="flex w-full flex-col items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-container p-4 lg:w-44">
                    <span className="mb-3 font-label text-[10px] uppercase tracking-wider text-on-surface-variant">Dağılım</span>
                    <PieChart className="mb-2 h-6 w-6 text-secondary" strokeWidth={1.5} />
                    <svg viewBox="0 0 80 80" className="h-20 w-20">
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke="rgb(var(--outline-variant))"
                        strokeWidth="8"
                        strokeOpacity="0.5"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke="rgb(var(--secondary))"
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
                        stroke="rgb(var(--info))"
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
                        stroke="rgb(var(--primary))"
                        strokeWidth="8"
                        strokeDasharray="28 160"
                        strokeDashoffset="-132"
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                      />
                      <text x="40" y="42" textAnchor="middle" fill="rgb(var(--on-surface))" fontSize="10" fontFamily="Inter" fontWeight="700">
                        64%
                      </text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
