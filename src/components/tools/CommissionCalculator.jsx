import { useMemo, useState } from "react";
import brokersData from "./brokers.json";

const BSMV_RATE = 0.05;
const BIST_SHARE_RATE = 0.000025;
const TAKASBANK_FEE = 0.02;

const brokerOptions = Array.isArray(brokersData?.brokers)
  ? brokersData.brokers
  : [];

function sanitizeAmountInput(value) {
  return value.replace(/[^0-9,]/g, "");
}

function parseAmount(value) {
  try {
    if (!value) {
      return 0;
    }

    const normalizedValue = value.replace(/\./g, "").replace(",", ".");
    const parsedValue = Number.parseFloat(normalizedValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return 0;
    }

    return parsedValue;
  } catch {
    return 0;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRate(rate) {
  return `%${(rate * 100).toFixed(2)}`;
}

function roundPrice(value) {
  return Math.round(value * 100) / 100;
}

function calculateCommission(amount, broker) {
  try {
    if (!broker || amount <= 0) {
      return null;
    }

    const baseCommission = amount * broker.spotRate;
    const commission =
      broker.minCommission > 0
        ? Math.max(baseCommission, broker.minCommission)
        : baseCommission;

    const isStockBroker = broker.type === "stock";
    const bsmv = isStockBroker && !broker.bsmvIncluded ? commission * BSMV_RATE : 0;
    const bistShare = isStockBroker ? amount * BIST_SHARE_RATE : 0;
    const takasbank = isStockBroker ? TAKASBANK_FEE : 0;
    const totalCost = commission + bsmv + bistShare + takasbank;

    return {
      commission: roundPrice(commission),
      bsmv: roundPrice(bsmv),
      bistShare: roundPrice(bistShare),
      takasbank: roundPrice(takasbank),
      totalCost: roundPrice(totalCost),
      costRate: roundPrice((totalCost / amount) * 100),
    };
  } catch {
    return null;
  }
}

function ResultRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface-container-highest/70 px-4 py-3">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          highlight ? "text-secondary" : "text-on-surface"
        }`}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

export default function CommissionCalculator() {
  const [selectedBrokerName, setSelectedBrokerName] = useState(
    brokerOptions[0]?.name ?? ""
  );
  const [amountInput, setAmountInput] = useState("");

  const selectedBroker = useMemo(
    () => brokerOptions.find((broker) => broker.name === selectedBrokerName) ?? null,
    [selectedBrokerName]
  );

  const amount = useMemo(() => parseAmount(amountInput), [amountInput]);

  const result = useMemo(
    () => calculateCommission(amount, selectedBroker),
    [amount, selectedBroker]
  );

  const handleAmountChange = (event) => {
    setAmountInput(sanitizeAmountInput(event.target.value));
  };

  const brokerTypeLabel =
    selectedBroker?.type === "crypto" ? "Kripto Borsası" : "Aracı Kurum";
  const metaDate = brokersData?._meta?.lastUpdated ?? "2026-04-07";
  const disclaimer =
    brokersData?._meta?.disclaimer ??
    "Oranlar bilgilendirme amaçlıdır. Güncel tarifeler için kurumunuzun resmi kanalını kontrol edin.";

  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="spotlight-bg overflow-hidden rounded-[28px] bg-surface-container-low px-5 py-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] sm:px-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/12 text-secondary">
              <span
                className="material-symbols-outlined text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                payments
              </span>
            </div>
            <div>
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.28em] text-secondary">
                FinCognis Araçları
              </p>
              <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
                Komisyon Hesaplayıcı
              </h1>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="glass-panel rounded-[24px] px-4 py-4 sm:px-5">
              <div className="mb-4">
                <label
                  htmlFor="broker-select"
                  className="mb-2 block font-label text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant"
                >
                  Kurum Seçimi
                </label>
                <div className="relative">
                  <select
                    id="broker-select"
                    value={selectedBrokerName}
                    onChange={(event) => setSelectedBrokerName(event.target.value)}
                    className="w-full appearance-none rounded-2xl bg-surface-container-highest px-4 py-4 pr-12 text-sm font-semibold text-on-surface outline-none transition focus:ring-2 focus:ring-secondary/30"
                  >
                    {brokerOptions.map((broker) => (
                      <option key={broker.name} value={broker.name}>
                        {broker.name}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-xl">expand_more</span>
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="amount-input"
                  className="mb-2 block font-label text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant"
                >
                  İşlem Tutarı
                </label>
                <div className="relative">
                  <input
                    id="amount-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="100.000"
                    value={amountInput}
                    onChange={handleAmountChange}
                    className="w-full rounded-2xl bg-surface-container-highest px-4 py-4 pr-16 text-lg font-bold text-on-surface outline-none transition placeholder:text-on-surface-variant/35 focus:ring-2 focus:ring-secondary/30"
                  />
                  <span className="absolute inset-y-0 right-4 flex items-center text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                    TRY
                  </span>
                </div>
                <p className="mt-2 text-xs text-on-surface-variant">
                  {amount > 0
                    ? `Girilen tutar: ${formatCurrency(amount)}`
                    : "Hesaplama için pozitif bir tutar girin."}
                </p>
              </div>

              {selectedBroker && (
                <div className="rounded-[24px] bg-surface px-4 py-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-headline text-lg font-bold text-on-surface">
                        {selectedBroker.name}
                      </p>
                      <p className="text-xs text-on-surface-variant">{brokerTypeLabel}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                        selectedBroker.type === "crypto"
                          ? "bg-secondary/12 text-secondary"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {selectedBroker.type === "crypto" ? "Kripto" : "Hisse"}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
                        Komisyon Oranı
                      </p>
                      <p className="mt-1 text-xl font-bold text-on-surface">
                        {formatRate(selectedBroker.spotRate)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
                        Minimum Komisyon
                      </p>
                      <p className="mt-1 text-xl font-bold text-on-surface">
                        {selectedBroker.minCommission > 0
                          ? formatCurrency(selectedBroker.minCommission)
                          : "Yok"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-on-surface-variant">
                    {selectedBroker.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="glass-panel rounded-[24px] px-4 py-4 sm:px-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-label text-[11px] font-bold uppercase tracking-[0.22em] text-secondary">
                    Tahmini Sonuç
                  </p>
                  <h2 className="mt-1 font-headline text-xl font-bold text-on-surface">
                    Toplam işlem maliyeti
                  </h2>
                </div>
                <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-semibold text-on-surface-variant">
                  Veri tarihi: {metaDate}
                </span>
              </div>

              {result ? (
                <div className="space-y-3">
                  <div className="rounded-[24px] bg-surface px-4 py-5">
                    <p className="text-sm text-on-surface-variant">Toplam maliyet</p>
                    <p className="mt-2 font-headline text-4xl font-extrabold tracking-tight text-secondary">
                      {formatCurrency(result.totalCost)}
                    </p>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      İşlem tutarının yaklaşık %{result.costRate.toFixed(3)} kadarı
                    </p>
                  </div>

                  <div className="space-y-2">
                    <ResultRow label="Komisyon" value={result.commission} />
                    <ResultRow label="BSMV" value={result.bsmv} />
                    <ResultRow label="BIST payı" value={result.bistShare} />
                    <ResultRow label="Takasbank" value={result.takasbank} />
                    <ResultRow
                      label="Toplam"
                      value={result.totalCost}
                      highlight
                    />
                  </div>

                  <div className="rounded-[24px] bg-surface px-4 py-4 text-sm leading-6 text-on-surface-variant">
                    {selectedBroker?.type === "crypto"
                      ? "Kripto tarafında BIST payı ve Takasbank kalemi uygulanmaz. Toplam maliyet, komisyon ve gerekiyorsa vergi etkisi üzerinden hesaplanır."
                      : "Hisse tarafında komisyonun yanında BSMV, BIST payı ve Takasbank kalemleri de toplam maliyete eklenir."}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[320px] items-center justify-center rounded-[24px] bg-surface px-6 py-8 text-center">
                  <div>
                    <p className="font-headline text-xl font-bold text-on-surface">
                      Sonuç hazır değil
                    </p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      Kurum ve işlem tutarını girdikten sonra tahmini maliyet
                      kırılımını burada göstereceğim.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="px-2 text-center text-xs leading-6 text-on-surface-variant/70">
          {disclaimer}
        </p>
      </div>
    </section>
  );
}
