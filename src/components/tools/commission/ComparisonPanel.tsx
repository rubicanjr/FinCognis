import { parseManualRateInput } from "@/components/tools/commission/constants";
import type { UseCommissionCalculatorResult } from "@/components/tools/commission/useCommissionCalculator";
import { formatMoney, formatPercent } from "@/components/tools/commissionHelpers";

interface ComparisonPanelProps {
  vm: UseCommissionCalculatorResult;
}

export function ComparisonPanel({ vm }: ComparisonPanelProps) {
  const {
    quotes,
    selectedQuote,
    setSelectedBrokerId,
    filteredBrokers,
    manualRateInputs,
    setManualRateInputs,
    comparisonBrokerIds,
    toggleScenarioBroker,
  } = vm;

  return (
    <div className="mt-4 rounded-2xl bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
          6) Kurum Karsilastirmasi ({quotes.length} kurum)
        </p>
        <p className="text-xs text-on-surface-variant">
          Manuel oran girisi ile kurumun size sundugu ozel tarife uygulanir.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-xs">
          <thead>
            <tr className="text-left text-on-surface-variant">
              <th className="px-2 py-2">Kurum</th>
              <th className="px-2 py-2">Tur</th>
              <th className="px-2 py-2">Kademe Orani</th>
              <th className="px-2 py-2">Manuel Oran</th>
              <th className="px-2 py-2">Toplam Maliyet</th>
              <th className="px-2 py-2">Efektif %</th>
              <th className="px-2 py-2">Round-trip Senaryo</th>
              <th className="px-2 py-2">Secim</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr
                key={quote.brokerId}
                className={`border-t border-outline-variant/10 ${
                  selectedQuote?.brokerId === quote.brokerId ? "bg-secondary/5" : ""
                }`}
              >
                <td className="px-2 py-2">
                  <button
                    onClick={() => setSelectedBrokerId(quote.brokerId)}
                    className="font-semibold text-on-surface hover:text-secondary"
                  >
                    {quote.brokerName}
                  </button>
                </td>
                <td className="px-2 py-2 text-on-surface-variant">
                  {filteredBrokers.find((item) => item.id === quote.brokerId)?.institutionType}
                </td>
                <td className="px-2 py-2">{formatPercent(quote.baseRate * 100, 3)}</td>
                <td className="px-2 py-2">
                  <input
                    value={manualRateInputs[quote.brokerId] ?? ""}
                    onChange={(event) =>
                      setManualRateInputs((current) => ({
                        ...current,
                        [quote.brokerId]: parseManualRateInput(event.target.value),
                      }))
                    }
                    placeholder="0,0012"
                    className="w-24 rounded-lg bg-surface-container-high px-2 py-1 text-xs text-on-surface outline-none focus:ring-1 focus:ring-secondary/40"
                  />
                </td>
                <td className="px-2 py-2 font-semibold text-on-surface">{formatMoney(quote.totalCostTry)}</td>
                <td className="px-2 py-2 text-secondary">{formatPercent(quote.effectiveCostPct, 3)}</td>
                <td className="px-2 py-2 text-on-surface-variant">{formatPercent(quote.breakEvenPct, 3)}</td>
                <td className="px-2 py-2">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={comparisonBrokerIds.includes(quote.brokerId)}
                      onChange={() => toggleScenarioBroker(quote.brokerId)}
                    />
                    <span>Senaryo</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
