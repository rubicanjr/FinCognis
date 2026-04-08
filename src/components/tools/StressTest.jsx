import React, { useState, useCallback } from "react";

const ASSETS = [
  { id: "BTC",     label: "Bitcoin",           icon: "₿",  color: "#F7931A", beta: 2.00 },
  { id: "ETH",     label: "Ethereum",          icon: "Ξ",  color: "#627EEA", beta: 2.50 },
  { id: "BIST100", label: "BIST 100",          icon: "📊", color: "#E31E24", beta: 1.00 },
  { id: "THYAO",   label: "Türk Hava Yolları", icon: "✈",  color: "#C8102E", beta: 1.30 },
  { id: "ALTIN",   label: "Altın (ONS)",       icon: "🥇", color: "#FFD700", beta: -0.15 },
  { id: "USD",     label: "Dolar (USD/TRY)",   icon: "$",  color: "#85BB65", beta: -0.40 },
];

const SCENARIOS = [
  {
    id: "2008",
    year: 2008,
    label: "Küresel Finans Krizi",
    description: "Lehman Brothers'ın çöküşü, mortgage krizi, küresel likidite sıkışması.",
    baseDrawdown: -0.55,
    icon: "🏦",
    color: "#EF4444",
    duration: "18 ay",
    recovery: "~4 yıl",
  },
  {
    id: "2020",
    year: 2020,
    label: "COVID-19 Çöküşü",
    description: "Pandemi şoku, küresel kapanmalar, tedarik zinciri kırılması.",
    baseDrawdown: -0.34,
    icon: "🦠",
    color: "#F59E0B",
    duration: "33 gün",
    recovery: "~5 ay",
  },
  {
    id: "2022",
    year: 2022,
    label: "Faiz & Kripto Krizi",
    description: "Agresif faiz artışları, Terra/LUNA çöküşü, FTX iflası.",
    baseDrawdown: -0.28,
    icon: "📉",
    color: "#8B5CF6",
    duration: "10 ay",
    recovery: "~18 ay",
  },
];

function simulateStress(portfolioAmount, assetId) {
  const asset = ASSETS.find((a) => a.id === assetId);
  if (!asset) return [];

  return SCENARIOS.map((scenario) => {
    const rawDrop = scenario.baseDrawdown * asset.beta;
    const effectiveDrop = Math.max(-0.95, Math.min(0.60, rawDrop));
    const lossTL = portfolioAmount * effectiveDrop;

    return {
      scenario,
      dropPct: effectiveDrop,
      lossTL,
      survived: effectiveDrop > -0.5,
    };
  });
}

function formatTL(amount) {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(0);
}

