import Image from "next/image";
import { Gauge, LineChart, Radar } from "lucide-react";

export default function AnalyticsBento() {
  return (
    <section id="profil-kesif" className="landing-section mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-16 text-left">
        <p className="mb-4 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">FinCognis Araç Akışı</p>
        <h2 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
          Aradığınız profile yakın varlıkları kriterlerle keşfedin.
        </h2>
      </div>

      <div className="grid h-auto grid-cols-1 gap-6 md:h-[600px] md:grid-cols-12">
        <div className="landing-card group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.78))] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:col-span-8">
          <div className="relative z-10">
            <h3 className="mb-4 font-display text-2xl font-semibold tracking-[0.01em] text-slate-100">Karşılaştırma Modu</h3>
            <p className="max-w-md text-slate-300">
              Seçtiğiniz varlıkları tek çerçevede karşılaştırın; Risk hassasiyeti, Geçmiş getiri gücü beklentisi, Nakde çevirme kolaylığı ihtiyacı
              ve Portföy dengeleme hedefi kriterlerini yan yana görün.
            </p>
          </div>
          <div className="relative z-10 mt-8 flex gap-4">
            <div className="rounded-xl border border-white/12 bg-slate-900/55 p-4 backdrop-blur-xl">
              <p className="mb-1 font-display text-xs tracking-[0.08em] text-slate-400">Kriter Kapsamı</p>
              <p className="font-data text-2xl font-semibold text-[#8ddfff]">Çoklu Varlık</p>
            </div>
            <div className="rounded-xl border border-white/12 bg-slate-900/55 p-4 backdrop-blur-xl">
              <p className="mb-1 font-display text-xs tracking-[0.08em] text-slate-400">Profil Skoru</p>
              <p className="font-data text-2xl font-semibold text-[#8ddfff]">0-100</p>
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

        <div className="landing-card flex flex-col rounded-2xl border border-white/10 bg-slate-950/60 p-8 backdrop-blur-xl md:col-span-4">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-[#22b7ff]/30 bg-[#22b7ff]/12">
            <LineChart className="h-6 w-6 text-[#8ddfff]" strokeWidth={1.5} />
          </div>
          <h3 className="mb-4 font-display text-2xl font-semibold tracking-[0.01em] text-slate-100">Profil Keşif Modu</h3>
          <p className="mb-auto text-slate-300">
            İnce 4 kriteri seçin, ardından profile yakın varlıkları sınıflandırılmış tabloyla inceleyin.
          </p>
        </div>

        <div className="landing-card flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center backdrop-blur-xl md:col-span-4">
          <Gauge className="mb-4 h-12 w-12 text-[#8ddfff]" strokeWidth={1.5} />
          <h3 className="font-display text-xl font-semibold tracking-[0.01em] text-slate-100">Kriter Odaklı Analiz Dili</h3>
          <p className="mt-2 text-sm text-slate-300">
            Çıktılar yalnızca karşılaştırmalı bilgi sunar; yatırım tavsiyesi dili içermez.
          </p>
        </div>

        <div className="landing-card flex flex-col items-center gap-8 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.78))] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:col-span-8 md:flex-row">
          <div className="w-full md:w-1/3">
            <div className="mb-3">
              <Radar className="h-6 w-6 text-[#8ddfff]" strokeWidth={1.5} />
            </div>
            <h3 className="mb-4 font-display text-2xl font-semibold tracking-[0.01em] text-slate-100">Kriter Karşılaştırma Matrisi</h3>
            <p className="text-slate-300">Kriterler satırda, varlıklar sütunda olacak şekilde karar öncesi görünürlüğü artırın.</p>
          </div>
          <div className="w-full overflow-x-auto rounded-xl border border-white/12 bg-slate-950/70 p-4 font-data text-sm text-[#8ddfff] md:w-2/3">
            <code>POST /api/analyze</code>
            <br />
            <code>{`{ "asset": "TUPRS", "risk": 5.0, "profileFitScore": 78.4 }`}</code>
          </div>
        </div>
      </div>
    </section>
  );
}
