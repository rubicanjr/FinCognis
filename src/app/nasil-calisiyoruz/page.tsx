import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: `${SITE_NAME} | Biz Nasıl Çalışıyoruz`,
  description: "FinCognis kısa ve uzun vadeli analiz yaklaşımının açıklandığı çalışma prensipleri sayfası.",
  path: "/nasil-calisiyoruz",
});

const SHORT_TERM_SECTIONS = [
  {
    title: "Teknik Momentum",
    paragraphs: [
      "Bir hissenin son haftalardaki fiyat hareketi ne kadar güçlü ve sağlıklı? Bunu anlamak için üç şeye bakıyoruz:",
      "Birincisi, hisse ne kadar \"ısınmış\"? Çok hızlı yükselen hisseler bazen sert düşüş yaşayabilir. Biz ne çok soğuk ne çok aşırı ısınmış, dengeli hareket eden hisseleri tercih ediyoruz.",
      "İkincisi, yükseliş ya da düşüş hacimle destekleniyor mu? Bir hisse yükseliyorsa ama bunu yapan işlem sayısı azsa, bu yükseliş güvenilir olmayabilir. Fiyat hareketi + işlem hacmi birlikte güçlüyse daha anlamlı.",
      "Üçüncüsü, hissenin kısa ve uzun vadeli fiyat ortalamaları nasıl konumlanmış? Kısa vadeli ortalama uzun vadeli ortalamanın üzerine çıkmışsa, bu genel olarak olumlu bir işaret.",
    ],
  },
  {
    title: "Hacim Dinamiği",
    paragraphs: [
      "Kim bu hisseyi alıyor, kim satıyor? Büyük işlemler, ani hacim artışları ve fiyatla birlikte hareket eden alım baskısı — bunlar o hissede ciddi bir ilginin olduğuna işaret edebilir. Biz bu sinyalleri takip ederek \"arka planda bir şeyler mi oluyor?\" sorusuna cevap arıyoruz.",
      "(Not: Bu veri doğrudan kurumsal yatırımcıların pozisyonlarını göstermez. Piyasa verilerinden üretilen bir tahmindir.)",
    ],
  },
  {
    title: "Katalizör Takvimi",
    paragraphs: [
      "Yakın zamanda bu hisseyi etkileyebilecek önemli bir gelişme var mı? Şirketin bilanço açıklama tarihi yaklaşıyorsa bu bir katalizör olabilir. Borsaya önemli bir bildirim yapıldıysa bu da fiyatı etkileyebilir. Analistlerin bu hisse hakkındaki görüşleri değiştiyse bunu da hesaba katıyoruz. Kısacası: \"Bu hisse için yakında bir şey olabilir mi?\" sorusuna bakıyoruz.",
    ],
  },
] as const;

const LONG_TERM_SECTIONS = [
  {
    title: "Kazanç Kalitesi",
    paragraphs: [
      "Şirket gerçekten para kazanıyor mu, yoksa sadece kağıt üzerinde mi kazanıyor? Bazı şirketler raporlarında yüksek kâr gösterir ama kasaları boştur. Biz şirketin gerçekten eline nakit geçip geçmediğine bakıyoruz. Kâr ile kasaya giren para arasındaki fark ne kadar büyükse, o kâr o kadar az güvenilir demektir. Ayrıca bu farkın zamanla artıp artmadığına da bakıyoruz. Sürekli büyüyen bir uçurum, ileride sorun çıkabileceğinin işareti olabilir.",
    ],
  },
  {
    title: "Sermaye Tahsisi",
    paragraphs: [
      "Şirket yönetimi elindeki parayı akıllıca kullanıyor mu? Bir şirket yatırım yaparken, kendi hisselerini geri alırken ya da borç öderken doğru kararlar veriyor mu? Biz bunu ölçmek için şunu soruyoruz: Şirket, yatırıma koyduğu her liradan, o liranın maliyetinden daha fazlasını geri kazanabiliyor mu? Kazanabiliyorsa değer yaratıyordur. Kazanamıyorsa hissedar parasını eritiyordur. Ayrıca şirketin borç yükünün taşınabilir olup olmadığına ve faiz ödemelerini rahatça karşılayıp karşılamadığına da bakıyoruz.",
    ],
  },
  {
    title: "Değerleme",
    paragraphs: [
      "Bu hisse ucuz mu, pahalı mı? Bir hissenin fiyatı tek başına bir şey ifade etmez. Önemli olan, o fiyatın şirketin kazancına, varlıklarına ve büyümesine göre mantıklı olup olmadığı. Biz üç şeye bakıyoruz: Aynı sektördeki benzer şirketlerle kıyaslandığında bu hisse nerede duruyor? Kendi tarihsel fiyat aralığında ucuz bir bölgede mi yoksa pahalı bir bölgede mi? Ve büyüme hızına göre fiyatı makul mu?",
    ],
  },
  {
    title: "BIST Özgü",
    paragraphs: [
      "Türkiye'ye has faktörler bu hisseyi nasıl etkiliyor? Türkiye'de yatırım yaparken dört şeyi ayrıca göz önünde bulunduruyoruz:",
      "Birincisi, şirketin döviz geliri var mı? TL değer kaybettiğinde ihracat yapan şirketler kazanır, ithalata bağımlı şirketler zorlanır.",
      "İkincisi, enflasyon düşüldükten sonra bu hisse gerçekte ne kadar kazandırıyor? Nominal getiri her zaman gerçeği yansıtmaz.",
      "Üçüncüsü, hissenin ne kadarı piyasada serbestçe işlem görebiliyor? Bu oran çok düşükse fiyat kolayca manipüle edilebilir.",
      "Dördüncüsü, Merkez Bankası'nın faiz politikası bu şirketin sektörünü nasıl etkiliyor? Yüksek faiz bazı sektörleri zorlarken bazılarını destekler.",
    ],
  },
] as const;

export default function HowWeWorkPage() {
  return (
    <div className="landing-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="landing-shell__aurora pointer-events-none absolute inset-0" />
      <div className="landing-shell__grid pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:px-6">
          <section className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-8 backdrop-blur-xl sm:p-10">
            <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">FinCognis Metodoloji</p>
            <h1 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">Nasıl Çalışıyoruz</h1>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <article className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.52),rgba(2,6,23,0.78))] p-6 backdrop-blur-xl">
              <h2 className="font-display text-2xl font-semibold text-slate-100">Kısa Vadeli Analiz (1-4 Hafta)</h2>
              <div className="mt-5 space-y-5">
                {SHORT_TERM_SECTIONS.map((section) => (
                  <section key={section.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <h3 className="font-display text-lg font-semibold text-[#8ddfff]">{section.title}</h3>
                    <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-200">
                      {section.paragraphs.map((paragraph) => (
                        <p key={`${section.title}:${paragraph.slice(0, 24)}`}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </article>

            <article className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.52),rgba(2,6,23,0.78))] p-6 backdrop-blur-xl">
              <h2 className="font-display text-2xl font-semibold text-slate-100">Uzun Vadeli Analiz (3-12 Ay)</h2>
              <div className="mt-5 space-y-5">
                {LONG_TERM_SECTIONS.map((section) => (
                  <section key={section.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <h3 className="font-display text-lg font-semibold text-[#8ddfff]">{section.title}</h3>
                    <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-200">
                      {section.paragraphs.map((paragraph) => (
                        <p key={`${section.title}:${paragraph.slice(0, 24)}`}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </article>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
