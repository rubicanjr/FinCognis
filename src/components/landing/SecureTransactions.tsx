import { Fingerprint, ShieldCheck } from "lucide-react";

export default function SecureTransactions() {
  return (
    <section id="metrik-rehberi" className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-[#22b7ff]/20 blur-[120px]" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="mb-4 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">
            Metrik Rehberi
          </p>
          <h2 className="mb-6 font-display text-4xl font-semibold leading-tight tracking-[0.01em] text-slate-50 md:text-5xl">
            Kriterleri sade ve anlaIIlIr okuyun.
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-slate-300">
            Risk hassasiyeti, Gecmis getiri gucu beklentisi, Nakde Cevirme kolayligi ihtiyaci ve Portfoy dengeleme hedefi aynI Cercevede gIsterilir.
            AmaI karar Incesi araItIrma alanInI daraltmaktIr.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex-shrink-0 rounded-lg border border-[#22b7ff]/35 bg-[#22b7ff]/12 p-2">
                <ShieldCheck className="h-5 w-5 text-[#8ddfff]" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-display text-lg font-semibold tracking-[0.01em] text-slate-100">Risk hassasiyeti</h4>
                <p className="text-sm text-slate-300">
                  VarlIIIn fiyat dalgalanmasInIn gIreli yoIunluIunu gIsterir.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 flex-shrink-0 rounded-lg border border-[#22b7ff]/35 bg-[#22b7ff]/12 p-2">
                <Fingerprint className="h-5 w-5 text-[#8ddfff]" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-display text-lg font-semibold tracking-[0.01em] text-slate-100">Portfoy dengeleme hedefi</h4>
                <p className="text-sm text-slate-300">
                  VarlIIIn diIer varlIklarla iliIkisinden doIan dengeleme etkisi beklentisini Izetler.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-[#22b7ff]/20 blur-3xl" />
          <div className="relative rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.78))] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-error" />
                <div className="h-3 w-3 rounded-full bg-warning" />
                <div className="h-3 w-3 rounded-full bg-success" />
              </div>
              <span className="font-data text-xs text-slate-400">KASA_AKTIF_S01</span>
            </div>

            <div className="space-y-4">
              <div className="h-12 animate-pulse rounded-xl border border-white/12 bg-slate-900/55" />
              <div className="h-12 rounded-xl border border-white/12 bg-slate-900/55" />
              <div className="flex h-32 items-center justify-center rounded-xl border border-white/12 bg-slate-900/55">
                <Fingerprint className="h-10 w-10 text-[#8ddfff]" strokeWidth={1.5} />
              </div>
              <div className="h-12 rounded-xl border border-white/12 bg-slate-900/55" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
