"use client";

interface MetricExplanationItem {
  title:
    | "Karar Simülasyonu"
    | "Risk Görselleştirme"
    | "Davranışsal Hata Analizi"
    | "Senaryo Tabanlı Analiz"
    | "Karar Öncesi Check Mekanizması";
  description: string;
}

const METRIC_EXPLANATIONS: MetricExplanationItem[] = [
  {
    title: "Karar Simülasyonu",
    description:
      "Karar vermeden önce olası senaryoları ve risk kırılım noktalarını görünür hale getirir. Sistem, “ne olur?” sorusundan çok “hangi koşulda kırılır?” sorusuna odaklanır.",
  },
  {
    title: "Risk Görselleştirme",
    description:
      "Karar sürecini tek bir metrik yerine olasılık dağılımı ile okur. Kazançtan önce downside tarafını netleştirerek risk profilini görünür kılar.",
  },
  {
    title: "Davranışsal Hata Analizi",
    description:
      "Yatırımcıların tekrar eden karar hatalarını tespit etmeye odaklanır. Sadece sonucu değil, karar alma biçimini de analize dahil eder.",
  },
  {
    title: "Senaryo Tabanlı Analiz",
    description:
      "Piyasa verisini tek başına değil, faiz-likidite-sentiment gibi koşullar altında anlamlandırır. Böylece veriyi bağlama yerleştirerek daha tutarlı bir çerçeve üretir.",
  },
  {
    title: "Karar Öncesi Check Mekanizması",
    description:
      "Kullanıcının karar vermeden önce geçmesi gereken bir kontrol katmanı sağlar. Amaç hızlı karar değil, doğru anda doğru kararı destekleyen disiplinli filtrelemedir.",
  },
];

export default function MetricExplanation() {
  return (
    <div className="tools-card rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.78))] p-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5">
      <p className="font-display text-lg font-semibold tracking-[0.03em] text-[#8ddfff]">Metrik Rehberi</p>
      <div className="mt-3 space-y-3">
        {METRIC_EXPLANATIONS.map((item) => (
          <p
            key={item.title}
            className="tools-chip rounded-lg border border-white/12 bg-slate-950/55 px-3 py-2 text-sm text-slate-100 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(148,163,184,0.18)]"
          >
            <span className="font-display text-base font-semibold tracking-[0.02em] text-[#8ddfff]">{item.title}:</span>{" "}
            {item.description}
          </p>
        ))}
      </div>
    </div>
  );
}

