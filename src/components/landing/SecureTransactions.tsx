import { Activity, Gauge, MessageSquareText, Orbit, Workflow, Zap } from "lucide-react";

interface AdvantageCard {
  icon: typeof Activity;
  title: string;
  description: string;
}

const ADVANTAGES: AdvantageCard[] = [
  {
    icon: MessageSquareText,
    title: "Karar Körlüğünü Ortadan Kaldırır",
    description:
      "Çoğu yatırımcı veriye sahip ama neye bakacağını bilmez. FinCognis, karar anında kritik sinyali görünür hale getirir.",
  },
  {
    icon: Workflow,
    title: "Tahmin Değil Koşul Bazlı Düşünür",
    description: "“Ne olur?” sorusunu bırakır, “hangi şartta yanlış olur?” sorusuna odaklanır.",
  },
  {
    icon: Activity,
    title: "Riski Saklamaz, Netleştirir",
    description: "Kazanç senaryosu değil, downside risk açıkça ortaya konur.",
  },
  {
    icon: Orbit,
    title: "Karar Öncesi Durdurur",
    description: "Hızlı karar değil, doğru karar. Sistem, kritik hatalardan önce kullanıcıyı durdurur.",
  },
  {
    icon: Gauge,
    title: "Veriyi Karara Çevirir",
    description: "Dashboard değil, aksiyon üretir. Bilgi değil, karar çıktısı verir.",
  },
  {
    icon: Zap,
    title: "Aynı Hatayı Tekrar Ettirmez",
    description: "Geçmiş kararları analiz eder, kullanıcının kendi pattern’ını yüzüne gösterir.",
  },
];

const METRICS = [
  { value: "350+", label: "memnun kullanıcı" },
  { value: "%90", label: "müşteri tutundurma" },
  { value: "4.97", label: "ortalama puan" },
];

export default function SecureTransactions() {
  return (
    <section id="metrik-rehberi" className="landing-section mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="mb-14 text-center">
        <span className="inline-flex rounded-full border border-white/12 bg-white/5 px-4 py-1 font-display text-xs font-semibold tracking-[0.1em] text-[#8ddfff]">
          Avantajlar
        </span>
        <h2 className="mt-5 font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
          Ekipler Neden FinCognis&apos;i Tercih Ediyor
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {ADVANTAGES.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className="landing-card md:col-span-2 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(11,19,38,0.72),rgba(5,10,24,0.86))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#22b7ff]/55"
            >
              <div className="mb-4 inline-flex rounded-lg border border-[#22b7ff]/30 bg-[#22b7ff]/12 p-2.5">
                <Icon className="h-4 w-4 text-[#8ddfff]" />
              </div>
              <h3 className="font-display text-xl font-semibold text-slate-100">{card.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{card.description}</p>
            </article>
          );
        })}
      </div>

      <div className="relative mt-20 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_125%,rgba(34,211,238,0.35),rgba(3,10,24,0.92)_56%)] px-6 py-14 text-center sm:px-10">
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[130%] -translate-x-1/2 rounded-[100%] border border-[#22b7ff]/25" />
        <div className="pointer-events-none absolute -bottom-28 left-1/2 h-72 w-[140%] -translate-x-1/2 rounded-[100%] border border-[#22b7ff]/15" />

        <h3 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
          Sadece bizim sözümüze güvenmeyin.
        </h3>

        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          {METRICS.map((metric) => (
            <div key={metric.label}>
              <p className="font-data text-4xl font-semibold text-slate-50">{metric.value}</p>
              <p className="mt-2 font-display text-sm text-slate-300">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
