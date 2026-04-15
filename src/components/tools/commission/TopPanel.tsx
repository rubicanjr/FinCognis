import type { UseCommissionCalculatorResult } from "@/components/tools/commission/useCommissionCalculator";
import { formatMoney } from "@/components/tools/commissionHelpers";
import { HandCoins } from "lucide-react";

interface TopPanelProps {
  vm: UseCommissionCalculatorResult;
}

export function TopPanel({ vm }: TopPanelProps) {
  const {
    handleShare,
    exportPdf,
    exportExcel,
    refreshLiveRates,
    shareStatus,
    liveStatus,
    notional,
    currency,
    quotes,
  } = vm;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
          <HandCoins className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <div className="min-w-[230px]">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.24em] text-secondary">
            FinCognis Master Aracı
          </p>
          <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
            Komisyon Hesaplayıcı ve Karşılaştırma Motoru
          </h2>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={handleShare}
            className="rounded-xl bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-high"
          >
            Sonucu Paylaş
          </button>
          <button
            onClick={exportPdf}
            className="rounded-xl bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-high"
          >
            PDF Export
          </button>
          <button
            onClick={exportExcel}
            className="rounded-xl bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-high"
          >
            Excel Export
          </button>
          <button
            onClick={refreshLiveRates}
            className="rounded-xl bg-secondary/15 px-4 py-2 text-xs font-bold text-secondary hover:bg-secondary/20"
          >
            API ile Kur/Spread Güncelle
          </button>
        </div>
      </div>

      {shareStatus && (
        <div className="mb-3 rounded-xl bg-surface px-4 py-2 text-xs text-on-surface-variant">{shareStatus}</div>
      )}
      {liveStatus && (
        <div className="mb-3 rounded-xl bg-surface px-4 py-2 text-xs text-on-surface-variant">{liveStatus}</div>
      )}

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">İşlem Büyüklüğü</p>
          <p className="mt-1 font-headline text-xl font-bold text-on-surface">{formatMoney(notional, currency)}</p>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">Karşılaştırılan Kurum</p>
          <p className="mt-1 font-headline text-xl font-bold text-on-surface">{quotes.length}</p>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">En Ucuz Kurum</p>
          <p className="mt-1 text-sm font-bold text-secondary">{quotes[0]?.brokerName ?? "-"}</p>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">Maliyet Aralığı</p>
          <p className="mt-1 text-sm font-bold text-on-surface">
            {quotes.length > 1
              ? `${formatMoney(quotes[0].totalCostTry)} - ${formatMoney(quotes[quotes.length - 1].totalCostTry)}`
              : "-"}
          </p>
        </div>
      </div>
    </>
  );
}
