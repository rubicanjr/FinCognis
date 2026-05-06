interface FaqItem {
  question: string;
  answer: string;
}

interface ContentBlock {
  title: string;
  paragraphs: string[];
}

export const HOME_FAQ_ITEMS: FaqItem[] = [
  {
    question: "FinCognis'te Karşılaştırma Modu ne sunar?",
    answer:
      "Karşılaştırma Modu, seçtiğiniz varlıkları aynı tabloda yan yana gösterir ve Risk hassasiyeti, Geçmiş getiri gücü beklentisi, Nakde çevirme kolaylığı ihtiyacı, Portföy dengeleme hedefi kriterleriyle kıyaslar.",
  },
  {
    question: "Profil Keşif Modu nasıl çalışır?",
    answer:
      "Önce 4 kriter seviyesi seçilir, sonra sistem veri setindeki profile yakın varlıkları listeler. Çıktılar genel nitelikli karşılaştırmalı profil eşleştirmesidir.",
  },
  {
    question: "Profil Uyum Skoru neyi ifade eder?",
    answer:
      "Profil Uyum Skoru 0-100 aralığında hesaplanır. Skor yükseldikçe seçilen kriterlerle metriklerin genel uyumu artar.",
  },
  {
    question: "Bu sonuçlar yatırım tavsiyesi midir?",
    answer:
      "Hayır. FinCognis yatırım tavsiyesi vermez; yalnızca karar öncesi araştırma ve karşılaştırmalı profil eşleştirmesi sunar.",
  },
  {
    question: "Kullanılan veri dinamik mi?",
    answer:
      "Evet. Araçta sentetik/sabit akış yerine dinamik veri katmanı kullanılır; sonuçlar bu veri çerçevesinde güncellenir.",
  },
];

const SEO_CONTENT_BLOCKS: ContentBlock[] = [
  {
    title: "Karar Öncesi Kriter Karşılaştırma Çerçevesi",
    paragraphs: [
      "FinCognis, varlık kıyasını tek metrikle değil dört temel kriter ekseniyle sunar: Risk hassasiyeti, Geçmiş getiri gücü beklentisi, Nakde çevirme kolaylığı ihtiyacı ve Portföy dengeleme hedefi.",
      "Bu yapı, farklı varlık türlerini aynı çerçevede okuyarak karar öncesi araştırma alanını daha hızlı daraltmanıza yardımcı olur.",
    ],
  },
  {
    title: "Profil Keşif ile Araştırma Alanını Daraltma",
    paragraphs: [
      "Profil Keşif Modu, doğrudan varlık ismi girmeden önce 4 kriter hedefini seçmenizi sağlar ve profile yakın varlıkları karşılaştırmalı tabloda listeler.",
      "Bu yaklaşım, bilgi yükünü azaltır ve kullanıcıyı kısa sürede daha anlamlı bir inceleme kümesine yönlendirir.",
    ],
  },
  {
    title: "Kriterlerin Aynı Dilde Okunması",
    paragraphs: [
      "Platformdaki tüm karşılaştırmalar kullanıcı dostu etiketlerle sunulur: Risk hassasiyeti, Geçmiş getiri gücü beklentisi, Nakde çevirme kolaylığı ihtiyacı, Portföy dengeleme hedefi.",
      "Bu tutarlı dil, teknik terim karmaşasını azaltır ve farklı ekranlardaki sonuçları daha hızlı yorumlamanızı sağlar.",
    ],
  },
  {
    title: "Uyumlu ve Nötr Çıktı Prensibi",
    paragraphs: [
      "FinCognis, sonuç metinlerinde yönlendirici yatırım dili kullanmaz. Çıktılar yalnızca genel nitelikli karşılaştırmalı analiz üretir.",
      "Amaç, kişisel karar süreçlerini desteklemek için şeffaf bir bilgi katmanı sunmaktır; alım-satım önerisi sunmak değildir.",
    ],
  },
];

export default function SeoContentSection() {
  return (
    <section className="landing-section px-4 py-20 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        <div>
          <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Karar Öncesi Rehber</p>
          <h2 className="font-display text-3xl font-semibold tracking-[0.01em] text-slate-50 sm:text-4xl">
            Karşılaştırma ve profil eşleştirmesini birlikte okuyun
          </h2>
        </div>

        <div className="space-y-10">
          {SEO_CONTENT_BLOCKS.map((block) => (
            <article key={block.title} className="landing-card rounded-2xl border border-white/10 bg-slate-950/60 px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
              <h3 className="mb-4 font-display text-2xl font-semibold tracking-[0.01em] text-slate-100">{block.title}</h3>
              <div className="space-y-4 text-base leading-8 text-slate-300">
                {block.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="landing-card rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.78))] px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <h2 className="mb-6 font-display text-3xl font-semibold tracking-[0.01em] text-slate-50">Sık Sorulan Sorular</h2>
          <div className="space-y-5">
            {HOME_FAQ_ITEMS.map((item) => (
              <article key={item.question} className="rounded-xl border border-white/12 bg-slate-900/55 px-5 py-4 backdrop-blur-xl">
                <h3 className="font-display text-xl font-semibold tracking-[0.01em] text-slate-100">{item.question}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
