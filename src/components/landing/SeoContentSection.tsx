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
    question: "FinCognis hangi yatirimci profili icin uygundur?",
    answer:
      "FinCognis; bireysel yatirimcilar, portfoy yoneticileri ve veri odakli karar almak isteyen ekipler icin uygundur.",
  },
  {
    question: "Komisyon Hesaplayici nasil calisir?",
    answer:
      "Komisyon Hesaplayici, secilen kurum oranlari ve islem kalemlerine gore toplam maliyeti kalem kalem hesaplar.",
  },
  {
    question: "Korelasyon analizi portfoyde ne ise yarar?",
    answer:
      "Korelasyon analizi, varliklarin birlikte hareket etme egilimini gosterir ve cesitlendirme kalitesini olcmeye yardimci olur.",
  },
  {
    question: "Stres testi sonuclari yatirim tavsiyesi yerine gecer mi?",
    answer:
      "Hayir. Stres testi olasi riskleri modellemek icindir; kesin sonuc veya yatirim tavsiyesi sunmaz.",
  },
  {
    question: "FinCognis guvenlik tarafinda hangi yaklasimi izler?",
    answer:
      "Platform, veri gizliligi, erisim kontrolu ve denetlenebilirlik ilkelerini merkeze alan guvenlik odakli bir mimari izler.",
  },
];

const SEO_CONTENT_BLOCKS: ContentBlock[] = [
  {
    title: "Finansal Kararlarda Hiz ve Dogruluk Dengesi",
    paragraphs: [
      "Finansal piyasalarda fark yaratan unsur veriyi hizli okumak kadar dogru baglamda yorumlamaktir. FinCognis, maliyet analizi, varlik iliskileri ve kriz dayanikliligi gibi karar mekanizmasinin temel katmanlarini tek bir akis icinde birlestirir.",
      "Kullanicilar farkli ekranlar arasinda gecis yapmak yerine ayni panelde maliyet etkisini, risk yogunlugunu ve senaryo sonucunu birlikte degerlendirebilir.",
    ],
  },
  {
    title: "Maliyet Seffafligi ve Islem Disiplini",
    paragraphs: [
      "Bir stratejinin gercek performansi, alis-satis fiyatinin otesinde toplam islem maliyetiyle belirlenir. Komisyon, vergi ve ek kalemler ihmal edildiginde net getiri yanlis yorumlanabilir.",
      "FinCognis Komisyon Hesaplayici, kurumlar arasi oran farklarini ayni cati altinda gostererek daha disiplinli karar almaya yardimci olur.",
    ],
  },
  {
    title: "Korelasyon ve Risk Dagilimini Birlikte Okumak",
    paragraphs: [
      "Portfoy yonetiminde tekil varlik secimi kadar varliklarin birbiriyle etkilesimi de onemlidir. Yuksek pozitif korelasyon, toplam riski fark edilmeden artirabilir.",
      "Korelasyon Carpismasi Testi, teknik bir katsayiyi karar destek sinyaline donusturerek dengeli portfoy kurulumunu kolaylastirir.",
    ],
  },
  {
    title: "Stres Testi ile Senaryo Bazli Planlama",
    paragraphs: [
      "Saglikli risk yonetimi yalnizca ortalama kosullara degil, ekstrem senaryolara da hazirlik gerektirir. Stres testi, olasi kayip etkisini sayisal olarak gosterir.",
      "Bu yontem pozisyon boyutu, nakit orani ve risk limiti gibi kritik basliklarda daha planli adim atilmasini saglar.",
    ],
  },
  {
    title: "Uzun Vadeli Yaklasim: Olc, Karsilastir, Iyilestir",
    paragraphs: [
      "Finansal performansi iyilestirmenin en guvenilir yolu karar kalitesini olcmektir. Maliyeti olc, risk iliskisini karsilastir, kriz etkisini simule et ve stratejiyi guncelle.",
      "FinCognis bu dongusel yaklasimi destekleyen bir karar ekosistemi sunar ve uzun vadeli finansal surdurulebilirligi guclendirir.",
    ],
  },
];

export default function SeoContentSection() {
  return (
    <section className="bg-surface-container-low px-6 py-20">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        <div>
          <p className="mb-3 font-label text-xs font-bold uppercase tracking-[0.24em] text-secondary">Finansal Rehber</p>
          <h2 className="font-headline text-3xl font-extrabold text-on-surface sm:text-4xl">
            Finansal analizde tutarli sonuc icin butuncul yaklasim
          </h2>
        </div>

        <div className="space-y-10">
          {SEO_CONTENT_BLOCKS.map((block) => (
            <article key={block.title} className="rounded-3xl bg-surface-container-high/70 px-6 py-6">
              <h3 className="mb-4 font-headline text-2xl font-bold text-on-surface">{block.title}</h3>
              <div className="space-y-4 text-base leading-8 text-on-surface-variant">
                {block.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-3xl bg-surface px-6 py-6">
          <h2 className="mb-6 font-headline text-3xl font-extrabold text-on-surface">Sik Sorulan Sorular</h2>
          <div className="space-y-5">
            {HOME_FAQ_ITEMS.map((item) => (
              <article key={item.question} className="rounded-2xl bg-surface-container-low px-5 py-4">
                <h3 className="font-headline text-xl font-bold text-on-surface">{item.question}</h3>
                <p className="mt-2 text-sm leading-7 text-on-surface-variant">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
