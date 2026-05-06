import { useMemo, useState, type ChangeEvent } from "react";
import brokersData from "./brokers.json";

const BSMV_RATE = 0.05;
const BIST_PAYI_RATE = 0.000025;
const TAKASBANK_FEE = 0.02;

interface LegacyBroker {
  name: string;
  type: string;
  spotRate: number;
  minCommission: number;
  bsmvIncluded: boolean;
}

interface LegacyDataset {
  brokers: LegacyBroker[];
}

interface LegacyResult {
  komisyon: number;
  bsmv: number;
  bistPayi: number;
  takasbank: number;
  toplam: number;
}

const legacyDataset = brokersData as LegacyDataset;

function calculateCommission(tutar: number, brokerName: string): LegacyResult | null {
  const broker = legacyDataset.brokers.find((item) => item.name.toLowerCase() === brokerName.toLowerCase());
  if (!broker) {
    return null;
  }

  let komisyon = tutar * broker.spotRate;
  if (broker.minCommission > 0 && komisyon < broker.minCommission) {
    komisyon = broker.minCommission;
  }

  const bsmv = broker.bsmvIncluded ? 0 : komisyon * BSMV_RATE;
  const bistPayi = tutar * BIST_PAYI_RATE;
  const takasbank = TAKASBANK_FEE;
  const toplam = komisyon + bsmv + bistPayi + takasbank;
  const round2 = (value: number) => Math.round(value * 100) / 100;

  return {
    komisyon: round2(komisyon),
    bsmv: round2(bsmv),
    bistPayi: round2(bistPayi),
    takasbank: round2(takasbank),
    toplam: round2(toplam),
  };
}

function formatTL(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ResultRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="group flex items-center justify-between">
      <span className="text-sm text-gray-500 transition-colors group-hover:text-gray-400">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-gray-300">
        {formatTL(value)} <span className="text-xs text-gray-600">TL</span>
      </span>
    </div>
  );
}

export default function LegacyCommissionCalculator() {
  const [tutar, setTutar] = useState("");
  const [broker, setBroker] = useState<string>(legacyDataset.brokers[0]?.name ?? "");

  const result = useMemo(() => {
    const numeric = Number.parseFloat(tutar.replace(/\./g, "").replace(",", "."));
    if (!numeric || numeric <= 0) {
      return null;
    }
    return calculateCommission(numeric, broker);
  }, [broker, tutar]);

  const selectedBroker = legacyDataset.brokers.find((item) => item.name === broker);

  const handleTutarChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTutar(event.target.value.replace(/[^0-9,]/g, ""));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050A14] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Komisyon Hesaplayici</h1>
          <p className="mt-1 text-sm text-gray-500">Islem maliyetinizi aninda hesaplayin</p>
        </div>

        <div className="space-y-5 rounded-2xl border border-white/5 bg-[#0B1120] p-5">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-400">Araci Kurum</label>
            <select
              value={broker}
              onChange={(event) => setBroker(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#050A14] px-4 py-3.5 text-sm font-medium text-white"
            >
              {legacyDataset.brokers.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
            {selectedBroker && (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    selectedBroker.type === "crypto" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
                  }`}
                >
                  {selectedBroker.type === "crypto" ? "Kripto" : "Hisse"}
                </span>
                <span className="text-[11px] text-gray-600">Oran: %{(selectedBroker.spotRate * 100).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-400">Islem Tutari</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={tutar}
              onChange={handleTutarChange}
              className="w-full rounded-xl border border-white/10 bg-[#050A14] px-4 py-3.5 text-lg font-semibold text-white placeholder-gray-700"
            />
          </div>
        </div>

        {result && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/5 bg-[#0B1120]">
            <div className="space-y-3 p-5">
              <ResultRow label="Komisyon" value={result.komisyon} />
              <ResultRow label="BSMV (%5)" value={result.bsmv} />
              <ResultRow label="BIST Payi" value={result.bistPayi} />
              <ResultRow label="Takasbank" value={result.takasbank} />
            </div>
            <div className="border-t border-white/5 bg-[#060D18] px-5 py-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Toplam Maliyet</span>
                <div className="text-right">
                  <span className="text-3xl font-extrabold tracking-tight text-red-500">{formatTL(result.toplam)}</span>
                  <span className="ml-1.5 text-sm font-bold text-red-500/60">TL</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
