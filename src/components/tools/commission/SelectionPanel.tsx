import type { UseCommissionCalculatorResult } from "@/components/tools/commission/useCommissionCalculator";
import type { CurrencyCode, InputMode, TransactionType } from "@/components/tools/commission/types";
import { CURRENCIES, INPUT_MODES, TRANSACTION_TYPES } from "@/components/tools/commissionHelpers";

interface SelectionPanelProps {
  vm: UseCommissionCalculatorResult;
}

export function SelectionPanel({ vm }: SelectionPanelProps) {
  const {
    categories,
    selectedCategoryId,
    handleCategoryChange,
    marketsByCategory,
    selectedMarketId,
    setSelectedMarketId,
    transactionType,
    setTransactionType,
    inputMode,
    setInputMode,
    currency,
    setCurrency,
    amountInput,
    setAmountInput,
    quantityInput,
    setQuantityInput,
    priceInput,
    setPriceInput,
    monthlyVolumeInput,
    setMonthlyVolumeInput,
    dailyVolumeInput,
    setDailyVolumeInput,
    usdTryInput,
    setUsdTryInput,
    swapDaysInput,
    setSwapDaysInput,
    spreadRateInput,
    setSpreadRateInput,
    swapRateInput,
    setSwapRateInput,
    fxRateInput,
    setFxRateInput,
    withholdingRateInput,
    setWithholdingRateInput,
    taxableProfitInput,
    setTaxableProfitInput,
    profileName,
    setProfileName,
    promotionsEnabled,
    setPromotionsEnabled,
    saveHistory,
  } = vm;

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl bg-surface p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">1) Kategori Seçimi</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                  selectedCategoryId === category.id
                    ? "border-secondary/40 bg-secondary/15 text-secondary"
                    : "border-outline-variant/15 bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <p className="font-semibold">{category.name}</p>
                <p className="mt-1 text-[11px] opacity-80">{category.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            2) İşlem Parametreleri
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-on-surface-variant">
              Piyasa
              <select
                value={selectedMarketId}
                onChange={(event) => setSelectedMarketId(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              >
                {marketsByCategory.map((market) => (
                  <option key={market.id} value={market.id}>
                    {market.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-on-surface-variant">
              İşlem Tipi
              <select
                value={transactionType}
                onChange={(event) => setTransactionType(event.target.value as TransactionType)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              >
                {TRANSACTION_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-on-surface-variant">
              Giriş Modeli
              <select
                value={inputMode}
                onChange={(event) => setInputMode(event.target.value as InputMode)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              >
                {INPUT_MODES.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-on-surface-variant">
              Para Birimi
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr.id} value={curr.id}>
                    {curr.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 rounded-2xl bg-surface p-4 xl:grid-cols-3">
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">3) İşlem Girişi</p>
          {inputMode === "amount" ? (
            <label className="block text-xs text-on-surface-variant">
              İşlem Tutarı ({currency})
              <input
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-on-surface-variant">
                Adet
                <input
                  value={quantityInput}
                  onChange={(event) => setQuantityInput(event.target.value)}
                  className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                />
              </label>
              <label className="text-xs text-on-surface-variant">
                Fiyat ({currency})
                <input
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
                  className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                />
              </label>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-on-surface-variant">
              Aylık Hacim Profili ({currency})
              <input
                value={monthlyVolumeInput}
                onChange={(event) => setMonthlyVolumeInput(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Günlük Hacim ({currency})
              <input
                value={dailyVolumeInput}
                onChange={(event) => setDailyVolumeInput(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">4) Ek Maliyet Parametreleri</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-on-surface-variant">
              USD/TRY
              <input
                value={usdTryInput}
                onChange={(event) => setUsdTryInput(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Swap Gün
              <input
                value={swapDaysInput}
                onChange={(event) => setSwapDaysInput(event.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Spread Oranı (ondalık)
              <input
                value={spreadRateInput}
                onChange={(event) => setSpreadRateInput(event.target.value)}
                placeholder="0,0008"
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Swap Günlük Oran
              <input
                value={swapRateInput}
                onChange={(event) => setSwapRateInput(event.target.value)}
                placeholder="0,0002"
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Döviz Çevrim Oranı
              <input
                value={fxRateInput}
                onChange={(event) => setFxRateInput(event.target.value)}
                placeholder="0,002"
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
            <label className="text-xs text-on-surface-variant">
              Stopaj Oranı (%)
              <input
                value={withholdingRateInput}
                onChange={(event) => setWithholdingRateInput(event.target.value)}
                placeholder="10"
                className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </label>
          </div>
          <label className="block text-xs text-on-surface-variant">
            Vergiye Tabi Kar Tahmini ({currency})
            <input
              value={taxableProfitInput}
              onChange={(event) => setTaxableProfitInput(event.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </label>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">5) Profil ve Geçmiş</p>
          <label className="block text-xs text-on-surface-variant">
            Hesap Etiketi
            <input
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-on-surface-variant">
            <input
              type="checkbox"
              checked={promotionsEnabled}
              onChange={(event) => setPromotionsEnabled(event.target.checked)}
            />
            Kampanya/promosyon etkisini hesaba kat
          </label>
          <button
            onClick={saveHistory}
            className="w-full rounded-xl bg-secondary px-3 py-2 text-sm font-bold text-on-secondary hover:brightness-110"
          >
            Hesaplamayı Geçmişe Kaydet
          </button>
        </div>
      </div>
    </>
  );
}
