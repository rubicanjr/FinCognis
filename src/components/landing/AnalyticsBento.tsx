import { BrainCircuit, BriefcaseBusiness, CloudCog, LockKeyhole, Scale, ServerCog } from "lucide-react";

interface ExpertiseItem {
  icon: typeof CloudCog;
  title: string;
  description: string;
}

const EXPERTISE_ITEMS: ExpertiseItem[] = [
  {
    icon: CloudCog,
    title: "Bulut Çözümleri",
    description: "Veri ve karar altyapınızı ölçeklenebilir bulut mimarisiyle güçlendirin.",
  },
  {
    icon: BrainCircuit,
    title: "Veri ve Yapay Zekâ Danışmanlığı",
    description: "Yapay zekâ destekli modelleme ile karar kalitesini artıran danışmanlık çerçevesi.",
  },
  {
    icon: LockKeyhole,
    title: "Siber Güvenlik",
    description: "Karar sistemlerinizi güvenlik, erişim kontrolü ve izlenebilirlik katmanlarıyla koruyun.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Dijital Çalışma Alanı Çözümleri",
    description: "Ekiplerin araştırma ve analiz süreçlerini tek akışta birleştiren verimli çalışma altyapısı.",
  },
  {
    icon: Scale,
    title: "Dijital Strateji",
    description: "Risk-getiri dengesini kurumsal hedeflerle hizalayan stratejik karar çerçevesi.",
  },
  {
    icon: ServerCog,
    title: "BT Modernizasyonu",
    description: "Eski sistemleri modern, hızlı ve sürdürülebilir analitik mimarilere dönüştürün.",
  },
];

export default function AnalyticsBento() {
  return (
    <section id="profil-kesif" className="landing-section mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="mb-14 text-center">
        <span className="inline-flex rounded-full border border-white/12 bg-white/5 px-4 py-1 font-display text-xs font-semibold tracking-[0.1em] text-[#8ddfff]">
          Servisler
        </span>
        <h2 className="mt-5 font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">Uzmanlık Alanlarımız</h2>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {EXPERTISE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="landing-card rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(11,19,38,0.72),rgba(5,10,24,0.86))] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#22b7ff]/55"
            >
              <div className="mb-5 inline-flex rounded-lg border border-[#22b7ff]/30 bg-[#22b7ff]/12 p-2.5">
                <Icon className="h-5 w-5 text-[#8ddfff]" />
              </div>
              <h3 className="font-display text-2xl font-semibold tracking-[0.01em] text-slate-100">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
