import { FEE_INFO } from "@/components/tools/commission/constants";
import type { UseCommissionCalculatorResult } from "@/components/tools/commission/useCommissionCalculator";
import { formatMoney, formatPercent } from "@/components/tools/commissionHelpers";
import { CostPie, CostRow } from "@/components/tools/commission/Shared";

interface InsightsPanelProps {
  vm: UseCommissionCalculatorResult;
}

export function InsightsPanel({ vm }: InsightsPanelProps) {
  const { selectedQuote, cheapestThree, worstQuote } = vm;

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
      <div className="rounded-2xl bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            7) Seçilen Kurum Sonuç Detayı
          </p>
          <p className="text-xs text-on-surface-variant">{selectedQuote?.brokerName ?? "-"}</p>
        </div>

        {selectedQuote ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-surface-container-high p-3">
                <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">Toplam Maliyet</p>
                <p className="mt-1 font-headline text-xl font-bold text-on-surface">
                  {formatMoney(selectedQuote.totalCostTry)}
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-high p-3">
                <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">Efektif Maliyet</p>
                <p className="mt-1 font-headline text-xl font-bold text-secondary">
                  {formatPercent(selectedQuote.effectiveCostPct, 3)}
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-high p-3">
                <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">Break-even</p>
                <p className="mt-1 font-headline text-xl font-bold text-on-surface">
                  {formatPercent(selectedQuote.breakEvenPct, 3)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <CostPie breakdown={selectedQuote.breakdown} total={selectedQuote.totalCostTry} />
              <div className="grid gap-2 sm:grid-cols-2">
                <CostRow label="Komisyon" value={selectedQuote.breakdown.commission} tip={FEE_INFO.commission} />
                <CostRow label="BSMV" value={selectedQuote.breakdown.bsmv} tip={FEE_INFO.bsmv} />
                <CostRow label="BIST Payı" value={selectedQuote.breakdown.bistPayi} tip={FEE_INFO.bistPayi} />
                <CostRow label="Takasbank" value={selectedQuote.breakdown.takasbank} tip={FEE_INFO.takasbank} />
                <CostRow label="Spread" value={selectedQuote.breakdown.spread} tip={FEE_INFO.spread} />
                <CostRow label="Swap" value={selectedQuote.breakdown.swap} tip={FEE_INFO.swap} />
                <CostRow label="Döviz Çevrim" value={selectedQuote.breakdown.fxConversion} tip={FEE_INFO.fxConversion} />
                <CostRow label="Stopaj" value={selectedQuote.breakdown.stopaj} tip={FEE_INFO.stopaj} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">Bu seçimde kurum bulunamadı.</p>
        )}
      </div>

      <div className="rounded-2xl bg-surface p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">8) En Ucuz 3 Kurum</p>
        <div className="space-y-2">
          {cheapestThree.map((quote, index) => (
            <div key={quote.brokerId} className="rounded-xl bg-surface-container-high p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-on-surface">
                  {index + 1}. {quote.brokerName}
                </p>
                <p className="text-secondary">{formatMoney(quote.totalCostTry)}</p>
              </div>
              {worstQuote && (
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  En pahalıya göre fark: {formatMoney(worstQuote.totalCostTry - quote.totalCostTry)}
                </p>
              )}
            </div>
          ))}
          {cheapestThree.length === 0 && <p className="text-sm text-on-surface-variant">Sonuc yok.</p>}
        </div>
      </div>
    </div>
  );
}
