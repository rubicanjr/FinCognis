"use client";

import { useCallback, useMemo, useState } from "react";

interface Asset {
  id: string;
  label: string;
  icon: string;
  color: string;
  beta: number;
}

interface Scenario {
  id: string;
  year: number;
  label: string;
  description: string;
  baseDrawdown: number;
  icon: string;
  duration: string;
  recovery: string;
}

interface StressResult {
  scenario: Scenario;
  dropPct: number;
  lossTL: number;
}

const ASSETS: Asset[] = [
  { id: "BTC", label: "Bitcoin", icon: "BTC", color: "#F7931A", beta: 2 },
  { id: "ETH", label: "Ethereum", icon: "ETH", color: "#627EEA", beta: 2.5 },
  { id: "BIST100", label: "BIST 100", icon: "BIST", color: "#E31E24", beta: 1 },
  { id: "THYAO", label: "Turk Hava Yollari", icon: "THY", color: "#C8102E", beta: 1.3 },
  { id: "ALTIN", label: "Altin (ONS)", icon: "XAU", color: "#FFD700", beta: -0.15 },
  { id: "USD", label: "Dolar (USD/TRY)", icon: "USD", color: "#85BB65", beta: -0.4 },
];

const SCENARIOS: Scenario[] = [
  {
    id: "2008",
    year: 2008,
    label: "Kuresel Finans Krizi",
    description: "Mortgage kaynakli likidite daralmasi ve sert piyasa dususu.",
    baseDrawdown: -0.55,
    icon: "2008",
    duration: "18 ay",
    recovery: "~4 yil",
  },
  {
    id: "2020",
    year: 2020,
    label: "COVID-19 Cokusu",
    description: "Pandemi soku ve global kapanmalarla hizli satis dalgasi.",
    baseDrawdown: -0.34,
    icon: "2020",
    duration: "33 gun",
    recovery: "~5 ay",
  },
  {
    id: "2022",
    year: 2022,
    label: "Faiz ve Kripto Krizi",
    description: "Agresif faiz artislari ve kripto piyasasindaki iflas zinciri.",
    baseDrawdown: -0.28,
    icon: "2022",
    duration: "10 ay",
    recovery: "~18 ay",
  },
];

function formatFullTL(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function simulateStress(portfolioAmount: number, asset: Asset): StressResult[] {
  return SCENARIOS.map((scenario) => {
    const rawDrop = scenario.baseDrawdown * asset.beta;
    const dropPct = Math.max(-0.95, Math.min(0.6, rawDrop));
    return {
      scenario,
      dropPct,
      lossTL: portfolioAmount * dropPct,
    };
  });
}

function FooterStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[9px] uppercase tracking-wider text-on-surface-variant/60">{label}</span>
      <span className="mt-0.5 block text-[11px] font-bold text-on-surface-variant">{value}</span>
    </div>
  );
}

