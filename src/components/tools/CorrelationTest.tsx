"use client";

import { useState, useCallback } from "react";

interface Asset {
  id: string;
  label: string;
  icon: string;
  color: string;
}

const ASSETS: Asset[] = [
  { id: "BTC", label: "Bitcoin", icon: "BTC", color: "#F7931A" },
  { id: "ETH", label: "Ethereum", icon: "ETH", color: "#627EEA" },
  { id: "BIST100", label: "BIST 100", icon: "BIST", color: "#E31E24" },
  { id: "THYAO", label: "Turk Hava Yollari", icon: "THY", color: "#C8102E" },
  { id: "ALTIN", label: "Altin (ONS)", icon: "XAU", color: "#FFD700" },
  { id: "USD", label: "Dolar (USD/TRY)", icon: "USD", color: "#85BB65" },
];

type AssetId = (typeof ASSETS)[number]["id"];

const CORRELATION_MATRIX: Record<AssetId, Record<AssetId, number>> = {
  BTC: { BTC: 1, ETH: 0.91, BIST100: 0.18, THYAO: 0.12, ALTIN: 0.35, USD: 0.42 },
  ETH: { BTC: 0.91, ETH: 1, BIST100: 0.15, THYAO: 0.09, ALTIN: 0.3, USD: 0.38 },
  BIST100: { BTC: 0.18, ETH: 0.15, BIST100: 1, THYAO: 0.82, ALTIN: -0.12, USD: -0.65 },
  THYAO: { BTC: 0.12, ETH: 0.09, BIST100: 0.82, THYAO: 1, ALTIN: -0.08, USD: -0.58 },
  ALTIN: { BTC: 0.35, ETH: 0.3, BIST100: -0.12, THYAO: -0.08, ALTIN: 1, USD: 0.72 },
  USD: { BTC: 0.42, ETH: 0.38, BIST100: -0.65, THYAO: -0.58, ALTIN: 0.72, USD: 1 },
};

type WarningLevel = "danger" | "warning" | "neutral" | "success" | "info";

interface WarningInfo {
  level: WarningLevel;
  text: string;
}

interface ResultState {
  corr: number;
  warning: WarningInfo;
}

function getCorrelation(a: AssetId, b: AssetId) {
  const base = CORRELATION_MATRIX[a]?.[b] ?? 0;
  const noise = (Math.random() - 0.5) * 0.04;
  return Math.max(-1, Math.min(1, base + noise));
}

function getWarning(corr: number, asset1: AssetId, asset2: AssetId): WarningInfo {
  const abs = Math.abs(corr);
  const pct = (corr * 100).toFixed(0);

  if (asset1 === asset2) return { level: "info", text: "Ayni varlik secildi." };
  if (abs >= 0.8) {
    return {
      level: "danger",
      text: `Cok yuksek korelasyon (%${pct}). Cesitlendirme faydasi dusuk kalir.`,
    };
  }
  if (abs >= 0.5) {
    return {
      level: "warning",
      text: `Orta-yuksek korelasyon (%${pct}). Portfoy dengesini dikkatli kurun.`,
    };
  }
  if (abs >= 0.2) {
    return {
      level: "neutral",
      text: `Dusuk-orta korelasyon (%${pct}). Cesitlendirme icin makul kombinasyon.`,
    };
  }
  if (corr < 0) {
    return {
      level: "success",
      text: `Negatif korelasyon (%${pct}). Hedge etkisi olusturabilir.`,
    };
  }
  return {
    level: "success",
    text: `Cok dusuk korelasyon (%${pct}). Guclu cesitlendirme potansiyeli.`,
  };
}

const WARNING_STYLES: Record<WarningLevel, string> = {
  danger: "bg-red-500/10 border-red-500/20 text-red-400",
  warning: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  neutral: "bg-blue-500/10 border-blue-500/20 text-blue-300",
  success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  info: "bg-surface-container-highest border-outline-variant/20 text-on-surface-variant",
};

function corrToColor(corr: number) {
  const abs = Math.abs(corr);
  if (abs >= 0.8) return "text-red-500";
  if (abs >= 0.5) return "text-amber-400";
  if (abs >= 0.2) return "text-blue-400";
  return "text-emerald-400";
}

function corrBarColor(corr: number) {
  const abs = Math.abs(corr);
  if (abs >= 0.8) return "bg-red-500";
  if (abs >= 0.5) return "bg-amber-400";
  if (abs >= 0.2) return "bg-blue-400";
  return "bg-emerald-400";
}

