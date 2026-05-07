export const SCREENING_TRIGGERS = [
  "tarama yap",
  "bist analiz",
  "en iyi hisseler",
  "hisse öner",
  "sohbete çalışmanı yapar mısın",
  "hangi hisseler",
  "bist30 analiz",
] as const;

const DISCLAIMER =
  "Bu çıktı eğitim amaçlıdır, yatırım tavsiyesi değildir. SPK lisanslı bir danışmana başvurunuz.";

export function isScreeningIntent(message: string): boolean {
  const lower = message.toLocaleLowerCase("tr-TR");
  return SCREENING_TRIGGERS.some((trigger) => lower.includes(trigger));
}

export function resolveScreeningHorizon(message: string): "short" | "medium" | "long" | null {
  const lower = message.toLocaleLowerCase("tr-TR");
  if (lower.includes("kısa") || lower.includes("kisa")) return "short";
  if (lower.includes("uzun")) return "long";
  if (lower.includes("orta")) return "medium";
  return null;
}

export function buildScreeningPrompt(message: string) {
  const horizon = resolveScreeningHorizon(message);
  if (!horizon) {
    return {
      mode: "screening_intent",
      nextQuestion: "Yatırım ufkunuz nedir? (Kısa/Orta/Uzun)",
      disclaimer: DISCLAIMER,
    };
  }

  const horizonLabel = horizon === "short" ? "Kısa" : horizon === "long" ? "Uzun" : "Orta";
  return {
    mode: "screening_intent",
    horizon,
    message: `BIST30 evreni için ${horizonLabel} vadede eğitimsel filtreleme akışı hazırlandı. Veri doğrulaması sonrası öne çıkan hisseler metrik kartları ile gösterilecektir.`,
    followUp: "Detaylı analiz ister misiniz?",
    disclaimer: DISCLAIMER,
  };
}

