import { describe, expect, it } from "vitest";
import { parseDecisionInput, extractIntent, normalizeAssets } from "@/lib/services/decision-input-parser";

describe("decision-input-parser", () => {
  it("separates intent extraction from asset normalization", () => {
    const intent = extractIntent("BTC yerine XAU nasil?");
    const assets = normalizeAssets("BTC yerine XAU nasil?");

    expect(intent.intent).toBe("REPLACE");
    expect(assets.symbols).toEqual(["BTC", "XAU"]);
  });

  it("applies punctuation stripping and stop-word removal before alias mapping", () => {
    const parsed = normalizeAssets("TUPRS ve BTC karşılaştır!!!");
    expect(parsed.normalizedQuery.toLocaleLowerCase("tr-TR")).toBe("tuprs ve btc");
    expect(parsed.symbols).toEqual(["TUPRS", "BTC"]);
  });

  it("parses combined decision input with strict shape", () => {
    const parsed = parseDecisionInput("ETH eklemeli miyim?");
    expect(parsed.intent.intent).toBe("ADD");
    expect(parsed.assets.symbols).toContain("ETH");
    expect(Array.isArray(parsed.assets.warnings)).toBe(true);
  });
});
