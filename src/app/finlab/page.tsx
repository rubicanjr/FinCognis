import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { SITE_NAME, createPageMetadata } from "@/lib/seo";

type BlogEntry = {
  id: number;
  title: string;
  keyword: string;
  concept: string;
};

type BlogSeries = {
  title: string;
  subtitle: string;
  entries: BlogEntry[];
};

const BLOG_SERIES: BlogSeries[] = [
  {
    title: "Seri 1 · Karar Odaklı Çekirdek",
    subtitle:
      "Yatırım kararlarının temelini oluşturan kritik sorular ve sistematik eleme yaklaşımı.",
    entries: [
      {
        id: 1,
        title: "Yatırım Kararı Almadan Önce Sormanız Gereken 5 Kritik Soru",
        keyword: "yatırım kararı verirken nelere dikkat",
        concept: "5 Soru Framework'ü",
      },
      {
        id: 2,
        title: "Doğru Hisseyi Seçmek Değil, Yanlış Kararı Elemek",
        keyword: "yatırımda en sık yapılan hatalar",
        concept: "Negatif Screening (6 Filtre)",
      },
      {
        id: 3,
        title: "Karar Anında Yaptığınız 3 Sistematik Hata",
        keyword: "karar hataları yatırım",
        concept: "3 Hata Türü (Zamansal, Duygusal, Bilişsel)",
      },
      {
        id: 4,
        title: "Veriye Sahipsiniz Ama Hâlâ Yanlış Karar Veriyorsunuz: Neden?",
        keyword: "veri vs karar kalitesi",
        concept: "Bilgi Paradoksu ve 5-7 Kritik Veri Sistemi",
      },
      {
        id: 5,
        title: "Bir Kararın \"İyi\" Olduğunu Nasıl Anlarsınız?",
        keyword: "karar kalitesi ölçümü",
        concept: "Outcome Bias ve Karar Kalitesi Matrisi",
      },
    ],
  },
  {
    title: "Seri 2 · Simülasyon / Senaryo",
    subtitle:
      "Piyasa şoklarına karşı portföy davranışını simüle eden senaryo odaklı karar çerçeveleri.",
    entries: [
      {
        id: 6,
        title: "BIST Düşerken Almak: Hangi Koşullarda Mantıklı?",
        keyword: "BIST düşerken hisse almak",
        concept: "Düşüşün Anatomisi (Sistemik vs Duygusal)",
      },
      {
        id: 7,
        title: "Faiz Artarken Hisse Alınır mı? Bir Senaryo Analizi",
        keyword: "faiz artarken yatırım",
        concept: "Faiz Hassasiyeti ve Sektörel Rotasyon",
      },
      {
        id: 8,
        title: "Risk-Off Dönemlerinde En Sık Yapılan Hata",
        keyword: "risk-off yatırım stratejisi",
        concept: "Flight-to-Safety Hatası ve Kademeli Risk Azaltma",
      },
      {
        id: 9,
        title: "Aynı Veriyle 2 Farklı Karar: Neden Sonuçlar Değişiyor?",
        keyword: "veri yorumlama farklılığı",
        concept: "Çerçeveleme Etkisi (Framing Effect)",
      },
      {
        id: 10,
        title: "1 Ay vs 1 Yıl: Zaman Ufku Kararı Nasıl Bozar?",
        keyword: "zaman ufku yatırım stratejisi",
        concept: "Miyopik Kayıptan Kaçınma (Myopic Loss Aversion)",
      },
    ],
  },
  {
    title: "Seri 3 · Davranışsal Finans",
    subtitle:
      "Psikolojik tuzakların karar kalitesi üzerindeki etkisini analiz eden davranış odaklı seri.",
    entries: [
      {
        id: 11,
        title: "Yatırımcılar Veriden Değil, Hikâyeden Neden Etkilenir?",
        keyword: "yatırımcı psikolojisi karar",
        concept: "Narrative Bias (Hikâye Yanlılığı)",
      },
      {
        id: 12,
        title: "\"Kaçırma Korkusu\" Kararlarınızı Nasıl Sabote Ediyor?",
        keyword: "FOMO yatırım hatası",
        concept: "FOMO ve Sosyal Kanıt (Social Proof)",
      },
      {
        id: 13,
        title: "Zarar Kesemeyen Yatırımcının Psikolojisi",
        keyword: "zarar kesme psikolojisi",
        concept: "Disposition Effect (Elden Çıkarma Etkisi)",
      },
      {
        id: 14,
        title: "Karar Yorgunluğu: En Pahalı Hata Türü",
        keyword: "karar yorgunluğu yatırım",
        concept: "Decision Fatigue ve Karar Otomasyonu",
      },
      {
        id: 15,
        title: "Kendine Güven mi, Aşırı Güven mi?",
        keyword: "aşırı güven hatasının maliyeti",
        concept: "Overconfidence Bias ve Pre-Mortem Analizi",
      },
    ],
  },
  {
    title: "Seri 4 · FinCognis Perspektifi",
    subtitle:
      "FinCognis'in karar simülasyonu yaklaşımını uygulamalı ve stratejik bir çerçevede sunar.",
    entries: [
      {
        id: 16,
        title: "Karar Simülasyonu Nedir ve Neden Geleceğin Standardı?",
        keyword: "karar simülasyonu yatırım",
        concept: "Tahmin vs Simülasyon (Prediction vs Simulation)",
      },
      {
        id: 17,
        title: "\"Ne Olur?\" Değil, \"Ne Zaman Kırılır?\" Diye Sormak",
        keyword: "portföy stres testi",
        concept: "Kırılma Noktası Analizi (Break-even)",
      },
      {
        id: 18,
        title: "Yatırımda Tahmin Değil, Koşul Analizi",
        keyword: "koşullu olasılık yatırım",
        concept: "Koşullu Olasılık (Conditional Probability)",
      },
      {
        id: 19,
        title: "Karar Öncesi Risk Görselleştirme: Yeni Nesil Yaklaşım",
        keyword: "risk görselleştirme portföy",
        concept: "Risk Dashboard ve Korelasyon Isı Haritası",
      },
      {
        id: 20,
        title: "Bir Kararı Simüle Etmek, Onu Neden Değiştirir?",
        keyword: "pre-mortem analizi yatırım",
        concept: "Pre-Mortem (Ölüm Öncesi) Analizi",
      },
    ],
  },
  {
    title: "Seri 5 · Agresif / Dikkat Çeken",
    subtitle:
      "Yatırımcının konfor alanını kırıp rasyonel sorumluluk ve hata yönetimi disiplini kurar.",
    entries: [
      {
        id: 21,
        title: "Çoğu Yatırım Kararı Aslında Hatalıdır",
        keyword: "yatırımda hata yönetimi",
        concept: "Hata Yapma Korkusu (Atychiphobia)",
      },
      {
        id: 22,
        title: "Kazanç Değil, Hata Azaltma Oyunu",
        keyword: "yatırım stratejisi oluşturma",
        concept: "Loser's Game (Kaybedenin Oyunu)",
      },
      {
        id: 23,
        title: "Piyasa Değil, Sen Yanılıyorsun",
        keyword: "yatırım psikolojisi",
        concept: "Kendine Atfetme Yanlılığı (Self-Attribution Bias)",
      },
      {
        id: 24,
        title: "Doğru Analiz, Yanlış Karar: Nasıl Mümkün?",
        keyword: "yatırım kararı nasıl verilir",
        concept: "Uygulama Boşluğu (Execution Gap)",
      },
      {
        id: 25,
        title: "Veri Artıyor, Karar Kalitesi Düşüyor",
        keyword: "finansal veri analizi",
        concept: "Bilgi Zehirlenmesi (Information Overload)",
      },
    ],
  },
];

