import { Quote } from "lucide-react";

interface Testimonial {
  quote: string;
  person: string;
  role: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "FinCognis ile karar akışımız belirgin şekilde hızlandı. Risk görünürlüğü arttı ve yatırım komitesi toplantılarında çok daha net ilerliyoruz.",
    person: "Adrian Vale",
    role: "Financial Intelligence Lead",
  },
  {
    quote:
      "Profil keşif ve karşılaştırma katmanları sayesinde yatırım tezlerini daha az varsayım, daha çok ölçülebilir veri ile savunabiliyoruz.",
    person: "Mina Arda",
    role: "Strategic Decision Frameworks",
  },
  {
    quote:
      "Ara yüz sade ama çok güçlü. Hem teknik ekip hem yönetim tarafı aynı panelden aynı resmi görebiliyor.",
    person: "Rubi Can İçliyürek",
    role: "Founder & Decision Systems Architect",
  },
];

export default function GlobalCompliance() {
  return (
    <section id="risk" className="landing-section mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <span id="uyum-bildirimi" className="sr-only">
        Uyum Bildirimi
      </span>

      <div className="mb-14 text-center">
        <span className="inline-flex rounded-full border border-white/12 bg-white/5 px-4 py-1 font-display text-xs font-semibold tracking-[0.1em] text-[#8ddfff]">
          Testimonials
        </span>
        <h2 className="mt-5 font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">What Our Clients Say</h2>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((item) => (
          <article
            key={item.person}
            className="landing-card rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(11,19,38,0.72),rgba(5,10,24,0.86))] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#22b7ff]/55"
          >
            <div className="mb-4 inline-flex rounded-lg border border-[#22b7ff]/30 bg-[#22b7ff]/12 p-2.5">
              <Quote className="h-4 w-4 text-[#8ddfff]" />
            </div>
            <p className="text-sm leading-relaxed text-slate-200">“{item.quote}”</p>
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="font-display text-base font-semibold text-slate-100">{item.person}</p>
              <p className="text-xs text-slate-400">{item.role}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-[#22b7ff]/30 bg-[#22b7ff]/10 px-6 py-4 text-center text-sm text-slate-200">
        FinCognis yatırım tavsiyesi vermez; karar öncesi araştırma ve karşılaştırma altyapısı sağlar.
      </div>
    </section>
  );
}
