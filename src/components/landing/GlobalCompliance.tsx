interface ComplianceStat {
  value: string;
  title: string;
  description: string;
}

const STATS: ComplianceStat[] = [
  { value: "120+", title: "Desteklenen Ulke", description: "Dunya genelinde tam KYC/AML orkestrasyonu." },
  { value: "SOC2", title: "Tip II Sertifikali", description: "Veri guvenliginde yuksek standart." },
  { value: "GDPR", title: "Tasarimdan Uyumlu", description: "Temelden gizlilik odakli mimari." },
];

export default function GlobalCompliance() {
  return (
    <section id="compliance" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-16 text-center">
        <p className="mb-4 font-label text-sm font-bold uppercase tracking-[0.2em] text-secondary">Kuresel Uyumluluk</p>
        <h2 className="mb-6 font-headline text-4xl font-extrabold text-on-surface md:text-5xl">
          Sinirsiz buyume icin insa edildi.
        </h2>
        <p className="mx-auto max-w-2xl text-on-surface-variant">
          120+ yargi alaninda duzenleyici raporlamayi otomatiklestirin.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {STATS.map((stat) => (
          <div
            key={stat.value}
            className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-8 transition-all duration-300 hover:scale-[1.01] hover:border-secondary/30"
          >
            <h4 className="mb-4 font-headline text-5xl font-extrabold text-primary">{stat.value}</h4>
            <p className="mb-2 font-headline font-bold">{stat.title}</p>
            <p className="text-sm text-on-surface-variant">{stat.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
