import { AssetClass } from "@/components/tools/correlation/universal-asset-comparison";
import type { AnalyzeRequest } from "@/lib/contracts/universal-asset-schemas";

type DiscoverAsset = AnalyzeRequest["assets"][number];

function isDiscoverableStockCategory(category: DiscoverAsset["category"]): category is "BIST_STOCK" | "US_STOCK" {
  return category === "BIST_STOCK" || category === "US_STOCK";
}

export function filterDiscoverableStockAssets(assets: AnalyzeRequest["assets"]): AnalyzeRequest["assets"] {
  return assets.filter(
    (asset) => asset.class === AssetClass.Equity && isDiscoverableStockCategory(asset.category)
  );
}
