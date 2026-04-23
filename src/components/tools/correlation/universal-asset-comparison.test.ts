import { describe, expect, it } from "vitest";
import { AssetClass, AssetParserService } from "@/components/tools/correlation/universal-asset-comparison";

describe("AssetParserService", () => {
  const parser = new AssetParserService();

  it("normalizes mixed-class assets into the universal framework", () => {
    const result = parser.parse("TUPRS, Bitcoin, Paladyum");
    const symbols = result.assets.map((asset) => asset.symbol);
    const classes = result.assets.map((asset) => asset.class);

    expect(symbols).toEqual(expect.arrayContaining(["TUPRS", "BTC", "XPD"]));
    expect(classes).toEqual(expect.arrayContaining([AssetClass.Equity, AssetClass.Crypto, AssetClass.Commodity]));
    expect(result.assets.every((asset) => asset.metrics.risk >= 1 && asset.metrics.risk <= 10)).toBe(true);
  });

  it("supports lowercase/turkish aliases and space-separated input", () => {
    const result = parser.parse("btc tüpraş gold");
    expect(result.assets.map((asset) => asset.symbol)).toEqual(expect.arrayContaining(["BTC", "TUPRS", "XAU"]));
  });

  it("keeps processing valid assets when unknown assets appear", () => {
    const result = parser.parse("BTC, BilinmeyenVarlik, XAU");
    const unknownAsset = result.assets.find((asset) => asset.originalInput === "BilinmeyenVarlik");

    expect(result.assets.some((asset) => asset.symbol === "BTC")).toBe(true);
    expect(result.assets.some((asset) => asset.symbol === "XAU")).toBe(true);
    expect(unknownAsset?.class).toBe(AssetClass.Unknown);
    expect(result.warnings.some((warning) => warning.message.includes("Tanınmayan varlıklar"))).toBe(true);
  });

  it("warns when only one asset is provided but still returns output", () => {
    const result = parser.parse("Bitcoin");
    expect(result.assets).toHaveLength(1);
    expect(result.warnings.some((warning) => warning.message.includes("Karşılaştırma önerisi"))).toBe(true);
  });

  it("applies max-10 constraint and reports truncation", () => {
    const result = parser.parse("btc, eth, xau, xag, brent, wti, tuprs, thyao, kchol, aapl, tsla, ndx");
    expect(result.assets.length).toBeLessThanOrEqual(10);
    expect(result.truncated).toBe(true);
    expect(result.warnings.some((warning) => warning.message.includes("Maksimum 10 varlık"))).toBe(true);
  });

  it("never returns comparability rejection messaging", () => {
    const result = parser.parse("BTC, TUPRS, XAU");
    const hasForbiddenText = result.warnings.some((warning) =>
      warning.message.toLocaleLowerCase("tr-TR").includes("karsilastirilamaz")
    );
    expect(hasForbiddenText).toBe(false);
  });
});

