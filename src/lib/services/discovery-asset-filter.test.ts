import { describe, expect, it } from "vitest";
import { AssetClass } from "@/components/tools/correlation/universal-asset-comparison";
import type { AnalyzeRequest } from "@/lib/contracts/universal-asset-schemas";
import { filterDiscoverableStockAssets } from "@/lib/services/discovery-asset-filter";

function makeAsset(
  symbol: string,
  category: AnalyzeRequest["assets"][number]["category"],
  assetClass: AssetClass = AssetClass.Equity
): AnalyzeRequest["assets"][number] {
  return {
    symbol,
    originalInput: symbol,
    class: assetClass,
    category,
  };
}

describe("filterDiscoverableStockAssets", () => {
  it("keeps only BIST and US stock categories", () => {
    const input: AnalyzeRequest["assets"] = [
      makeAsset("TUPRS", "BIST_STOCK"),
      makeAsset("AAPL", "US_STOCK"),
      makeAsset("BNB", "CRYPTO", AssetClass.Crypto),
      makeAsset("DOGE", "CRYPTO", AssetClass.Crypto),
      makeAsset("XAU", "COMMODITY", AssetClass.Commodity),
    ];

    const filtered = filterDiscoverableStockAssets(input);

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((asset) => asset.category === "BIST_STOCK" || asset.category === "US_STOCK")).toBe(true);
    expect(filtered.some((asset) => asset.symbol === "BNB" || asset.symbol === "DOGE")).toBe(false);
  });
});
