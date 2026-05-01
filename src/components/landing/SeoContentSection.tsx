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
    question: "FinCognis'te Karsilastirma Modu ne sunarI",
    answer:
      "Karsilastirma Modu, seItiIiniz varlIklarI aynI tabloda yan yana gIsterir ve Risk hassasiyeti, Gecmis getiri gucu beklentisi, Nakde Cevirme kolayligi ihtiyaci, Portfoy dengeleme hedefi kriterleriyle kIyaslar.",
  },
  {
    question: "Profil Kesif Modu nasIl IalIIIrI",
    answer:
      "Ince 4 kriter seviyesi seIilir, sonra sistem veri setindeki profile yakIn varlIklarI listeler. Ciktilar genel nitelikli karIIlaItIrmalI profil eIleItirmesidir.",
  },
  {
    question: "Profil Uyum Skoru neyi ifade ederI",
    answer:
      "Profil Uyum Skoru 0-100 aralIIInda hesaplanIr. Skor yIkseldikIe seIilen kriterlerle metriklerin genel uyumu artar.",
  },
  {
    question: "Bu sonuIlar yatIrIm tavsiyesi midirI",
    answer:
      "HayIr. FinCognis yatIrIm tavsiyesi vermez; yalnIzca karar Incesi araItIrma ve karIIlaItIrmalI profil eIleItirmesi sunar.",
  },
  {
    question: "KullanIlan veri dinamik miI",
    answer:
      "Evet. AraIta sentetik/sabit akII yerine dinamik veri katmanI kullanIlIr; sonuIlar bu veri Cercevesinde gIncellenir.",
  },
];

const SEO_CONTENT_BLOCKS: ContentBlock[] = [
  {
    title: "Karar Incesi Kriter Karsilastirma Cercevesi",
    paragraphs: [
      "FinCognis, varlIk kIyasInI tek metrikle deIil dIrt temel kriter ekseniyle sunar: Risk hassasiyeti, Gecmis getiri gucu beklentisi, Nakde Cevirme kolayligi ihtiyaci ve Portfoy dengeleme hedefi.",
      "Bu yapI, farklI varlIk tIrlerini aynI Cercevede okuyarak karar Incesi araItIrma alanInI daha hIzlI daraltmanIza yardImcI olur.",
    ],
  },
  {
    title: "Profil Kesif ile AraItIrma AlanInI Daraltma",
    paragraphs: [
      "Profil Kesif Modu, doIrudan varlIk ismi girmeden Ince 4 kriter hedefini seImenizi saIlar ve profile yakIn varlIklarI karIIlaItIrmalI tabloda listeler.",
      "Bu yaklaIIm, bilgi yIkInI azaltIr ve kullanIcIyI kIsa sIrede daha anlamlI bir inceleme kImesine yInlendirir.",
    ],
  },
  {
    title: "Kriterlerin Ayni Dilde OkunmasI",
    paragraphs: [
      "Platformdaki tIm karIIlaItIrmalar kullanIcI dostu etiketlerle sunulur: Risk hassasiyeti, Gecmis getiri gucu beklentisi, Nakde Cevirme kolayligi ihtiyaci, Portfoy dengeleme hedefi.",
      "Bu tutarlI dil, teknik terim karmaIasInI azaltIr ve farklI ekranlardaki sonuIlarI daha hIzlI yorumlamanIzI saIlar.",
    ],
  },
  {
    title: "Uyumlu ve NItr IIktI Prensibi",
    paragraphs: [
      "FinCognis, sonuI metinlerinde yInlendirici yatIrIm dili kullanmaz. Ciktilar yalnIzca genel nitelikli karIIlaItIrmalI analiz Iretir.",
      "AmaI, kiIisel karar sIreIlerini desteklemek iIin Ieffaf bir bilgi katmanI sunmaktIr; alIm-satIm Inerisi sunmak degildir.",
    ],
  },
];

export default function SeoContentSection() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        <div>
          <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Karar Incesi Rehber</p>
          <h2 className="font-display text-3xl font-semibold tracking-[0.01em] text-slate-50 sm:text-4xl">
            Karsilastirma ve profil eIleItirmesini birlikte okuyun
          </h2>
        </div>

        <div className="space-y-10">
          {SEO_CONTENT_BLOCKS.map((block) => (
            <article key={block.title} className="rounded-2xl border border-white/10 bg-slate-950/60 px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
              <h3 className="mb-4 font-display text-2xl font-semibold tracking-[0.01em] text-slate-100">{block.title}</h3>
              <div className="space-y-4 text-base leading-8 text-slate-300">
                {block.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.78))] px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <h2 className="mb-6 font-display text-3xl font-semibold tracking-[0.01em] text-slate-50">SIk Sorulan Sorular</h2>
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
