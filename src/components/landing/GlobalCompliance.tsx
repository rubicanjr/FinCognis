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
    <section id="compliance" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-16 text-center">
        <p className="mb-4 font-label text-sm font-bold uppercase tracking-[0.2em] text-secondary">Araç Kapsamı</p>
        <h2 className="mb-6 font-headline text-4xl font-extrabold text-on-surface md:text-5xl">
          FinCognis, karar kalitesini ölçer.
        </h2>
        <p className="mx-auto max-w-2xl text-on-surface-variant">
          Her araç; aynı veri disiplini, açık metrikler ve paylaşılabilir sonuç formatı ile birlikte çalışır.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {STATS.map((stat) => (
          <div
            key={stat.value}
            className="rounded-2xl border border-outline-variant/35 bg-surface-container-lowest p-8 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:border-secondary"
          >
            <h4 className="mb-4 font-headline text-5xl font-extrabold text-primary">{stat.value}</h4>
            <p className="mb-2 font-headline font-bold text-on-surface">{stat.title}</p>
            <p className="text-sm text-on-surface-variant">{stat.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
