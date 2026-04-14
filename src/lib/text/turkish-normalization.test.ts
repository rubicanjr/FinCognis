import { describe, expect, it } from "vitest";
import { normalizeTurkishText } from "@/lib/text/turkish-normalization";

describe("normalizeTurkishText", () => {
  it("normalizes latin fallback strings into Turkish characters", () => {
    const input = "Urun Acik, Sifir Guven Cozumleri ve Gorsel Ongoruler";

    const output = normalizeTurkishText(input);

    expect(output).toBe("Ürün Açık, Sıfır Güven Çözümleri ve Görsel Öngörüler");
  });
});

