import type { UseCommissionCalculatorResult } from "@/components/tools/commission/useCommissionCalculator";
import { formatCompactNumber, formatMoney, formatPercent, toInputValue } from "@/components/tools/commissionHelpers";

interface SupportPanelProps {
  vm: UseCommissionCalculatorResult;
}

export function SupportPanel({ vm }: SupportPanelProps) {
  const {
    historyItems,
    deleteHistoryItem,
    feedbackMessage,
    setFeedbackMessage,
    submitFeedback,
    communityInstitution,
    setCommunityInstitution,
    communityRateInput,
    setCommunityRateInput,
    communityNote,
    setCommunityNote,
    submitCommunityRateReport,
    communityReports,
    showAdminPanel,
    setShowAdminPanel,
    exportBrokerJson,
    importBrokerJson,
    parseBistPdf,
    filteredBrokers,
    updateFirstTierRate,
    adminStatus,
    dataset,
    selectedCategory,
    selectedMarket,
  } = vm;

  return (
    <>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-surface p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">12) Hesaplama Gecmisi</p>
          <div className="max-h-56 space-y-2 overflow-auto pr-1">
            {historyItems.map((item) => (
              <div key={item.id} className="rounded-xl bg-surface-container-high p-3 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-on-surface">{item.broker}</p>
                  <button onClick={() => deleteHistoryItem(item.id)} className="text-[11px] text-error">
                    Sil
                  </button>
                </div>
                <p className="mt-1 text-on-surface-variant">
                  {item.category} / {item.market}
                </p>
                <p className="mt-1 text-on-surface">
                  {formatMoney(item.totalCostTry)} ({formatPercent(item.effectiveCostPct, 3)})
                </p>
              </div>
            ))}
            {historyItems.length === 0 && <p className="text-sm text-on-surface-variant">Kayitli gecmis yok.</p>}
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            13) Geri Bildirim ve Oran Bildirimi
          </p>
          <label className="block text-xs text-on-surface-variant">
            Geri Bildirim
            <textarea
              value={feedbackMessage}
              onChange={(event) => setFeedbackMessage(event.target.value)}
              className="mt-1 h-20 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </label>
          <button onClick={submitFeedback} className="mt-2 rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-on-secondary">
            Feedback Gonder
          </button>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <input
              value={communityInstitution}
              onChange={(event) => setCommunityInstitution(event.target.value)}
              placeholder="Kurum adi"
              className="rounded-xl bg-surface-container-high px-3 py-2 text-xs text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
            />
            <input
              value={communityRateInput}
              onChange={(event) => setCommunityRateInput(event.target.value)}
              placeholder="Yeni oran (0,0012)"
              className="rounded-xl bg-surface-container-high px-3 py-2 text-xs text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </div>
          <textarea
            value={communityNote}
            onChange={(event) => setCommunityNote(event.target.value)}
            placeholder="Not"
            className="mt-2 h-16 w-full rounded-xl bg-surface-container-high px-3 py-2 text-xs text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
          />
          <button
            onClick={submitCommunityRateReport}
            className="mt-2 rounded-xl bg-surface-container-high px-3 py-2 text-xs font-bold text-on-surface"
          >
            "Bu kurumun orani degisti" bildir
          </button>
          <p className="mt-2 text-[11px] text-on-surface-variant">Toplam bildirim: {communityReports.length}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-surface p-4">
        <button
          onClick={() => setShowAdminPanel((current) => !current)}
          className="rounded-xl border border-outline-variant/20 px-3 py-2 text-xs font-bold text-on-surface"
        >
          {showAdminPanel ? "Admin Panelini Gizle" : "Admin Paneli (Tarife Yonetimi)"}
        </button>

        {showAdminPanel && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportBrokerJson}
                className="rounded-xl bg-surface-container-high px-3 py-2 text-xs font-bold text-on-surface"
              >
                Broker JSON Disa Aktar
              </button>
              <label className="cursor-pointer rounded-xl bg-surface-container-high px-3 py-2 text-xs font-bold text-on-surface">
                Broker JSON Ice Aktar
                <input type="file" accept=".json" onChange={importBrokerJson} className="hidden" />
              </label>
              <label className="cursor-pointer rounded-xl bg-surface-container-high px-3 py-2 text-xs font-bold text-on-surface">
                BIST PDF Parse
                <input type="file" accept=".pdf" onChange={parseBistPdf} className="hidden" />
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr className="text-left text-on-surface-variant">
                    <th className="px-2 py-2">Kurum</th>
                    <th className="px-2 py-2">Ilk Kademe Orani</th>
                    <th className="px-2 py-2">Min Komisyon</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBrokers.map((broker) => (
                    <tr key={broker.id} className="border-t border-outline-variant/10">
                      <td className="px-2 py-2 text-on-surface">{broker.name}</td>
                      <td className="px-2 py-2">
                        <input
                          defaultValue={toInputValue(broker.commissionModel.tiers[0]?.rate ?? 0, 5)}
                          onBlur={(event) => updateFirstTierRate(broker.id, event.target.value)}
                          className="w-28 rounded-lg bg-surface-container-high px-2 py-1 text-xs text-on-surface outline-none focus:ring-1 focus:ring-secondary/40"
                        />
                      </td>
                      <td className="px-2 py-2 text-on-surface-variant">
                        {formatMoney(broker.commissionModel.minCommission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {adminStatus && <p className="text-xs text-on-surface-variant">{adminStatus}</p>}
          </div>
        )}
      </div>

      <p className="px-2 text-center text-[11px] leading-6 text-on-surface-variant/70">
        {dataset._meta?.disclaimer} Son guncelleme: {dataset._meta?.lastUpdated}. Kategori: {selectedCategory?.name}
        . Piyasa: {selectedMarket?.name}. Aktif kurum: {formatCompactNumber(filteredBrokers.length)}.
      </p>
    </>
  );
}