interface AssetSelectProps {
  id: string;
  label: string;
  value: AssetId;
  onChange: (value: AssetId) => void;
}

function AssetSelect({ id, label, value, onChange }: AssetSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as AssetId)}
          className="w-full appearance-none rounded-xl border border-outline-variant/20 bg-surface px-4 py-3 text-sm font-medium text-on-surface transition-all focus:border-secondary/50 focus:outline-none focus:ring-1 focus:ring-secondary/20"
        >
          {ASSETS.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.id} {asset.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function AssetBadge({ asset }: { asset?: Asset }) {
  if (!asset) {
    return null;
  }
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: `${asset.color}15`, color: asset.color }}>
      {asset.id}
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg bg-surface-container-highest px-2 py-2.5">
      <span className="block text-[9px] uppercase tracking-wider text-on-surface-variant/60">{label}</span>
      <span className="mt-0.5 block text-xs font-bold text-on-surface">{value}</span>
      <span className="mt-0.5 block text-[10px] text-on-surface-variant/60">{sub}</span>
    </div>
  );
}

export default function CorrelationTest() {
  const [asset1, setAsset1] = useState<AssetId>("BTC");
  const [asset2, setAsset2] = useState<AssetId>("BIST100");
  const [result, setResult] = useState<ResultState | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = useCallback(() => {
    setLoading(true);
    setResult(null);

    setTimeout(() => {
      const corr = getCorrelation(asset1, asset2);
      setResult({ corr, warning: getWarning(corr, asset1, asset2) });
      setLoading(false);
    }, 900);
  }, [asset1, asset2]);

  const asset1Data = ASSETS.find((asset) => asset.id === asset1);
  const asset2Data = ASSETS.find((asset) => asset.id === asset2);

  return (
    <div className="flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10">
            <span className="material-symbols-outlined text-2xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
              query_stats
            </span>
          </div>
          <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            Korelasyon Carpismasi Testi
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">Iki varlik arasindaki iliskiyi analiz edin</p>
        </div>

        <div className="space-y-5 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-5">
          <div className="grid grid-cols-2 gap-3">
            <AssetSelect id="asset-1" label="1. Varlik" value={asset1} onChange={setAsset1} />
            <AssetSelect id="asset-2" label="2. Varlik" value={asset2} onChange={setAsset2} />
          </div>

          <div className="flex items-center justify-center gap-3 py-1">
            <AssetBadge asset={asset1Data} />
            <span className="material-symbols-outlined text-on-surface-variant/40">swap_horiz</span>
            <AssetBadge asset={asset2Data} />
          </div>

          <button
            onClick={handleCalculate}
            disabled={loading}
            className="w-full rounded-xl bg-secondary py-3.5 text-sm font-bold text-on-secondary transition-all hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Hesaplaniyor..." : "Korelasyonu Hesapla"}
          </button>
        </div>

        {result && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-low">
            <div className="px-5 pb-4 pt-5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Korelasyon Katsayisi
                </span>
                <span className="text-[10px] text-on-surface-variant/60">Son 1 yil</span>
              </div>
              <div className="mt-3 flex items-end gap-2">
                <span className={`font-headline text-5xl font-extrabold tabular-nums ${corrToColor(result.corr)}`}>
                  {result.corr >= 0 ? "+" : ""}
                  {(result.corr * 100).toFixed(1)}
                </span>
                <span className={`mb-1.5 text-lg font-bold opacity-60 ${corrToColor(result.corr)}`}>%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-highest">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${corrBarColor(result.corr)}`}
                  style={{ width: `${Math.abs(result.corr) * 100}%` }}
                />
              </div>
            </div>

            <div className="px-5 pb-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniStat
                  label="Yon"
                  value={result.corr >= 0 ? "Pozitif" : "Negatif"}
                  sub={result.corr >= 0 ? "Ayni yon" : "Ters yon"}
                />
                <MiniStat label="Guc" value={Math.abs(result.corr) >= 0.5 ? "Guclu" : "Zayif"} sub={`|r| = ${Math.abs(result.corr).toFixed(2)}`} />
                <MiniStat
                  label="Cesitlendirme"
                  value={Math.abs(result.corr) >= 0.7 ? "Dusuk" : "Yuksek"}
                  sub={Math.abs(result.corr) >= 0.7 ? "Riskli" : "Ideal"}
                />
              </div>
            </div>

            <div className="border-t border-outline-variant/10 px-5 py-4">
              <div className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${WARNING_STYLES[result.warning.level]}`}>
                {result.warning.text}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
