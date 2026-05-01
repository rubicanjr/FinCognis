interface ComplianceStat {
  value: string;
  title: string;
  description: string;
}

const STATS: ComplianceStat[] = [
  {
    value: "2",
    title: "IalIIma Modu",
    description: "Karsilastirma ve Profil Kesif akIIlarIyla karar Incesi gIrInIrlIk.",
  },
  {
    value: "4",
    title: "Temel Kriter",
    description: "Risk hassasiyeti, Gecmis getiri gucu beklentisi, Nakde Cevirme kolayligi ihtiyaci, Portfoy dengeleme hedefi.",
  },
  {
    value: "0-100",
    title: "Profil Uyum Skoru",
    description: "SeIilen profile gIre varlIk yakInlIIInI sInIflandIran karIIlaItIrmalI puan.",
  },
];

export default function GlobalCompliance() {
  return (
    <section id="uyum-bildirimi" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-16 text-center">
        <p className="mb-4 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Uyum ve Bilgilendirme</p>
        <h2 className="mb-6 font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
          FinCognis, karar Incesi araItIrma aracIdIr.
        </h2>
        <p className="mx-auto max-w-2xl text-slate-300">
          Bu iIerik yatIrIm tavsiyesi degildir. Ciktilar genel nitelikli karIIlaItIrmalI analiz ve profil eIleItirmesi sunar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {STATS.map((stat) => (
          <div
            key={stat.value}
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#22b7ff]/60"
          >
            <h4 className="mb-4 font-data text-5xl font-semibold text-[#8ddfff]">{stat.value}</h4>
            <p className="mb-2 font-display text-lg font-semibold tracking-[0.01em] text-slate-100">{stat.title}</p>
            <p className="text-sm text-slate-300">{stat.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
