import { useEffect, useMemo, useState } from "react";
import {
  ASSET_CATALOG,
  type CatalogAsset,
  type CatalogAssetClass,
} from "@/data/asset-catalog";
import {
  searchYahooSymbols,
  type YahooSearchAsset,
} from "@/services/yahoo-symbol-search";
import { levenshteinDistance, normalizeSearchValue } from "@/utils/asset-validators";

export interface AssetSelectionPayload {
  ticker: string;
  yahooSymbol: string;
  assetClass: CatalogAssetClass;
  exchange: string;
  currency: "TRY" | "USD";
}

export interface AssetSearchOption extends AssetSelectionPayload {
  name: string;
  isVerified: boolean;
  aliases?: string[];
  source: "static_catalog" | "yahoo_search" | "yahoo_verify";
}

interface StaticRank {
  option: AssetSearchOption;
  group: 0 | 1 | 2 | 3;
  score: number;
}

function toSearchOption(
  asset: CatalogAsset | YahooSearchAsset,
  source: AssetSearchOption["source"] = "static_catalog"
): AssetSearchOption {
  return {
    ticker: asset.ticker,
    name: asset.name,
    exchange: asset.exchange,
    assetClass: asset.assetClass,
    yahooSymbol: asset.yahooSymbol,
    currency: asset.currency,
    isVerified: asset.isVerified,
    aliases: asset.aliases,
    source,
  };
}

function staticMatchRank(asset: CatalogAsset, normalizedQuery: string): StaticRank | null {
  if (!asset.isVerified) return null;

  const normalizedTicker = normalizeSearchValue(asset.ticker);
  const normalizedName = normalizeSearchValue(asset.name);
  const normalizedAliases = (asset.aliases ?? []).map((alias) => normalizeSearchValue(alias));

  if (normalizedTicker.startsWith(normalizedQuery)) {
    return {
      option: toSearchOption(asset, "static_catalog"),
      group: 0,
      score: normalizedTicker.length - normalizedQuery.length,
    };
  }

  if (normalizedName.includes(normalizedQuery)) {
    return {
      option: toSearchOption(asset, "static_catalog"),
      group: 1,
      score: normalizedName.indexOf(normalizedQuery),
    };
  }

  const aliasMatch = normalizedAliases.findIndex((alias) => alias.includes(normalizedQuery));
  if (aliasMatch >= 0) {
    return {
      option: toSearchOption(asset, "static_catalog"),
      group: 2,
      score: aliasMatch,
    };
  }

  if (normalizedQuery.length >= 3) {
    const distances = [
      levenshteinDistance(normalizedTicker, normalizedQuery),
      ...normalizedAliases.map((alias) => levenshteinDistance(alias, normalizedQuery)),
      levenshteinDistance(normalizedName, normalizedQuery),
    ];
    const minDistance = Math.min(...distances);
    if (Number.isFinite(minDistance) && minDistance <= 2) {
      return {
        option: toSearchOption(asset, "static_catalog"),
        group: 3,
        score: minDistance,
      };
    }
  }

  return null;
}

function searchStaticCatalog(query: string): AssetSearchOption[] {
  const normalizedQuery = normalizeSearchValue(query);
  if (normalizedQuery.length < 2) return [];

  const ranked = ASSET_CATALOG
    .map((asset) => staticMatchRank(asset, normalizedQuery))
    .filter((item): item is StaticRank => item !== null)
    .sort((left, right) => {
      if (left.group !== right.group) return left.group - right.group;
      if (left.score !== right.score) return left.score - right.score;
      return left.option.ticker.localeCompare(right.option.ticker);
    });

  return ranked.slice(0, 5).map((item) => item.option);
}

function dedupeOptions(options: AssetSearchOption[]): AssetSearchOption[] {
  const bucket = new Map<string, AssetSearchOption>();
  for (const option of options) {
    const key = option.ticker.toUpperCase();
    if (!bucket.has(key)) bucket.set(key, option);
  }
  return Array.from(bucket.values());
}

export function useAssetSearch(query: string, selectedTickers: string[]) {
  const [results, setResults] = useState<AssetSearchOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const selectedSet = useMemo(
    () => new Set(selectedTickers.map((ticker) => ticker.toUpperCase())),
    [selectedTickers]
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    let active = true;

    const timer = window.setTimeout(() => {
      const run = async () => {
        const local = searchStaticCatalog(trimmed);
        const localFiltered = local.filter((item) => !selectedSet.has(item.ticker.toUpperCase()));

        if (localFiltered.length >= 3) {
          if (active) {
            setResults(localFiltered.slice(0, 8));
            setIsLoading(false);
          }
          return;
        }

        if (active) setIsLoading(true);

        try {
          const remote = await searchYahooSymbols(trimmed);
          if (!active) return;

          const remoteFiltered = remote
            .filter((item) => item.isVerified)
            .map((item) => toSearchOption(item, item.source))
            .filter((item) => !selectedSet.has(item.ticker.toUpperCase()));

          const merged = dedupeOptions([...localFiltered, ...remoteFiltered]).slice(0, 8);
          setResults(merged);
        } catch {
          if (active) setResults(localFiltered.slice(0, 8));
        } finally {
          if (active) setIsLoading(false);
        }
      };

      void run();
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, selectedSet]);

  return { results, isLoading };
}