function formatFullTL(amount) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getSeverity(dropPct) {
  const abs = Math.abs(dropPct);
  if (dropPct > 0) return { level: "gain",   label: "Kazanç",      barColor: "bg-emerald-400", textColor: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" };
  if (abs >= 0.50) return { level: "extreme", label: "Ağır Kayıp",  barColor: "bg-red-500",     textColor: "text-red-400",     bgColor: "bg-red-500/10",     borderColor: "border-red-500/20"     };
  if (abs >= 0.30) return { level: "severe",  label: "Ciddi Kayıp", barColor: "bg-orange-500",   textColor: "text-orange-400",  bgColor: "bg-orange-500/10",  borderColor: "border-orange-500/20"  };
  if (abs >= 0.15) return { level: "moderate",label: "Orta Kayıp",  barColor: "bg-amber-400",    textColor: "text-amber-400",   bgColor: "bg-amber-500/10",   borderColor: "border-amber-500/20"   };
  return                   { level: "light",   label: "Hafif Kayıp", barColor: "bg-blue-400",     textColor: "text-blue-400",    bgColor: "bg-blue-500/10",    borderColor: "border-blue-500/20"    };
}

export default function StressTest() {
  const [portfolio, setPortfolio] = useState("");
  const [assetId, setAssetId] = useState("BTC");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedAsset = ASSETS.find((a) => a.id === assetId);
  const parsedAmount = parseFloat(portfolio.replace(/[^0-9.]/g, "")) || 0;

  const handleSimulate = useCallback(() => {
    if (parsedAmount <= 0) return;
    setLoading(true);
    setResults(null);

    setTimeout(() => {
      const res = simulateStress(parsedAmount, assetId);
      setResults(res);
      setLoading(false);
    }, 700 + Math.random() * 500);
  }, [parsedAmount, assetId]);

  const worstCase = results
    ? results.reduce((w, r) => (r.dropPct < w.dropPct ? r : w), results[0])
    : null;

  return (
    <div className="flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/10 mb-4">
            <span
              className="material-symbols-outlined text-secondary text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">
            Portföy Stres Simülatörü
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 font-body">
            Kriz senaryolarında portföyünüzü test edin
          </p>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-5 space-y-4">
          <div>
            <label htmlFor="portfolio-amount" className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider font-label">
              Portföy Tutarı (₺)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-semibold">₺</span>
              <input
                id="portfolio-amount"
                type="text"
                inputMode="numeric"
                placeholder="100.000"
                value={portfolio}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  if (raw === "") { setPortfolio(""); return; }
                  setPortfolio(Number(raw).toLocaleString("tr-TR"));
                }}
                className="w-full bg-surface border border-outline-variant/20 rounded-xl pl-8 pr-4 py-3 text-on-surface text-sm font-medium placeholder-outline focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/20 transition-all"
              />
            </div>
            {parsedAmount > 0 && (
              <p className="text-[10px] text-on-surface-variant/60 mt-1">
                {formatFullTL(parsedAmount)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider font-label">
              Varlık Seçimi
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ASSETS.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setAssetId(asset.id)}
                  className={`relative flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    assetId === asset.id
                      ? "border-secondary/40 bg-secondary/5"
                      : "border-outline-variant/10 bg-surface hover:border-outline-variant/30"
                  }`}
                >
                  <span className="text-lg">{asset.icon}</span>
                  <span className={assetId === asset.id ? "text-secondary" : "text-on-surface-variant"}>
                    {asset.id}
                  </span>
                  <span className="text-[9px] text-on-surface-variant/60 font-normal">
                    β = {asset.beta.toFixed(2)}
                  </span>
                  {assetId === asset.id && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-secondary rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-secondary text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedAsset && (
            <div className="flex items-center gap-2 bg-surface-container-highest rounded-xl px-3 py-2.5 border border-outline-variant/10">
              <span className="text-lg">{selectedAsset.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-on-surface">{selectedAsset.label}</span>
                <span className="block text-[10px] text-on-surface-variant/60">
                  Beta: {selectedAsset.beta.toFixed(2)} — {selectedAsset.beta > 1 ? "Piyasadan daha volatil" : selectedAsset.beta > 0 ? "Piyasa ile aynı yön" : "Ters yönlü hareket (hedge)"}
                </span>
              </div>
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedAsset.color }}
              />
            </div>
          )}

          <button
            id="simulate-btn"
            onClick={handleSimulate}
            disabled={loading || parsedAmount <= 0}
            className="w-full py-3.5 rounded-xl font-bold font-headline text-sm transition-all duration-200 cursor-pointer disabled:cursor-not-allowed bg-secondary text-on-secondary hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-base">
                  progress_activity
                </span>
                Simülasyon Çalışıyor...
              </span>
            ) : (
              "Stres Testi Başlat"
            )}
          </button>
        </div>

        <div className={`mt-4 transition-all duration-500 ease-out ${
          results ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}>
          {results && (
            <div className="space-y-3">
              {worstCase && (
                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">🔻</span>
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider font-label">En Kötü Senaryo</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="block text-xs text-on-surface-variant">{worstCase.scenario.year} — {worstCase.scenario.label}</span>
                      <span className="block text-2xl font-extrabold text-red-400 tabular-nums mt-1 font-headline">
                        {(worstCase.dropPct * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-on-surface-variant/60">Tahmini Kayıp</span>
                      <span className="block text-lg font-bold text-red-400 tabular-nums font-headline">
                        {formatFullTL(Math.abs(worstCase.lossTL))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {results.map((r) => {
                const sev = getSeverity(r.dropPct);
                const isGain = r.dropPct > 0;

                return (
                  <div
                    key={r.scenario.id}
                    className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden"
                  >
                    <div className="px-5 pt-4 pb-3 flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{r.scenario.icon}</span>
                        <div>
                          <span className="block text-sm font-bold text-on-surface font-headline">{r.scenario.year}</span>
                          <span className="block text-[11px] text-on-surface-variant">{r.scenario.label}</span>
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${sev.bgColor} ${sev.borderColor} border ${sev.textColor}`}>
                        {sev.label}
                      </div>
                    </div>

                    <div className="px-5 pb-3">
                      <p className="text-[11px] text-on-surface-variant/60 leading-relaxed">
                        {r.scenario.description}
                      </p>
                    </div>

                    <div className="px-5 pb-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-surface-container-highest rounded-xl p-3">
                          <span className="block text-[9px] text-on-surface-variant/60 uppercase tracking-wider font-label">
                            {isGain ? "Beklenen Getiri" : "Beklenen Kayıp"}
                          </span>
                          <span className={`block text-2xl font-extrabold tabular-nums mt-1 font-headline ${sev.textColor}`}>
                            {isGain ? "+" : ""}{(r.dropPct * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="bg-surface-container-highest rounded-xl p-3">
                          <span className="block text-[9px] text-on-surface-variant/60 uppercase tracking-wider font-label">
                            {isGain ? "TL Getiri" : "TL Kayıp"}
                          </span>
                          <span className={`block text-2xl font-extrabold tabular-nums mt-1 font-headline ${sev.textColor}`}>
                            {isGain ? "+" : "-"}{formatTL(Math.abs(r.lossTL))}
                          </span>
                          <span className="block text-[10px] text-on-surface-variant/60 mt-0.5">
                            {formatFullTL(Math.abs(r.lossTL))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-on-surface-variant/60 uppercase tracking-wider font-label">Etki Şiddeti</span>
                        <span className="text-[10px] text-on-surface-variant/60">|{(Math.abs(r.dropPct) * 100).toFixed(0)}%|</span>
                      </div>
                      <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${sev.barColor}`}
                          style={{ width: `${Math.min(Math.abs(r.dropPct) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="border-t border-outline-variant/10 px-5 py-3 grid grid-cols-3 gap-2 text-center">
                      <FooterStat label="Piyasa Düşüşü" value={`${(r.scenario.baseDrawdown * 100).toFixed(0)}%`} />
                      <FooterStat label="Kriz Süresi" value={r.scenario.duration} />
                      <FooterStat label="Toparlanma" value={r.scenario.recovery} />
                    </div>

                    <div className="border-t border-outline-variant/10 px-5 py-3 flex items-center justify-between">
                      <span className="text-[10px] text-on-surface-variant/60">Kalan Portföy Değeri</span>
                      <span className={`text-sm font-bold tabular-nums ${isGain ? "text-emerald-400" : "text-on-surface"}`}>
                        {formatFullTL(parsedAmount + r.lossTL)}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl px-5 py-4">
                <div className="flex gap-3">
                  <span className="text-lg flex-shrink-0 mt-0.5">💡</span>
                  <div>
                    <span className="block text-xs font-semibold text-on-surface mb-1 font-headline">Yorumlama Rehberi</span>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed font-body">
                      Bu simülasyon, <strong className="text-on-surface">{selectedAsset?.label}</strong> için
                      β = {selectedAsset?.beta.toFixed(2)} katsayısı ile geçmiş kriz senaryolarındaki
                      tahmini etkileri gösterir.
                      {selectedAsset?.beta < 0
                        ? " Negatif beta, piyasa düştüğünde bu varlığın değer kazanabileceğini gösterir — doğal bir hedge aracıdır."
                        : selectedAsset?.beta > 1.5
                        ? " Yüksek beta, bu varlığın piyasa düşüşlerinden orantısız etkileneceğini gösterir."
                        : " Bu varlık piyasa hareketlerini yakından takip eder."
                      }
                    </p>
                    <p className="text-[10px] text-on-surface-variant/50 mt-2 font-body">
                      ⚠ Geçmiş performans gelecek sonuçların garantisi değildir. Yatırım tavsiyesi içermez.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-on-surface-variant/50 mt-6 font-body">
          Beta katsayıları yıllık ortalamadır, yatırım tavsiyesi değildir.
        </p>
      </div>
    </div>
  );
}

function FooterStat({ label, value }) {
  return (
    <div>
      <span className="block text-[9px] text-on-surface-variant/60 uppercase tracking-wider font-label">{label}</span>
      <span className="block text-[11px] font-bold text-on-surface-variant mt-0.5">{value}</span>
    </div>
  );
}
