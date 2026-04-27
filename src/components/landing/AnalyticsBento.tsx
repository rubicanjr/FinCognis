import Image from "next/image";
import { Gauge, LineChart, Radar } from "lucide-react";

export default function AnalyticsBento() {
  return (
    <section id="analytics" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-16 text-left">
        <p className="mb-4 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">FinCognis Araçları</p>
        <h2 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
          Kararı hızlandıran 3 çekirdek araç.
        </h2>
      </div>

      <div className="grid h-auto grid-cols-1 gap-6 md:h-[600px] md:grid-cols-12">
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.78))] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:col-span-8">
          <div className="relative z-10">
            <h3 className="mb-4 font-display text-2xl font-semibold tracking-[0.01em] text-slate-100">Komisyon Hesaplayıcı</h3>
            <p className="max-w-md text-slate-300">
              24 kurum, 8 piyasa ve tüm masraf kalemleriyle toplam efektif maliyeti tek ekranda görün.
            </p>
          </div>
          <div className="relative z-10 mt-8 flex gap-4">
            <div className="rounded-xl border border-white/12 bg-slate-900/55 p-4 backdrop-blur-xl">
              <p className="mb-1 font-display text-xs tracking-[0.08em] text-slate-400">Kurum Kapsamı</p>
              <p className="font-data text-2xl font-semibold text-[#8ddfff]">24 Kurum</p>
            </div>
            <div className="rounded-xl border border-white/12 bg-slate-900/55 p-4 backdrop-blur-xl">
              <p className="mb-1 font-display text-xs tracking-[0.08em] text-slate-400">Masraf Katmanı</p>
              <p className="font-data text-2xl font-semibold text-[#8ddfff]">8 Kalem</p>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-1/2 opacity-20 transition-opacity duration-500 group-hover:opacity-40">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5zIkeWmUaXPxHWIrmXWSFcMjTTad6uhVNuqAEqOpF3q8K9WGFgBTmEHH3da48i72NVygBEYissyC47XHJx7OzboSXNop_2KqCVihQvkHfrUH2iNfF4Zo6u9X_4MfW4GuUK7fANFkX0Js__Zy1SSJa8-4Q6WN6-W2JtE7qM-Zh3vphwRY_3aqNfYm9tynl-6WOphQygQxH5N0RvIweVJP_EbaOFp6paq-DHOMVhGhRDwGPzRPx1VVOG2Ho_ZzOdGTXm1atvux1dyie"
              alt="Analitik görsel"
              width={600}
              height={400}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-white/10 bg-slate-950/60 p-8 backdrop-blur-xl md:col-span-4">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-[#22b7ff]/30 bg-[#22b7ff]/12">
            <LineChart className="h-6 w-6 text-[#8ddfff]" strokeWidth={1.5} />
          </div>
          <h3 className="mb-4 font-display text-2xl font-semibold tracking-[0.01em] text-slate-100">Korelasyon Çarpışması Testi</h3>
          <p className="mb-auto text-slate-300">
            DCC-GARCH, tail dependence ve kriz replay ile yalancı çeşitlendirmeyi erken yakalayın.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center backdrop-blur-xl md:col-span-4">
          <Gauge className="mb-4 h-12 w-12 text-[#8ddfff]" strokeWidth={1.5} />
          <h3 className="font-display text-xl font-semibold tracking-[0.01em] text-slate-100">Portföy Stres Simülatörü</h3>
          <p className="mt-2 text-sm text-slate-300">
            Monte Carlo, CVaR ve kriz kütüphanesiyle portföyün kırılma noktasını ölçün.
          </p>
        </div>

        <div className="flex flex-col items-center gap-8 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.78))] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:col-span-8 md:flex-row">
          <div className="w-full md:w-1/3">
            <div className="mb-3">
              <Radar className="h-6 w-6 text-[#8ddfff]" strokeWidth={1.5} />
            </div>
            <h3 className="mb-4 font-display text-2xl font-semibold tracking-[0.01em] text-slate-100">FinCognis API Çıktıları</h3>
            <p className="text-slate-300">Araç sonucunu rapor, panel veya operasyon akışına tek formatta aktar.</p>
          </div>
          <div className="w-full overflow-x-auto rounded-xl border border-white/12 bg-slate-950/70 p-4 font-data text-sm text-[#8ddfff] md:w-2/3">
            <code>GET /v1/tools/stress?scenario=covid_2020</code>
            <br />
            <code>{`{ "resilienceScore": 67, "var99": 0.31, "status": "ready" }`}</code>
          </div>
        </div>
      </div>
    </section>
  );
}
