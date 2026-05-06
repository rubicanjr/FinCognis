import { ASSET_BY_TICKER, STATIC_ALIAS_TO_TICKER, type CatalogAsset } from "@/data/asset-catalog";

export function normalizeSearchValue(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTickerInput(value: string): string {
  return value.toUpperCase().replace(/İ/g, "I").replace(/[^A-Z0-9]/g, "");
}

export function isTickerFormat(value: string): boolean {
  return /^[A-Z0-9]{2,12}$/.test(value);
}

export function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  const columns = right.length + 1;
  const rows = left.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let col = 0; col < columns; col += 1) matrix[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < columns; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[rows - 1][columns - 1];
}

export function resolveCatalogAssetByAliasOrTicker(rawValue: string): CatalogAsset | null {
  const normalizedText = normalizeSearchValue(rawValue);
  const aliasTicker = STATIC_ALIAS_TO_TICKER[normalizedText];
  if (aliasTicker) return ASSET_BY_TICKER[aliasTicker] ?? null;

  const normalizedTicker = normalizeTickerInput(rawValue);
  if (!normalizedTicker) return null;
  return ASSET_BY_TICKER[normalizedTicker] ?? null;
}

export function toYahooSymbolFromTicker(ticker: string): string {
  if (ticker.endsWith(".IS") || ticker.includes("=") || ticker.includes("-")) return ticker;
  if (/^[A-Z]{4,5}$/.test(ticker)) return `${ticker}.IS`;
  if (/^[A-Z]{6}$/.test(ticker)) return `${ticker}=X`;
  return ticker;
}
