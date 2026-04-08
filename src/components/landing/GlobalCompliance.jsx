const STATS = [
  {
    value: "120+",
    title: "Desteklenen Ülke",
    description: "Dünya genelinde tam KYC/AML orkestrasyonu.",
  },
  {
    value: "SOC2",
    title: "Tip II Sertifikalı",
    description: "Veri güvenliğinde en yüksek standart.",
  },
  {
    value: "GDPR",
    title: "Tasarımdan Uyumlu",
    description: "Temelden gizlilik odaklı mimari.",
  },
];

export default function GlobalCompliance() {
  return (
    <section id="compliance" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <p className="text-secondary font-label font-bold tracking-[0.2em] uppercase text-sm mb-4">
          Küresel Uyumluluk
        </p>
        <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface mb-6">
          Sınırsız büyüme için inşa edildi.
        </h2>
        <p className="text-on-surface-variant max-w-2xl mx-auto">
          120+ yargı alanında düzenleyici raporlamayı otomatikleştirin.
          Geleceğe odaklanmanız için uyumluluğu biz sağlıyoruz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {STATS.map((stat) => (
          <div
            key={stat.value}
            className="p-8 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 hover:border-secondary/30 transition-all duration-300 hover:scale-[1.01]"
          >
            <h4 className="text-5xl font-headline font-extrabold text-primary mb-4">
              {stat.value}
            </h4>
            <p className="font-headline font-bold mb-2">{stat.title}</p>
            <p className="text-on-surface-variant text-sm">
              {stat.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
