import React, { useState, useCallback } from "react";

const ASSETS = [
  { id: "BTC", label: "Bitcoin", icon: "₿", color: "#F7931A" },
  { id: "ETH", label: "Ethereum", icon: "Ξ", color: "#627EEA" },
  { id: "BIST100", label: "BIST 100", icon: "📊", color: "#E31E24" },
  { id: "THYAO", label: "Türk Hava Yolları", icon: "✈", color: "#C8102E" },
  { id: "ALTIN", label: "Altın (ONS)", icon: "🥇", color: "#FFD700" },
  { id: "USD", label: "Dolar (USD/TRY)", icon: "$", color: "#85BB65" },
];

const CORRELATION_MATRIX = {
  BTC:     { BTC: 1.00, ETH: 0.91, BIST100: 0.18, THYAO: 0.12, ALTIN: 0.35, USD: 0.42 },
  ETH:     { BTC: 0.91, ETH: 1.00, BIST100: 0.15, THYAO: 0.09, ALTIN: 0.30, USD: 0.38 },
  BIST100: { BTC: 0.18, ETH: 0.15, BIST100: 1.00, THYAO: 0.82, ALTIN:-0.12, USD:-0.65 },
  THYAO:   { BTC: 0.12, ETH: 0.09, BIST100: 0.82, THYAO: 1.00, ALTIN:-0.08, USD:-0.58 },
  ALTIN:   { BTC: 0.35, ETH: 0.30, BIST100:-0.12, THYAO:-0.08, ALTIN: 1.00, USD: 0.72 },
  USD:     { BTC: 0.42, ETH: 0.38, BIST100:-0.65, THYAO:-0.58, ALTIN: 0.72, USD: 1.00 },
};

function getCorrelation(a, b) {
  const base = CORRELATION_MATRIX[a]?.[b] ?? 0;
  const noise = (Math.random() - 0.5) * 0.04;
  return Math.max(-1, Math.min(1, base + noise));
}

function getWarning(corr, asset1, asset2) {
  const abs = Math.abs(corr);
  const pct = (corr * 100).toFixed(0);

  if (asset1 === asset2) return { level: "info", text: "Aynı varlık seçildi." };

  if (abs >= 0.8)
    return {
      level: "danger",
      text: `⚠️ Çok yüksek korelasyon (%${pct}). Bu iki varlığı birlikte tutmak portföy riskini artırır. Çeşitlendirme faydası düşük.`,
    };
  if (abs >= 0.5)
    return {
      level: "warning",
      text: `⚡ Orta-yüksek korelasyon (%${pct}). Kısmi çeşitlendirme sağlar ama dikkatli olun.`,
    };
  if (abs >= 0.2)
    return {
      level: "neutral",
      text: `✅ Düşük-orta korelasyon (%${pct}). Portföy çeşitlendirmesi için makul bir kombinasyon.`,
    };
  if (corr < 0)
    return {
      level: "success",
      text: `🛡️ Negatif korelasyon (%${pct}). Hedge amaçlı idealdir — biri düşerken diğeri yükselebilir.`,
    };
  return {
    level: "success",
    text: `🎯 Çok düşük korelasyon (%${pct}). Mükemmel çeşitlendirme potansiyeli.`,
  };
}

const WARNING_STYLES = {
  danger:  "bg-red-500/10 border-red-500/20 text-red-400",
  warning: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  neutral: "bg-blue-500/10 border-blue-500/20 text-blue-300",
  success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  info:    "bg-surface-container-highest border-outline-variant/20 text-on-surface-variant",
};

function corrToColor(corr) {
  const abs = Math.abs(corr);
  if (abs >= 0.8) return "text-red-500";
  if (abs >= 0.5) return "text-amber-400";
  if (abs >= 0.2) return "text-blue-400";
  return "text-emerald-400";
}

function corrBarWidth(corr) {
  return `${Math.abs(corr) * 100}%`;
}

function corrBarColor(corr) {
  const abs = Math.abs(corr);
  if (abs >= 0.8) return "bg-red-500";
  if (abs >= 0.5) return "bg-amber-400";
  if (abs >= 0.2) return "bg-blue-400";
  return "bg-emerald-400";
}

