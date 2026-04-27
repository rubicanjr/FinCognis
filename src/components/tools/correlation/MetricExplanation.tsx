"use client";

interface MetricExplanationItem {
  title: "Risk Düzeyi" | "Kazanç Potansiyeli" | "Nakde Çevirme Kolaylığı" | "Portföy Dengeleme Gücü";
  description: string;
}

const METRIC_EXPLANATIONS: MetricExplanationItem[] = [
  {
    title: "Risk Düzeyi",
    description:
      "Varlığın fiyatındaki dalgalanma (volatilite) ve ani kayıp ihtimalidir. Tarihsel fiyat hareketlerinin standart sapması ile hesaplanır.",
  },
  {
    title: "Kazanç Potansiyeli",
    description:
      "Varlığın geçmiş verilere göre kazandırma potansiyelidir. Belirli periyotlardaki büyüme oranlarının ortalaması alınarak ölçülür.",
  },
  {
    title: "Nakde Çevirme Kolaylığı",
    description:
      "Varlığın değer kaybetmeden ne kadar hızlı nakde çevrilebileceğidir. İşlem hacmi ve piyasa derinliği ile hesaplanır.",
  },
  {
    title: "Portföy Dengeleme Gücü",
    description:
      "Bu varlığın portföyünüzdeki diğer varlıklarla ne kadar \"zıt\" hareket ettiğidir. Korelasyon katsayıları kullanılarak ölçülür; zıt hareket edenler riski dengelediği için yüksek puan alır.",
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
