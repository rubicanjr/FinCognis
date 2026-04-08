"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
import {
  CRISIS_LIBRARY,
  DEFAULT_WEIGHTS,
  SCENARIO_SET,
  STRESS_ASSETS,
} from "@/components/tools/stress/data";
import { runStressAnalysis } from "@/components/tools/stress/engine";
import StressResults from "@/components/tools/stress/StressResults";
import type { PortfolioInput, StressAssetClass } from "@/components/tools/stress/types";

interface DraftState {
  portfolioValue: string;
  selectedCrisisId: string;
  scenarioSeverity: PortfolioInput["scenarioSeverity"];
  withdrawalRatePct: string;
  macroShock: {
    rateShockPct: string;
    inflationShockPct: string;
    btcShockPct: string;
    dxyStable: boolean;
  };
  weights: Record<string, string>;
}

const DEFAULT_PORTFOLIO_VALUE = 1_000_000;
const DEFAULT_WITHDRAWAL = 4;

function parseNumeric(value: string, fallback = 0) {
  const normalized = value.replace(",", ".").replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrencyInput(value: number) {
  return Number(value).toLocaleString("tr-TR");
}

function classLabel(assetClass: StressAssetClass) {
  if (assetClass === "crypto") return "Kripto";
  if (assetClass === "turkish_equity") return "TR Hisse";
  if (assetClass === "us_equity") return "ABD Hisse";
  if (assetClass === "commodity") return "Emtia";
  if (assetClass === "bond") return "Tahvil";
  return "Doviz";
}

function createWeightDraft() {
  return STRESS_ASSETS.reduce<Record<string, string>>((acc, asset) => {
    const defaultWeight = DEFAULT_WEIGHTS[asset.id] ?? 0;
    acc[asset.id] = defaultWeight > 0 ? (defaultWeight * 100).toFixed(2) : "0";
    return acc;
  }, {});
}

function createDefaultDraft(): DraftState {
  return {
    portfolioValue: formatCurrencyInput(DEFAULT_PORTFOLIO_VALUE),
    selectedCrisisId: CRISIS_LIBRARY[0]?.id ?? "gfc_2008",
    scenarioSeverity: "medium",
    withdrawalRatePct: String(DEFAULT_WITHDRAWAL),
    macroShock: {
      rateShockPct: "0",
      inflationShockPct: "0",
      btcShockPct: "0",
      dxyStable: true,
    },
    weights: createWeightDraft(),
  };
}

function buildInputFromDraft(draft: DraftState): PortfolioInput {
  const portfolioValue = Math.max(parseNumeric(draft.portfolioValue, DEFAULT_PORTFOLIO_VALUE), 1_000);
  const weights = Object.entries(draft.weights).reduce<Record<string, number>>((acc, [assetId, value]) => {
    const pct = Math.max(parseNumeric(value, 0), 0);
    acc[assetId] = pct / 100;
    return acc;
  }, {});

  return {
    portfolioValue,
    weights,
    selectedCrisisId: draft.selectedCrisisId,
    scenarioSeverity: draft.scenarioSeverity,
    macroShock: {
      rateShockPct: parseNumeric(draft.macroShock.rateShockPct, 0),
      inflationShockPct: parseNumeric(draft.macroShock.inflationShockPct, 0),
      dxyStable: draft.macroShock.dxyStable,
      btcShockPct: parseNumeric(draft.macroShock.btcShockPct, 0),
    },
    withdrawalRatePct: Math.max(parseNumeric(draft.withdrawalRatePct, DEFAULT_WITHDRAWAL), 0),
  };
}

function weightTotal(weights: Record<string, string>) {
  return Object.values(weights).reduce((acc, value) => acc + Math.max(parseNumeric(value, 0), 0), 0);
}

export default function StressTest() {
  const [draft, setDraft] = useState<DraftState>(() => createDefaultDraft());
  const [analysisInput, setAnalysisInput] = useState<PortfolioInput>(() => buildInputFromDraft(createDefaultDraft()));
  const deferredInput = useDeferredValue(analysisInput);
  const analysis = useMemo(() => runStressAnalysis(deferredInput), [deferredInput]);

  const totalWeight = useMemo(() => weightTotal(draft.weights), [draft.weights]);

  const runSimulation = () => {
    startTransition(() => {
      setAnalysisInput(buildInputFromDraft(draft));
    });
  };

  const resetDefaults = () => {
    const defaults = createDefaultDraft();
    startTransition(() => {
      setDraft(defaults);
      setAnalysisInput(buildInputFromDraft(defaults));
    });
  };

  const setEqualWeights = () => {
    const eachWeight = (100 / STRESS_ASSETS.length).toFixed(2);
    setDraft((current) => ({
      ...current,
      weights: STRESS_ASSETS.reduce<Record<string, string>>((acc, asset) => {
        acc[asset.id] = eachWeight;
        return acc;
      }, {}),
    }));
  };

  const applyMacroPreset = (preset: "policy_tightening" | "btc_crash" | "inflation_spike") => {
    setDraft((current) => {
      if (preset === "policy_tightening") {
        return {
          ...current,
          macroShock: {
            ...current.macroShock,
            rateShockPct: "3",
            inflationShockPct: "4",
          },
        };
      }
      if (preset === "btc_crash") {
        return {
          ...current,
          macroShock: {
            ...current.macroShock,
            dxyStable: true,
            btcShockPct: "-40",
          },
        };
      }
      return {
        ...current,
        macroShock: {
          ...current.macroShock,
          rateShockPct: "1",
          inflationShockPct: "10",
          dxyStable: false,
        },
      };
    });
  };

  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-[28px] bg-surface-container-low p-5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] sm:p-6">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                shield
              </span>
            </div>
            <div className="min-w-[230px]">
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.24em] text-secondary">FinCognis Risk Lab</p>
              <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
                Portfoy Stres Simulasyonu
              </h2>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">1) Ana Parametreler</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-on-surface-variant sm:col-span-2">
                  Portfoy Degeri (TL)
                  <input
                    type="text"
                    inputMode="numeric"
                    value={draft.portfolioValue}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        portfolioValue: event.target.value.replace(/[^0-9.,]/g, ""),
                      }))
                    }
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface"
                  />
                </label>

                <label className="text-xs text-on-surface-variant">
                  Kriz senaryosu
                  <select
                    value={draft.selectedCrisisId}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        selectedCrisisId: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface"
                  >
                    {CRISIS_LIBRARY.map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs text-on-surface-variant">
                  Yillik cekim orani (%)
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={draft.withdrawalRatePct}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        withdrawalRatePct: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface"
                  />
                </label>

                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs text-on-surface-variant">Sok seviyesi</p>
                  <div className="grid grid-cols-3 gap-2">
                    {SCENARIO_SET.map((scenario) => (
                      <button
                        key={scenario.id}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            scenarioSeverity: scenario.id,
                          }))
                        }
                        className={`rounded-lg px-2 py-2 text-xs font-semibold ${
                          draft.scenarioSeverity === scenario.id
                            ? "bg-secondary/20 text-secondary"
                            : "bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        {scenario.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">2) Hipotetik Makro Soklar</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-on-surface-variant">
                  Faiz degisimi (%)
                  <input
                    type="number"
                    step="0.5"
                    value={draft.macroShock.rateShockPct}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        macroShock: { ...current.macroShock, rateShockPct: event.target.value },
                      }))
                    }
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Enflasyon degisimi (%)
                  <input
                    type="number"
                    step="0.5"
                    value={draft.macroShock.inflationShockPct}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        macroShock: { ...current.macroShock, inflationShockPct: event.target.value },
                      }))
                    }
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  BTC sok (%)
                  <input
                    type="number"
                    step="1"
                    value={draft.macroShock.btcShockPct}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        macroShock: { ...current.macroShock, btcShockPct: event.target.value },
                      }))
                    }
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface"
                  />
                </label>
                <label className="flex items-end gap-2 text-sm text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={draft.macroShock.dxyStable}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        macroShock: { ...current.macroShock, dxyStable: event.target.checked },
                      }))
                    }
                  />
                  DXY sabit varsay
                </label>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button
                  onClick={() => applyMacroPreset("policy_tightening")}
                  className="rounded-lg bg-surface-container-high px-2 py-2 text-xs font-semibold text-on-surface-variant"
                >
                  Faiz +3%
                </button>
                <button
                  onClick={() => applyMacroPreset("btc_crash")}
                  className="rounded-lg bg-surface-container-high px-2 py-2 text-xs font-semibold text-on-surface-variant"
                >
                  BTC -40%
                </button>
                <button
                  onClick={() => applyMacroPreset("inflation_spike")}
                  className="rounded-lg bg-surface-container-high px-2 py-2 text-xs font-semibold text-on-surface-variant"
                >
                  Enflasyon Soku
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">3) Coklu Varlik Agirliklari</p>
              <button
                onClick={setEqualWeights}
                className="rounded-lg bg-surface-container-high px-3 py-1.5 text-[11px] font-semibold text-on-surface-variant"
              >
                Esit Agirlik
              </button>
              <button
                onClick={resetDefaults}
                className="rounded-lg bg-surface-container-high px-3 py-1.5 text-[11px] font-semibold text-on-surface-variant"
              >
                Varsayilan
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {STRESS_ASSETS.map((asset) => (
                <div key={asset.id} className="rounded-xl bg-surface-container-high p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-on-surface">{asset.ticker}</p>
                    <p className="text-[11px] text-on-surface-variant">{classLabel(asset.assetClass)}</p>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-on-surface-variant">{asset.name}</p>
                  <label className="mt-2 block text-[11px] text-on-surface-variant">
                    Agirlik (%)
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={draft.weights[asset.id] ?? "0"}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          weights: {
                            ...current.weights,
                            [asset.id]: event.target.value,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg bg-surface px-2 py-1.5 text-sm text-on-surface"
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-on-surface-variant">Toplam agirlik: %{totalWeight.toFixed(2)}</span>
              {Math.abs(totalWeight - 100) > 0.5 && (
                <span className="rounded-md bg-amber-500/15 px-2 py-1 text-amber-300">
                  Not: Motor agirliklari otomatik normalize eder.
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={runSimulation}
              className="rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-on-secondary transition hover:brightness-110"
            >
              Stres Analizini Calistir
            </button>
            <p className="text-xs text-on-surface-variant">
              DCC-GARCH, multivariate t-Copula, Monte Carlo, Kupiec ve phase-shuffled testleri birlikte calisir.
            </p>
          </div>
        </div>

        <StressResults analysis={analysis} portfolioValue={deferredInput.portfolioValue} />
      </div>
    </section>
  );
}

