interface ComplianceStat {
  value: string;
  title: string;
  description: string;
}

const STATS: ComplianceStat[] = [
  {
    value: "2",
    title: "Çalışma Modu",
    description: "Karşılaştırma ve Profil Keşif akışlarıyla karar öncesi görünürlük.",
  },
  {
    value: "4",
    title: "Temel Kriter",
    description: "Risk hassasiyeti, Geçmiş getiri gücü beklentisi, Nakde çevirme kolaylığı ihtiyacı, Portföy dengeleme hedefi.",
  },
  {
    value: "0-100",
    title: "Profil Uyum Skoru",
    description: "Seçilen profile göre varlık yakınlığını sınıflandıran karşılaştırmalı puan.",
  },
];

export default function GlobalCompliance() {
  return (
    <section id="risk" className="landing-section mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <span id="uyum-bildirimi" className="sr-only">
        Uyum Bildirimi
      </span>
      <div className="mb-16 text-center">
        <p className="mb-4 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Risk ve Bilgilendirme</p>
        <h2 className="mb-6 font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
          FinCognis, karar öncesi araştırma aracıdır.
        </h2>
        <p className="mx-auto max-w-2xl text-slate-300">
          Bu içerik yatırım tavsiyesi değildir. Çıktılar genel nitelikli karşılaştırmalı analiz ve profil eşleştirmesi sunar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {STATS.map((stat) => (
          <div
            key={stat.value}
            className="landing-card rounded-2xl border border-white/10 bg-slate-950/60 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#22b7ff]/60"
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
