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
    <div className="min-h-screen bg-[#050A14] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00C896]/10 mb-4">
            <svg
              className="w-7 h-7 text-[#00C896]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Komisyon Hesaplayıcı
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            İşlem maliyetinizi anında hesaplayın
          </p>
        </div>

        <div className="bg-[#0B1120] border border-white/5 rounded-2xl p-5 space-y-5">
          <div>
            <label
              htmlFor="broker-select"
              className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider"
            >
              Aracı Kurum
            </label>
            <div className="relative">
              <select
                id="broker-select"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="w-full appearance-none bg-[#050A14] border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm font-medium focus:outline-none focus:border-[#00C896]/50 focus:ring-1 focus:ring-[#00C896]/20 transition-all cursor-pointer"
              >
                {brokersData.brokers.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </div>
            </div>
            {selectedBroker && (
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                    selectedBroker.type === "crypto"
                      ? "bg-purple-500/10 text-purple-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}
                >
                  {selectedBroker.type === "crypto" ? "Kripto" : "Hisse"}
                </span>
                <span className="text-[11px] text-gray-600">
                  Oran: %{(selectedBroker.spotRate * 100).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="tutar-input"
              className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider"
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
                className="w-full bg-[#050A14] border border-white/10 rounded-xl px-4 py-3.5 text-white text-lg font-semibold placeholder-gray-700 focus:outline-none focus:border-[#00C896]/50 focus:ring-1 focus:ring-[#00C896]/20 transition-all pr-12"
              />
              <div className="absolute inset-y-0 right-4 flex items-center">
                <span className="text-xs font-bold text-gray-600">TL</span>
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
            <div className="bg-[#0B1120] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-5 space-y-3">
                <ResultRow label="Komisyon" value={result.komisyon} />
                <ResultRow label="BSMV (%5)" value={result.bsmv} />
                <ResultRow label="BIST Payı" value={result.bistPayı} />
                <ResultRow label="Takasbank" value={result.takasbank} />
              </div>

              <div className="border-t border-white/5 bg-[#060D18] px-5 py-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-400">
                    Toplam Maliyet
                  </span>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-red-500 tracking-tight">
                      {formatTL(result.toplam)}
                    </span>
                    <span className="text-red-500/60 text-sm font-bold ml-1.5">
                      TL
                    </span>
                  </div>
                </div>
                {result.toplam > 0 && tutar && (
                  <div className="mt-2 text-right">
                    <span className="text-[11px] text-gray-600">
                      İşlem tutarının %
                      {(
                        (result.toplam /
                          parseFloat(
                            tutar.replace(/\./g, "").replace(",", ".")
                          )) *
                        100
                      ).toFixed(3)}
                      'i
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-gray-700 mt-6">
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
      <span className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
        {label}
      </span>
      <span className="text-sm font-semibold text-gray-300 tabular-nums">
        {formatTL(value)}{" "}
        <span className="text-gray-600 text-xs">TL</span>
      </span>
    </div>
  );
}
