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

      {/* Dashboard Mockup — pure CSS/JSX, resolution-independent */}
      <div className="relative mt-20 w-full max-w-6xl mx-auto animate-fade-in-up-delay-3">
        <div className="glass-panel p-3 sm:p-4 rounded-2xl border border-outline-variant/20 shadow-2xl overflow-hidden">
          <div
            className="w-full rounded-xl overflow-hidden select-none"
            aria-label="FinCognis Dashboard Önizleme"
            style={{ background: "#0c0e12" }}
          >
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#45474b]/40">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="ml-4 text-[11px] text-[#8f9095] font-label tracking-wide">
                app.fincognis.com/dashboard
              </span>
            </div>

            <div className="flex min-h-[340px] sm:min-h-[420px]">
              {/* Sidebar */}
              <div className="hidden sm:flex flex-col w-48 border-r border-[#45474b]/30 p-3 gap-1 shrink-0">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
                  <span className="text-sm font-headline font-bold text-on-surface tracking-tight">FinCognis</span>
                </div>
                {[
                  { icon: "dashboard", label: "Genel Bakış", active: true },
                  { icon: "candlestick_chart", label: "Piyasalar" },
                  { icon: "account_balance_wallet", label: "Portföy" },
                  { icon: "swap_horiz", label: "İşlemler" },
                  { icon: "analytics", label: "Analitik" },
                  { icon: "shield", label: "Güvenlik" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-label transition-colors ${
                      item.active
                        ? "bg-secondary/10 text-secondary font-semibold"
                        : "text-[#8f9095] hover:text-on-surface-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: item.active ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-hidden">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Toplam Varlık", value: "₺2.847.320", change: "+12.4%", up: true, icon: "account_balance" },
                    { label: "Günlük Hacim", value: "₺184.5K", change: "+8.2%", up: true, icon: "trending_up" },
                    { label: "Açık Pozisyon", value: "24", change: "-3", up: false, icon: "swap_vert" },
                    { label: "Risk Skoru", value: "72/100", change: "Orta", up: true, icon: "shield" },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="rounded-xl p-3 border border-[#45474b]/30"
                      style={{ background: "#191c1f" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-[#8f9095] font-label uppercase tracking-wider">{card.label}</span>
                        <span className="material-symbols-outlined text-[14px] text-[#45474b]">{card.icon}</span>
                      </div>
                      <div className="text-base sm:text-lg font-headline font-bold text-on-surface tracking-tight">{card.value}</div>
                      <div className={`text-[10px] font-label mt-1 ${card.up ? "text-[#28c840]" : "text-[#ffb4ab]"}`}>
                        {card.change}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart area */}
                <div className="flex flex-col lg:flex-row gap-3">
                  {/* Main chart */}
                  <div
                    className="flex-1 rounded-xl p-4 border border-[#45474b]/30"
                    style={{ background: "#191c1f" }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-label text-[#8f9095] uppercase tracking-wider">Portföy Performansı</span>
                      <div className="flex gap-1.5">
                        {["1G", "1H", "1A", "1Y"].map((t) => (
                          <span
                            key={t}
                            className={`text-[10px] px-2 py-0.5 rounded font-label ${
                              t === "1A"
                                ? "bg-secondary/15 text-secondary font-semibold"
                                : "text-[#8f9095]"
                            }`}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* SVG Chart */}
                    <svg viewBox="0 0 480 140" className="w-full h-auto" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#9ecaff" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#9ecaff" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      {[28, 56, 84, 112].map((y) => (
                        <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="#45474b" strokeOpacity="0.2" strokeDasharray="4 4" />
                      ))}
                      {/* Area fill */}
                      <path
                        d="M0,110 C40,105 60,95 100,85 C140,75 160,90 200,70 C240,50 280,60 320,40 C360,20 400,30 440,15 C460,10 480,12 480,12 L480,140 L0,140 Z"
                        fill="url(#chartGrad)"
                      />
                      {/* Line */}
                      <path
                        d="M0,110 C40,105 60,95 100,85 C140,75 160,90 200,70 C240,50 280,60 320,40 C360,20 400,30 440,15 C460,10 480,12 480,12"
                        fill="none"
                        stroke="#9ecaff"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      {/* Dot */}
                      <circle cx="480" cy="12" r="4" fill="#9ecaff" />
                      <circle cx="480" cy="12" r="7" fill="#9ecaff" fillOpacity="0.2" />
                    </svg>
                  </div>

                  {/* Allocation donut */}
                  <div
                    className="w-full lg:w-44 rounded-xl p-4 border border-[#45474b]/30 flex flex-col items-center justify-center"
                    style={{ background: "#191c1f" }}
                  >
                    <span className="text-[10px] font-label text-[#8f9095] uppercase tracking-wider mb-3">Dağılım</span>
                    <svg viewBox="0 0 80 80" className="w-20 h-20">
                      <circle cx="40" cy="40" r="30" fill="none" stroke="#45474b" strokeWidth="8" strokeOpacity="0.3" />
                      <circle cx="40" cy="40" r="30" fill="none" stroke="#9ecaff" strokeWidth="8" strokeDasharray="94 94" strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 40 40)" />
                      <circle cx="40" cy="40" r="30" fill="none" stroke="#a8c8ff" strokeWidth="8" strokeDasharray="38 150" strokeDashoffset="-94" strokeLinecap="round" transform="rotate(-90 40 40)" />
                      <circle cx="40" cy="40" r="30" fill="none" stroke="#1e95f2" strokeWidth="8" strokeDasharray="28 160" strokeDashoffset="-132" strokeLinecap="round" transform="rotate(-90 40 40)" />
                      <text x="40" y="42" textAnchor="middle" fill="#e1e2e7" fontSize="10" fontFamily="Inter" fontWeight="700">64%</text>
                    </svg>
                    <div className="mt-3 space-y-1 w-full">
                      {[
                        { color: "#9ecaff", label: "Kripto" },
                        { color: "#a8c8ff", label: "Hisse" },
                        { color: "#1e95f2", label: "Sabit" },
                      ].map((i) => (
                        <div key={i.label} className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: i.color }} />
                          <span className="text-[10px] text-[#8f9095] font-label">{i.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom table preview */}
                <div
                  className="rounded-xl border border-[#45474b]/30 overflow-hidden"
                  style={{ background: "#191c1f" }}
                >
                  <div className="px-4 py-2.5 border-b border-[#45474b]/20">
                    <span className="text-[10px] font-label text-[#8f9095] uppercase tracking-wider">Son İşlemler</span>
                  </div>
                  <div className="divide-y divide-[#45474b]/15">
                    {[
                      { asset: "BTC/USDT", type: "Alış", amount: "0.125 BTC", price: "₺4.125.800", status: "Tamamlandı" },
                      { asset: "THYAO", type: "Satış", amount: "500 Lot", price: "₺167.450", status: "Tamamlandı" },
                      { asset: "ETH/USDT", type: "Alış", amount: "2.5 ETH", price: "₺184.320", status: "Beklemede" },
                    ].map((row, idx) => (
                      <div key={idx} className="grid grid-cols-5 px-4 py-2 text-[10px] sm:text-[11px] font-label">
                        <span className="text-on-surface font-medium">{row.asset}</span>
                        <span className={row.type === "Alış" ? "text-[#28c840]" : "text-[#ffb4ab]"}>{row.type}</span>
                        <span className="text-[#8f9095]">{row.amount}</span>
                        <span className="text-on-surface-variant">{row.price}</span>
                        <span className={`text-right ${row.status === "Tamamlandı" ? "text-[#28c840]" : "text-[#febc2e]"}`}>
                          {row.status}
                        </span>
                      </div>
                    ))}
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
