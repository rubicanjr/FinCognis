import React, { useState, useMemo } from "react";
import brokersData from "./brokers.json";

const BSMV_RATE = 0.05;
const BIST_PAYI_RATE = 0.000025;
const TAKASBANK_FEE = 0.02;

function calculateCommission(tutar, brokerName) {
  const broker = brokersData.brokers.find(
    (b) => b.name.toLowerCase() === brokerName.toLowerCase()
  );
  if (!broker) return null;

  let komisyon = tutar * broker.spotRate;
  if (broker.minCommission > 0 && komisyon < broker.minCommission) {
    komisyon = broker.minCommission;
  }

  const bsmv = broker.bsmvIncluded ? 0 : komisyon * BSMV_RATE;
  const bistPayı = tutar * BIST_PAYI_RATE;
  const takasbank = TAKASBANK_FEE;
  const toplam = komisyon + bsmv + bistPayı + takasbank;

  const r = (n) => Math.round(n * 100) / 100;
  return {
    komisyon: r(komisyon),
    bsmv: r(bsmv),
    bistPayı: r(bistPayı),
    takasbank: r(takasbank),
    toplam: r(toplam),
  };
}

function formatTL(val) {
  return val.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CommissionCalculator() {
  const [tutar, setTutar] = useState("");
  const [broker, setBroker] = useState(brokersData.brokers[0].name);

  const result = useMemo(() => {
    const num = parseFloat(tutar.replace(/\./g, "").replace(",", "."));
    if (!num || num <= 0) return null;
    return calculateCommission(num, broker);
  }, [tutar, broker]);

  const selectedBroker = brokersData.brokers.find((b) => b.name === broker);

  const handleTutarChange = (e) => {
    const raw = e.target.value.replace(/[^0-9,]/g, "");
    setTutar(raw);
  };

  return (
    <div className="flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/10 mb-4">
            <span
              className="material-symbols-outlined text-secondary text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              payments
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">
            Komisyon Hesaplayıcı
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 font-body">
            İşlem maliyetinizi anında hesaplayın
          </p>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-5 space-y-5">
          <div>
            <label
              htmlFor="broker-select"
              className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider font-label"
            >
              Aracı Kurum
            </label>
            <div className="relative">
              <select
                id="broker-select"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="w-full appearance-none bg-surface border border-outline-variant/20 rounded-xl px-4 py-3.5 text-on-surface text-sm font-medium focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/20 transition-all cursor-pointer"
              >
                {brokersData.brokers.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <span className="material-symbols-outlined text-on-surface-variant text-lg">
                  expand_more
                </span>
              </div>
            </div>
            {selectedBroker && (
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                    selectedBroker.type === "crypto"
                      ? "bg-tertiary/10 text-tertiary"
                      : "bg-secondary/10 text-secondary"
                  }`}
                >
                  {selectedBroker.type === "crypto" ? "Kripto" : "Hisse"}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Oran: %{(selectedBroker.spotRate * 100).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="tutar-input"
              className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider font-label"
            >
              İşlem Tutarı
            </label>
            <div className="relative">
              <input
                id="tutar-input"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={tutar}
                onChange={handleTutarChange}
                className="w-full bg-surface border border-outline-variant/20 rounded-xl px-4 py-3.5 text-on-surface text-lg font-semibold placeholder-outline focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/20 transition-all pr-12"
              />
              <div className="absolute inset-y-0 right-4 flex items-center">
                <span className="text-xs font-bold text-on-surface-variant">TL</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`mt-4 transition-all duration-500 ease-out ${
            result
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          {result && (
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden">
              <div className="p-5 space-y-3">
                <ResultRow label="Komisyon" value={result.komisyon} />
                <ResultRow label="BSMV (%5)" value={result.bsmv} />
                <ResultRow label="BIST Payı" value={result.bistPayı} />
                <ResultRow label="Takasbank" value={result.takasbank} />
              </div>

              <div className="border-t border-outline-variant/10 bg-surface-container-lowest px-5 py-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-on-surface-variant">
                    Toplam Maliyet
                  </span>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-error tracking-tight font-headline">
                      {formatTL(result.toplam)}
                    </span>
                    <span className="text-error/60 text-sm font-bold ml-1.5">
                      TL
                    </span>
                  </div>
                </div>
                {result.toplam > 0 && tutar && (
                  <div className="mt-2 text-right">
                    <span className="text-[11px] text-on-surface-variant">
                      İşlem tutarının %
                      {(
                        (result.toplam /
                          parseFloat(
                            tutar.replace(/\./g, "").replace(",", ".")
                          )) *
                        100
                      ).toFixed(3)}
                      {"'i"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-on-surface-variant/50 mt-6 font-body">
          Oranlar bilgilendirme amaçlıdır. Güncel tarifeler için kurumunuza
          başvurun.
        </p>
      </div>
    </div>
  );
}

function ResultRow({ label, value }) {
  return (
    <div className="flex items-center justify-between group">
      <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
        {label}
      </span>
      <span className="text-sm font-semibold text-on-surface tabular-nums">
        {formatTL(value)}{" "}
        <span className="text-on-surface-variant text-xs">TL</span>
      </span>
    </div>
  );
}
