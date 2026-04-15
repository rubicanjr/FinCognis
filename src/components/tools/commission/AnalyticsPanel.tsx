import type { UseCommissionCalculatorResult } from "@/components/tools/commission/useCommissionCalculator";
import { formatMoney, formatPercent } from "@/components/tools/commissionHelpers";
import { ScenarioRow } from "@/components/tools/commission/Shared";

interface AnalyticsPanelProps {
  vm: UseCommissionCalculatorResult;
}

export function AnalyticsPanel({ vm }: AnalyticsPanelProps) {
  const {
    currency,
    roundTripQuantityInput,
    setRoundTripQuantityInput,
    roundTripEntryPriceInput,
    setRoundTripEntryPriceInput,
    roundTripTargetPriceInput,
    setRoundTripTargetPriceInput,
    roundTripHoldingDaysInput,
    setRoundTripHoldingDaysInput,
    simulation,
    monthlyTradeCountInput,
    setMonthlyTradeCountInput,
    projectionYearsInput,
    setProjectionYearsInput,
    annualReturnInput,
    setAnnualReturnInput,
    btcGrowthInput,
    setBtcGrowthInput,
    projection,
    annualScenarioRows,
    scenarioMin,
  } = vm;

  return (
    <>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-surface p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            9) Round-trip Kar/Zarar Simülasyonu
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-on-surface-variant">
              Adet
              <input
                value={roundTripQuantityInput}
                onChange={(event) => setRoundTripQuantityInput(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Alış Fiyatı ({currency})
              <input
                value={roundTripEntryPriceInput}
                onChange={(event) => setRoundTripEntryPriceInput(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Hedef Satış Fiyatı ({currency})
              <input
                value={roundTripTargetPriceInput}
                onChange={(event) => setRoundTripTargetPriceInput(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Elde Tutma Günü
              <input
                value={roundTripHoldingDaysInput}
                onChange={(event) => setRoundTripHoldingDaysInput(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
          </div>
          {simulation ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <ScenarioRow label="Brut Kar/Zarar" value={formatMoney(simulation.grossProfitTry)} />
              <ScenarioRow label="Toplam Maliyet" value={formatMoney(simulation.totalCostsTry)} />
              <ScenarioRow label="Net Sonuc" value={formatMoney(simulation.netProfitTry)} />
              <ScenarioRow label="Net Getiri" value={formatPercent(simulation.netReturnPct, 3)} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-on-surface-variant">Simülasyon için adet ve fiyat alanlarını doldurun.</p>
          )}
        </div>

        <div className="rounded-2xl bg-surface p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            10) Uzun Vadeli Etki ve "Tasarruf Etseydin"
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-on-surface-variant">
              Aylık İşlem Adedi
              <input
                value={monthlyTradeCountInput}
                onChange={(event) => setMonthlyTradeCountInput(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Projeksiyon Süresi (yıl)
              <input
                value={projectionYearsInput}
                onChange={(event) => setProjectionYearsInput(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Alternatif Yıllık Getiri (%)
              <input
                value={annualReturnInput}
                onChange={(event) => setAnnualReturnInput(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              BTC Yıllık Büyüme Varsayımı (%)
              <input
                value={btcGrowthInput}
                onChange={(event) => setBtcGrowthInput(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
          </div>
          {projection ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <ScenarioRow label="Yıllık Maliyet" value={formatMoney(projection.annualCost)} />
              <ScenarioRow label="Toplam Nominal Maliyet" value={formatMoney(projection.totalNominalCost)} />
              <ScenarioRow label="Bileşik Etki" value={formatMoney(projection.compoundFutureValue)} />
              <ScenarioRow label="BTC'de Olsaydı" value={formatMoney(projection.btcFutureValue)} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-on-surface-variant">Hesaplama için önce kurum seçin.</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-surface p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
          11) Senaryo Karşılaştırması (Maks 3 Kurum)
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {annualScenarioRows.map((row) => (
            <div key={row.quote.brokerId} className="rounded-xl bg-surface-container-high p-3">
              <p className="font-semibold text-on-surface">{row.quote.brokerName}</p>
              <p className="mt-1 text-sm text-secondary">{formatMoney(row.annualCost)}</p>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                En iyiye fark: {formatMoney(row.annualCost - scenarioMin)}
              </p>
            </div>
          ))}
          {annualScenarioRows.length === 0 && (
            <p className="text-sm text-on-surface-variant">Karşılaştırma için tablodan en az bir kurum seçin.</p>
          )}
        </div>
      </div>
    </>
  );
}
