import { NextResponse } from "next/server";
import { AssetClass } from "@/components/tools/correlation/universal-asset-comparison";
import {
  ASSET_CATALOG,
  STATIC_ALIAS_TO_TICKER,
  type CatalogAssetClass,
} from "@/data/asset-catalog";
import { AssetsApiResponseSchema } from "@/lib/contracts/universal-asset-schemas";

export const revalidate = 300;

function normalizeAliasKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function toAssetClass(assetClass: CatalogAssetClass): AssetClass {
  if (assetClass === "equity_bist" || assetClass === "equity_us") return AssetClass.Equity;
  if (assetClass === "crypto") return AssetClass.Crypto;
  if (assetClass === "commodity") return AssetClass.Commodity;
  if (assetClass === "fx") return AssetClass.FX;
  if (assetClass === "etf_us") return AssetClass.Fund;
  return AssetClass.Unknown;
}

function toAssetCategory(assetClass: CatalogAssetClass): "BIST_STOCK" | "US_STOCK" | "CRYPTO" | "COMMODITY" | "FX" | "US_ETF" {
  if (assetClass === "equity_bist") return "BIST_STOCK";
  if (assetClass === "equity_us") return "US_STOCK";
  if (assetClass === "crypto") return "CRYPTO";
  if (assetClass === "commodity") return "COMMODITY";
  if (assetClass === "fx") return "FX";
  return "US_ETF";
}

export async function GET() {
  const payload = AssetsApiResponseSchema.parse({
    assets: ASSET_CATALOG.filter((asset) => asset.isVerified).map((asset) => ({
      symbol: asset.ticker,
      name: asset.name,
      class: toAssetClass(asset.assetClass),
      category: toAssetCategory(asset.assetClass),
      aliases: Array.from(
        new Set([
          normalizeAliasKey(asset.ticker),
          normalizeAliasKey(asset.name),
          ...(asset.aliases ?? []).map((alias) => normalizeAliasKey(alias)),
        ]).values()
      ).filter(Boolean),
    })),
    aliasDictionary: Object.entries(STATIC_ALIAS_TO_TICKER).reduce<Record<string, string>>(
      (acc, [alias, ticker]) => {
        const normalized = normalizeAliasKey(alias);
        if (normalized) acc[normalized] = ticker.toUpperCase();
        return acc;
      },
      {}
    ),
    meta: {
      mode: "realtime_gateway",
      provider: "Yahoo Finance MarketDataGateway",
      fetchedAtIso: new Date().toISOString(),
      note: "Katalog doğrulanmış varlık listesi ve canlı piyasa sembolleriyle senkronize edilir.",
    },
  });

  return NextResponse.json(payload, { status: 200 });
}
