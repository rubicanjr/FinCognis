interface ComplianceStat {
  value: string;
  title: string;
  description: string;
}

const STATS: ComplianceStat[] = [
  {
    value: "24",
    title: "Karşılaştırılan Kurum",
    description: "Komisyon Hesaplayıcı içinde banka, aracı kurum ve kripto borsaları.",
  },
  {
    value: "5+",
    title: "Kriz Senaryosu",
    description: "Portföy Stres Simülatörü için tarihsel şok kütüphanesi.",
  },
  {
    value: "8",
    title: "Piyasa Kategorisi",
    description: "Araçlar genelinde kategori bazlı seçim ve analiz akışı.",
  },
];

export default function GlobalCompliance() {
  return (
    <section id="compliance" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-16 text-center">
        <p className="mb-4 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Araç Kapsamı</p>
        <h2 className="mb-6 font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
          FinCognis, karar kalitesini ölçer.
        </h2>
        <p className="mx-auto max-w-2xl text-slate-300">
          Her araç; aynı veri disiplini, açık metrikler ve paylaşılabilir sonuç formatı ile birlikte çalışır.
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
