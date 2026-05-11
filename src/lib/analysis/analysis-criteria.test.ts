import { describe, expect, it } from "vitest";
import { resolveAnalysisCriteria } from "@/lib/analysis/analysis-criteria";

describe("resolveAnalysisCriteria", () => {
  it("returns short-term criteria for BIST with BIST-specific metric", () => {
    const criteria = resolveAnalysisCriteria({ timeHorizon: "1mo", marketType: "BIST" });
    expect(criteria.map((item) => item.label)).toEqual([
      "Teknik Momentum",
      "Kurumsal Akış",
      "Katalizör Takvimi",
      "BIST Özgü",
    ]);
  });

  it("returns short-term criteria for US without BIST-specific metric", () => {
    const criteria = resolveAnalysisCriteria({ timeHorizon: "1mo", marketType: "US" });
    expect(criteria.map((item) => item.label)).toEqual([
      "Teknik Momentum",
      "Kurumsal Akış",
      "Katalizör Takvimi",
    ]);
  });

  it("returns long-term criteria for BIST with BIST-specific metric", () => {
    const criteria = resolveAnalysisCriteria({ timeHorizon: "1y", marketType: "BIST" });
    expect(criteria.map((item) => item.label)).toEqual([
      "Kazanç Kalitesi",
      "Sermaye Tahsisi",
      "Değerleme",
      "BIST Özgü",
    ]);
  });

  it("maps unknown horizon fallback to long-term criteria", () => {
    const criteria = resolveAnalysisCriteria({ timeHorizon: "5y", marketType: "US" });
    expect(criteria.map((item) => item.label)).toEqual([
      "Kazanç Kalitesi",
      "Sermaye Tahsisi",
      "Değerleme",
    ]);
  });

  it("shows BIST-specific metric on fallback long horizon for BIST", () => {
    const criteria = resolveAnalysisCriteria({ timeHorizon: "5y", marketType: "BIST" });
    expect(criteria.map((item) => item.label)).toEqual([
      "Kazanç Kalitesi",
      "Sermaye Tahsisi",
      "Değerleme",
      "BIST Özgü",
    ]);
  });
});