export default function CorrelationTest() {
  const [asset1, setAsset1] = useState("BTC");
  const [asset2, setAsset2] = useState("BIST100");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = useCallback(() => {
    setLoading(true);
    setResult(null);

    setTimeout(() => {
      const corr = getCorrelation(asset1, asset2);
      const warning = getWarning(corr, asset1, asset2);
      setResult({ corr, warning });
      setLoading(false);
    }, 800 + Math.random() * 600);
  }, [asset1, asset2]);

  const asset1Data = ASSETS.find((a) => a.id === asset1);
  const asset2Data = ASSETS.find((a) => a.id === asset2);

  return (
    <div className="flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/10 mb-4">
            <span
              className="material-symbols-outlined text-secondary text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              query_stats
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">
            Korelasyon Çarpışma Testi
          </h2>
          <p className="text-sm text-on-surface-variant mt-1 font-body">
            İki varlık arasındaki ilişkiyi analiz edin
          </p>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <AssetSelect
              id="asset1-select"
              label="1. Varlık"
              value={asset1}
              onChange={setAsset1}
            />
            <AssetSelect
              id="asset2-select"
              label="2. Varlık"
              value={asset2}
              onChange={setAsset2}
            />
          </div>

          <div className="flex items-center justify-center gap-3 py-1">
            <AssetBadge asset={asset1Data} />
            <div className="flex items-center gap-1">
              <span className="block w-6 h-px bg-outline-variant/30" />
              <span className="material-symbols-outlined text-on-surface-variant/40 text-base">
                swap_horiz
              </span>
              <span className="block w-6 h-px bg-outline-variant/30" />
            </div>
            <AssetBadge asset={asset2Data} />
          </div>

          <button
            id="calculate-btn"
            onClick={handleCalculate}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold font-headline text-sm transition-all duration-200 cursor-pointer disabled:cursor-wait bg-secondary text-on-secondary hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-base">
                  progress_activity
                </span>
                Hesaplanıyor...
              </span>
            ) : (
              "Korelasyonu Hesapla"
            )}
          </button>
        </div>

        <div
          className={`mt-4 transition-all duration-500 ease-out ${
            result
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          {result && (
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label">
                    Korelasyon Katsayısı
                  </span>
                  <span className="text-[10px] text-on-surface-variant/60">
                    Son 1 yıl (252 işlem günü)
                  </span>
                </div>

                <div className="flex items-end gap-2 mt-3">
                  <span
                    className={`text-5xl font-extrabold tracking-tight tabular-nums font-headline ${corrToColor(
                      result.corr
                    )}`}
                  >
                    {result.corr >= 0 ? "+" : ""}
                    {(result.corr * 100).toFixed(1)}
                  </span>
                  <span
                    className={`text-lg font-bold mb-1.5 ${corrToColor(
                      result.corr
                    )} opacity-60`}
                  >
                    %
                  </span>
                </div>

                <div className="mt-4 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${corrBarColor(
                      result.corr
                    )}`}
                    style={{ width: corrBarWidth(result.corr) }}
                  />
                </div>

                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-on-surface-variant/40">0%</span>
                  <span className="text-[10px] text-on-surface-variant/40">100%</span>
                </div>
              </div>

              <div className="px-5 pb-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniStat
                    label="Yön"
                    value={result.corr >= 0 ? "Pozitif" : "Negatif"}
                    sub={result.corr >= 0 ? "↗ Aynı yön" : "↘ Ters yön"}
                  />
                  <MiniStat
                    label="Güç"
                    value={
                      Math.abs(result.corr) >= 0.8
                        ? "Çok Güçlü"
                        : Math.abs(result.corr) >= 0.5
                        ? "Güçlü"
                        : Math.abs(result.corr) >= 0.2
                        ? "Zayıf"
                        : "Çok Zayıf"
                    }
                    sub={`|r| = ${Math.abs(result.corr).toFixed(2)}`}
                  />
                  <MiniStat
                    label="Çeşitlendirme"
                    value={
                      Math.abs(result.corr) >= 0.7
                        ? "Düşük"
                        : Math.abs(result.corr) >= 0.4
                        ? "Orta"
                        : "Yüksek"
                    }
                    sub={
                      Math.abs(result.corr) >= 0.7
                        ? "⚠ Riskli"
                        : Math.abs(result.corr) >= 0.4
                        ? "◉ Dikkat"
                        : "✓ İdeal"
                    }
                  />
                </div>
              </div>

              <div className="border-t border-outline-variant/10 px-5 py-4">
                <div
                  className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${
                    WARNING_STYLES[result.warning.level]
                  }`}
                >
                  {result.warning.text}
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-on-surface-variant/50 mt-6 font-body">
          Korelasyon verisi yıllık ortalamadır, yatırım tavsiyesi değildir.
        </p>
      </div>
    </div>
  );
}

function AssetSelect({ id, label, value, onChange }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider font-label"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-surface border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface text-sm font-medium focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/20 transition-all cursor-pointer"
        >
          {ASSETS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.icon} {a.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <span className="material-symbols-outlined text-on-surface-variant text-lg">
            expand_more
          </span>
        </div>
      </div>
    </div>
  );
}

function AssetBadge({ asset }) {
  if (!asset) return null;
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
      style={{
        backgroundColor: `${asset.color}15`,
        color: asset.color,
      }}
    >
      <span className="text-sm">{asset.icon}</span>
      {asset.id}
    </div>
  );
}

function MiniStat({ label, value, sub }) {
  return (
    <div className="bg-surface-container-highest rounded-lg py-2.5 px-2">
      <span className="block text-[9px] text-on-surface-variant/60 uppercase tracking-wider font-label">
        {label}
      </span>
      <span className="block text-xs font-bold text-on-surface mt-0.5">
        {value}
      </span>
      <span className="block text-[10px] text-on-surface-variant/60 mt-0.5">{sub}</span>
    </div>
  );
}
