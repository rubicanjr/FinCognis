"use client";

interface MetricExplanationItem {
  title:
    | "En Kötü Düşüş"
    | "Riske Göre Kazanç"
    | "Enflasyon Sonrası Gerçek Kazanç"
    | "Piyasayı Geçme Gücü"
    | "Piyasa Sakinlik Durumu";
  description: string;
}

const METRIC_EXPLANATIONS: MetricExplanationItem[] = [
  {
    title: "En Kötü Düşüş",
    description:
      "Seçilen dönemde varlığın zirveden en dip noktaya kadar yaşadığı en büyük yüzdesel geri çekilmedir. Düşük değer, daha sınırlı kayıp profiline işaret eder.",
  },
  {
    title: "Riske Göre Kazanç",
    description:
      "Varlığın geçmiş performansının risk ayarlı gücüdür. Ortalama getiri, risksiz getiri ve oynaklık birlikte değerlendirilerek hesaplanır.",
  },
  {
    title: "Enflasyon Sonrası Gerçek Kazanç",
    description:
      "Varlığın nominal getirisinden enflasyon etkisi ayrıştırıldığında kalan reel performansı ifade eder. Farklı dönemlerde satın alma gücü etkisini görünür kılar.",
  },
  {
    title: "Piyasayı Geçme Gücü",
    description:
      "Varlığın referans piyasa endeksine göre göreli performansını özetler. Pozitif farklar, seçilen dönemde piyasa ortalamasının üzerinde seyre işaret eder.",
  },
  {
    title: "Piyasa Sakinlik Durumu",
    description:
      "Volatilitenin tarihsel rejim içindeki konumunu gösterir. EWMA ve çoklu pencere volatilite birlikte değerlendirilir; yüksek puan daha sakin ve stabil rejime yakınlığı ifade eder.",
  },
];

export default function MetricExplanation() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.78))] p-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5">
      <p className="font-display text-lg font-semibold tracking-[0.03em] text-[#8ddfff]">Metrik Rehberi</p>
      <div className="mt-3 space-y-3">
        {METRIC_EXPLANATIONS.map((item) => (
          <p
            key={item.title}
            className="rounded-lg border border-white/12 bg-slate-950/55 px-3 py-2 text-sm text-slate-100 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(148,163,184,0.18)]"
          >
            <span className="font-display text-base font-semibold tracking-[0.02em] text-[#8ddfff]">{item.title}:</span>{" "}
            {item.description}
          </p>
        ))}
      </div>
    </div>
  );
}