export default function StressTest() {
  const [portfolio, setPortfolio] = useState("");
  const [assetId, setAssetId] = useState("BTC");
  const [results, setResults] = useState<StressResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedAsset = useMemo(() => ASSETS.find((asset) => asset.id === assetId), [assetId]);
  const parsedAmount = Number.parseFloat(portfolio.replace(/[^0-9.]/g, "")) || 0;

  const handleSimulate = useCallback(() => {
    if (!selectedAsset || parsedAmount <= 0) {
      return;
    }
    setLoading(true);
    setResults(null);

    setTimeout(() => {
      setResults(simulateStress(parsedAmount, selectedAsset));
      setLoading(false);
    }, 900);
  }, [parsedAmount, selectedAsset]);

  const worstCase = results
    ? results.reduce((worst, current) => (current.dropPct < worst.dropPct ? current : worst), results[0])
    : null;

  return (
    <div className="flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10">
            <span className="material-symbols-outlined text-2xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield
            </span>
          </div>
          <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">Portfoy Stres Simulatoru</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Kriz senaryolarinda portfoyunuzu test edin</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-5">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Portfoy Tutari (TL)
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="100.000"
              value={portfolio}
              onChange={(event) => {
                const raw = event.target.value.replace(/[^0-9]/g, "");
                if (!raw) {
                  setPortfolio("");
                  return;
                }
                setPortfolio(Number(raw).toLocaleString("tr-TR"));
              }}
              className="w-full rounded-xl border border-outline-variant/20 bg-surface px-4 py-3 text-sm font-medium text-on-surface transition-all focus:border-secondary/50 focus:outline-none focus:ring-1 focus:ring-secondary/20"
            />
            {parsedAmount > 0 && <p className="mt-1 text-[10px] text-on-surface-variant/60">{formatFullTL(parsedAmount)}</p>}
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Varlik Secimi
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ASSETS.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setAssetId(asset.id)}
                  className={`rounded-xl border px-2 py-3 text-xs font-semibold transition-all ${
                    assetId === asset.id
                      ? "border-secondary/40 bg-secondary/5 text-secondary"
                      : "border-outline-variant/10 bg-surface text-on-surface-variant"
                  }`}
                >
                  {asset.id}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSimulate}
            disabled={loading || parsedAmount <= 0}
            className="w-full rounded-xl bg-secondary py-3.5 text-sm font-bold text-on-secondary transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Simulasyon Calisiyor..." : "Stres Testi Baslat"}
          </button>
        </div>

        {results && (
          <div className="mt-4 space-y-3">
            {worstCase && (
              <div className="rounded-2xl border border-red-500/10 bg-red-500/5 px-5 py-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">En Kotu Senaryo</span>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <span className="block text-xs text-on-surface-variant">
                      {worstCase.scenario.year} - {worstCase.scenario.label}
                    </span>
                    <span className="mt-1 block font-headline text-2xl font-extrabold text-red-400">
                      {(worstCase.dropPct * 100).toFixed(1)}%
                    </span>
                  </div>
                  <span className="font-headline text-lg font-bold text-red-400">
                    {formatFullTL(Math.abs(worstCase.lossTL))}
                  </span>
                </div>
              </div>
            )}

            {results.map((result) => (
              <div key={result.scenario.id} className="overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-low">
                <div className="flex items-start justify-between px-5 pb-3 pt-4">
                  <div>
                    <span className="block font-headline text-sm font-bold text-on-surface">{result.scenario.year}</span>
                    <span className="block text-[11px] text-on-surface-variant">{result.scenario.label}</span>
                  </div>
                  <span className="text-sm font-bold text-on-surface">{(result.dropPct * 100).toFixed(1)}%</span>
                </div>

                <div className="px-5 pb-3">
                  <p className="text-[11px] leading-relaxed text-on-surface-variant/70">{result.scenario.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 px-5 pb-3">
                  <div className="rounded-xl bg-surface-container-highest p-3">
                    <span className="block text-[9px] uppercase tracking-wider text-on-surface-variant/60">Tahmini Kayip</span>
                    <span className="mt-1 block font-headline text-lg font-extrabold text-on-surface">
                      {formatFullTL(Math.abs(result.lossTL))}
                    </span>
                  </div>
                  <div className="rounded-xl bg-surface-container-highest p-3">
                    <span className="block text-[9px] uppercase tracking-wider text-on-surface-variant/60">Kalan Portfoy</span>
                    <span className="mt-1 block font-headline text-lg font-extrabold text-on-surface">
                      {formatFullTL(parsedAmount + result.lossTL)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-outline-variant/10 px-5 py-3 text-center">
                  <FooterStat label="Piyasa Dususu" value={`${(result.scenario.baseDrawdown * 100).toFixed(0)}%`} />
                  <FooterStat label="Kriz Suresi" value={result.scenario.duration} />
                  <FooterStat label="Toparlanma" value={result.scenario.recovery} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