export const metadata: Metadata = createPageMetadata({
  title: `${SITE_NAME} | FinLab`,
  description:
    "FinLab içerik merkezi: FinCognis'in yatırım karar kalitesine odaklanan 25 bölümlük profesyonel blog serisi.",
  path: "/finlab",
});

export default function FinLabPage() {
  return (
    <div className="landing-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="landing-shell__aurora pointer-events-none absolute inset-0" />
      <div className="landing-shell__grid pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-28 sm:px-6">
          <section className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-8 backdrop-blur-xl sm:p-10">
            <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">FinLab</p>
            <h1 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
              FinCognis Blog Serisi
            </h1>
            <p className="mt-4 max-w-4xl text-slate-300">
              Yatırım karar kalitesini sistematik biçimde geliştirmek için hazırlanan 5 serilik, 25 başlıktan oluşan
              profesyonel içerik haritası. Her başlık; karar psikolojisi, risk, simülasyon ve uygulama disiplini
              ekseninde yapılandırılmıştır.
            </p>
          </section>

          <section className="mt-8 grid gap-6">
            {BLOG_SERIES.map((series) => (
              <article
                key={series.title}
                className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.52),rgba(2,6,23,0.78))] p-6 backdrop-blur-xl sm:p-8"
              >
                <h2 className="font-display text-2xl font-semibold text-slate-50 md:text-3xl">{series.title}</h2>
                <p className="mt-2 text-sm text-slate-300 md:text-base">{series.subtitle}</p>

                <div className="mt-6 grid gap-4">
                  {series.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-white/12 bg-[#07122a]/70 p-4 transition-colors hover:border-[#8ddfff]/45"
                    >
                      <p className="text-xs font-semibold tracking-[0.08em] text-[#8ddfff]">YAZI {entry.id}</p>
                      <h3 className="mt-1 text-lg font-semibold leading-snug text-slate-100">{entry.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs md:text-sm">
                        <span className="rounded-full border border-[#8ddfff]/45 bg-[#082848] px-3 py-1 text-[#c9f1ff]">
                          Keyword: {entry.keyword}
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-slate-200">
                          Konsept: {entry.concept}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
