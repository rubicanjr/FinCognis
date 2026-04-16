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
    question: "FinCognis hangi yatırımcı profili için uygundur?",
    answer:
      "FinCognis; bireysel yatırımcılar, portföy yöneticileri ve veri odaklı karar almak isteyen ekipler için uygundur.",
  },
  {
    question: "Komisyon Hesaplayıcı nasıl çalışır?",
    answer:
      "Komisyon Hesaplayıcı, seçilen kurum oranları ve işlem kalemlerine göre toplam maliyeti kalem kalem hesaplar.",
  },
  {
    question: "Korelasyon analizi portföyde ne işe yarar?",
    answer:
      "Korelasyon analizi, varlıkların birlikte hareket etme eğilimini gösterir ve çeşitlendirme kalitesini ölçmeye yardımcı olur.",
  },
  {
    question: "Stres testi sonuçları yatırım tavsiyesi yerine geçer mi?",
    answer: "Hayır. Stres testi olası riskleri modellemek içindir; kesin sonuç veya yatırım tavsiyesi sunmaz.",
  },
  {
    question: "FinCognis güvenlik tarafında hangi yaklaşımı izler?",
    answer:
      "Platform, veri gizliliği, erişim kontrolü ve denetlenebilirlik ilkelerini merkeze alan güvenlik odaklı bir mimari izler.",
  },
];

const SEO_CONTENT_BLOCKS: ContentBlock[] = [
  {
    title: "Finansal Kararlarda Hız ve Doğruluk Dengesi",
    paragraphs: [
      "Finansal piyasalarda fark yaratan unsur veriyi hızlı okumak kadar doğru bağlamda yorumlamaktır. FinCognis, maliyet analizi, varlık ilişkileri ve kriz dayanıklılığı gibi karar mekanizmasının temel katmanlarını tek bir akış içinde birleştirir.",
      "Kullanıcılar farklı ekranlar arasında geçiş yapmak yerine aynı panelde maliyet etkisini, risk yoğunluğunu ve senaryo sonucunu birlikte değerlendirebilir.",
    ],
  },
  {
    title: "Maliyet Şeffaflığı ve İşlem Disiplini",
    paragraphs: [
      "Bir stratejinin gerçek performansı, alış-satış fiyatının ötesinde toplam işlem maliyetiyle belirlenir. Komisyon, vergi ve ek kalemler ihmal edildiğinde net getiri yanlış yorumlanabilir.",
      "FinCognis Komisyon Hesaplayıcı, kurumlar arasındaki oran farklarını aynı çatı altında göstererek daha disiplinli karar almaya yardımcı olur.",
    ],
  },
  {
    title: "Korelasyon ve Risk Dağılımını Birlikte Okumak",
    paragraphs: [
      "Portföy yönetiminde tekil varlık seçimi kadar varlıkların birbiriyle etkileşimi de önemlidir. Yüksek pozitif korelasyon, toplam riski fark edilmeden artırabilir.",
      "Korelasyon Çarpışması Testi, teknik bir katsayıyı karar destek sinyaline dönüştürerek dengeli portföy kurulumunu kolaylaştırır.",
    ],
  },
  {
    title: "Stres Testi ile Senaryo Bazlı Planlama",
    paragraphs: [
      "Sağlıklı risk yönetimi yalnızca ortalama koşullara değil, ekstrem senaryolara da hazırlık gerektirir. Stres testi, olası kayıp etkisini sayısal olarak gösterir.",
      "Bu yöntem pozisyon boyutu, nakit oranı ve risk limiti gibi kritik başlıklarda daha planlı adım atılmasını sağlar.",
    ],
  },
  {
    title: "Uzun Vadeli Yaklaşım: Ölç, Karşılaştır, İyileştir",
    paragraphs: [
      "Finansal performansı iyileştirmenin en güvenilir yolu karar kalitesini ölçmektir. Maliyeti ölç, risk ilişkisini karşılaştır, kriz etkisini simüle et ve stratejiyi güncelle.",
      "FinCognis bu döngüsel yaklaşımı destekleyen bir karar ekosistemi sunar ve uzun vadeli finansal sürdürülebilirliği güçlendirir.",
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
            Finansal analizde tutarlı sonuç için bütüncül yaklaşım
          </h2>
        </div>

        <div className="space-y-10">
          {SEO_CONTENT_BLOCKS.map((block) => (
            <article key={block.title} className="rounded-3xl border border-outline-variant/35 bg-surface-container-lowest px-6 py-6 shadow-sm">
              <h3 className="mb-4 font-headline text-2xl font-bold text-on-surface">{block.title}</h3>
              <div className="space-y-4 text-base leading-8 text-on-surface-variant">
                {block.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-3xl border border-outline-variant/35 bg-surface-container-lowest px-6 py-6 shadow-sm">
          <h2 className="mb-6 font-headline text-3xl font-extrabold text-on-surface">Sık Sorulan Sorular</h2>
          <div className="space-y-5">
            {HOME_FAQ_ITEMS.map((item) => (
              <article key={item.question} className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-5 py-4">
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
