import { ASSET_UNIVERSE } from "@/components/tools/correlation/universe";
import type { CategoryId } from "@/components/tools/correlation/types";

export enum AssetClass {
  Equity = "EQUITY",
  Crypto = "CRYPTO",
  Commodity = "COMMODITY",
  Index = "INDEX",
  FX = "FX",
  Bond = "BOND",
  Fund = "FUND",
  Unknown = "UNKNOWN",
}

export interface UniversalMetrics {
  risk: number;
  return: number;
  liquidity: number | null;
  diversification: number;
  calmness: number | null;
}

export type AnalyzeTimeHorizon = "1mo" | "1y" | "5y";

export interface AssetComputationMeta {
  isFallback: boolean;
  fallbackReasons: string[];
  modelVersion: string;
  timeHorizon: AnalyzeTimeHorizon;
}

export interface NormalizedAsset {
  symbol: string;
  originalInput: string;
  class: AssetClass;
  metrics: UniversalMetrics;
  computation?: AssetComputationMeta;
}

export type AliasDictionary = Record<string, string>;

export interface AssetCatalogItem {
  symbol: string;
  name: string;
  class: AssetClass;
  aliases: string[];
}

export interface AssetParserWarning {
  level: "info" | "warning";
  message: string;
}

export interface AssetParserResult {
  assets: NormalizedAsset[];
  warnings: AssetParserWarning[];
  truncated: boolean;
}

interface AssetParserConfig {
  aliasDictionary?: AliasDictionary;
  classBySymbol?: Record<string, AssetClass>;
  maxAssets?: number;
}

const DEFAULT_MAX_ASSETS = 10;
const MAJOR_FX_CODES = new Set(["USD", "EUR", "TRY", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"]);

const CATEGORY_TO_CLASS: Record<CategoryId, AssetClass> = {
  emtialar: AssetClass.Commodity,
  kripto: AssetClass.Crypto,
  turk_hisse: AssetClass.Equity,
  abd_hisse: AssetClass.Equity,
};

const BASE_ALIAS_SEEDS: AliasDictionary = {
  bitcoin: "BTC",
  btc: "BTC",
  ethereum: "ETH",
  eth: "ETH",
  solana: "SOL",
  sol: "SOL",
  "tüpraş": "TUPRS",
  tupras: "TUPRS",
  tuprs: "TUPRS",
  "altın": "XAU",
  altin: "XAU",
  gold: "XAU",
  xau: "XAU",
  "gümüş": "XAG",
  gumus: "XAG",
  silver: "XAG",
  paladyum: "XPD",
  palladium: "XPD",
  nasdaq: "NDX",
  "nasdaq 100": "NDX",
  ndx: "NDX",
  "s&p 500": "SPX",
  "sp 500": "SPX",
  sp500: "SPX",
  spx: "SPX",
  bist30: "BIST30",
  "bist 30": "BIST30",
  usdtry: "USDTRY",
  "usd/try": "USDTRY",
  eurusd: "EURUSD",
  "eur/usd": "EURUSD",
  eurobond: "EUROBOND",
  tahvil: "EUROBOND",
  bond: "EUROBOND",
  etf: "SPY",
  fon: "SPY",
  fund: "SPY",
};

const BASE_CLASS_SEEDS: Record<string, AssetClass> = {
  BTC: AssetClass.Crypto,
  ETH: AssetClass.Crypto,
  SOL: AssetClass.Crypto,
  TUPRS: AssetClass.Equity,
  THYAO: AssetClass.Equity,
  KCHOL: AssetClass.Equity,
  AAPL: AssetClass.Equity,
  TSLA: AssetClass.Equity,
  MSFT: AssetClass.Equity,
  XAU: AssetClass.Commodity,
  XAG: AssetClass.Commodity,
  XPD: AssetClass.Commodity,
  BRENT: AssetClass.Commodity,
  WTI: AssetClass.Commodity,
  NDX: AssetClass.Index,
  SPX: AssetClass.Index,
  BIST30: AssetClass.Index,
  USDTRY: AssetClass.FX,
  EURUSD: AssetClass.FX,
  EUROBOND: AssetClass.Bond,
  SPY: AssetClass.Fund,
  QQQ: AssetClass.Fund,
};

const CLASS_BASE_METRICS: Record<AssetClass, UniversalMetrics> = {
  [AssetClass.Equity]: { risk: 6.3, return: 7.1, liquidity: 7.2, diversification: 6.1, calmness: 6.0 },
  [AssetClass.Crypto]: { risk: 3.9, return: 8.2, liquidity: 8.1, diversification: 5.2, calmness: 4.2 },
  [AssetClass.Commodity]: { risk: 5.8, return: 6.4, liquidity: 7.3, diversification: 8.0, calmness: 5.8 },
  [AssetClass.Index]: { risk: 7.2, return: 6.8, liquidity: 9.0, diversification: 8.3, calmness: 6.6 },
  [AssetClass.FX]: { risk: 7.0, return: 5.2, liquidity: 9.2, diversification: 7.3, calmness: 6.1 },
  [AssetClass.Bond]: { risk: 8.1, return: 4.9, liquidity: 6.5, diversification: 8.2, calmness: 7.2 },
  [AssetClass.Fund]: { risk: 7.0, return: 6.3, liquidity: 8.3, diversification: 8.1, calmness: 6.5 },
  [AssetClass.Unknown]: { risk: 5.0, return: 5.0, liquidity: 5.0, diversification: 5.0, calmness: 5.0 },
};

function normalizeAliasKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeSymbol(value: string): string {
  return value
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/[^A-Z0-9]/g, "");
}

function normalizeAliasDictionary(aliasDictionary: AliasDictionary): AliasDictionary {
  return Object.entries(aliasDictionary).reduce<AliasDictionary>((acc, [alias, symbol]) => {
    acc[normalizeAliasKey(alias)] = normalizeSymbol(symbol);
    return acc;
  }, {});
}

function normalizeClassDictionary(classBySymbol: Record<string, AssetClass>): Record<string, AssetClass> {
  return Object.entries(classBySymbol).reduce<Record<string, AssetClass>>((acc, [symbol, assetClass]) => {
    acc[normalizeSymbol(symbol)] = assetClass;
    return acc;
  }, {});
}

function normalizeSeparators(rawInput: string): string {
  return rawInput
    .replace(/[\n;|]+/g, ",")
    .replace(/\s+(ve|and)\s+/gi, ",")
    .replace(/\s*\+\s*/g, ",")
    .trim();
}

function splitSegmentBySpace(segment: string, aliasDictionary: AliasDictionary): string[] {
  return segment
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .reduce<{ tokens: string[]; skipNext: boolean }>(
      (acc, word, index, words) => {
        if (acc.skipNext) return { tokens: acc.tokens, skipNext: false };
        const pair = `${word} ${words[index + 1] ?? ""}`.trim();
        const hasPairAlias = Boolean(words[index + 1]) && Boolean(aliasDictionary[normalizeAliasKey(pair)]);
        return hasPairAlias
          ? { tokens: [...acc.tokens, pair], skipNext: true }
          : { tokens: [...acc.tokens, word], skipNext: false };
      },
      { tokens: [], skipNext: false }
    ).tokens;
}

function tokenizeInput(rawInput: string, aliasDictionary: AliasDictionary): string[] {
  const normalized = normalizeSeparators(rawInput);
  if (!normalized) return [];
  const commaTokens = normalized
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  if (commaTokens.length !== 1) return commaTokens;
  const [single] = commaTokens;
  return !single || aliasDictionary[normalizeAliasKey(single)] ? commaTokens : splitSegmentBySpace(single, aliasDictionary);
}

function isLikelyFxPair(symbol: string): boolean {
  if (!/^[A-Z]{6}$/.test(symbol)) return false;
  const left = symbol.slice(0, 3);
  const right = symbol.slice(3, 6);
  return MAJOR_FX_CODES.has(left) && MAJOR_FX_CODES.has(right);
}

const CLASS_HEURISTICS: Array<{ target: AssetClass; test: (symbol: string, tokenKey: string) => boolean }> = [
  {
    target: AssetClass.FX,
    test: (symbol, tokenKey) => isLikelyFxPair(symbol) || /(usdtry|eurusd|fx|forex)/.test(tokenKey),
  },
  { target: AssetClass.Bond, test: (_, tokenKey) => /(bond|tahvil|eurobond)/.test(tokenKey) },
  { target: AssetClass.Fund, test: (_, tokenKey) => /(etf|fund|fon)/.test(tokenKey) },
  { target: AssetClass.Index, test: (_, tokenKey) => /(index|endeks|nasdaq|sp500|bist)/.test(tokenKey) },
  { target: AssetClass.Crypto, test: (_, tokenKey) => /(coin|crypto|btc|eth|sol)/.test(tokenKey) },
  {
    target: AssetClass.Commodity,
    test: (_, tokenKey) => /(gold|xau|silver|gumus|brent|wti|petrol|paladyum|palladium)/.test(tokenKey),
  },
  { target: AssetClass.Equity, test: (symbol) => /^[A-Z]{3,5}$/.test(symbol) },
];

function inferAssetClass(symbol: string, tokenKey: string, classBySymbol: Record<string, AssetClass>): AssetClass {
  return classBySymbol[symbol] ?? CLASS_HEURISTICS.find((rule) => rule.test(symbol, tokenKey))?.target ?? AssetClass.Unknown;
}

function stableHash(value: string): number {
  return value.split("").reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 19), 0);
}

function clampMetric(value: number): number {
  return Math.max(1, Math.min(10, Number(value.toFixed(1))));
}

function fallbackMetrics(symbol: string, assetClass: AssetClass): UniversalMetrics {
  const base = CLASS_BASE_METRICS[assetClass] ?? CLASS_BASE_METRICS[AssetClass.Unknown];
  const offset = (index: number) => ((stableHash(`${symbol}:${index}`) % 5) - 2) * 0.25;
  return {
    risk: clampMetric(base.risk + offset(0)),
    return: clampMetric(base.return + offset(1)),
    liquidity: base.liquidity === null ? null : clampMetric(base.liquidity + offset(2)),
    diversification: clampMetric(base.diversification + offset(3)),
    calmness: base.calmness === null ? null : clampMetric(base.calmness + offset(4)),
  };
}

function deduplicateBySymbol(assets: NormalizedAsset[]): NormalizedAsset[] {
  return Object.values(
    assets.reduce<Record<string, NormalizedAsset>>((acc, asset) => {
      if (!acc[asset.symbol]) acc[asset.symbol] = asset;
      return acc;
    }, {})
  );
}

function buildWarnings(inputCount: number, maxAssets: number, assets: NormalizedAsset[]): AssetParserWarning[] {
  const unknownInputs = assets.filter((asset) => asset.class === AssetClass.Unknown).map((asset) => asset.originalInput);
  return [
    ...(inputCount > maxAssets
      ? [{ level: "warning" as const, message: `Maksimum ${maxAssets} varlık işlenir. İlk ${maxAssets} varlık kullanıldı.` }]
      : []),
    ...(assets.length === 1
      ? [{ level: "info" as const, message: "Karşılaştırma önerisi: Birden fazla varlık girişi daha güçlü içgörü üretir." }]
      : []),
    ...(unknownInputs.length > 0
      ? [{ level: "warning" as const, message: `Tanınmayan varlıklar: ${unknownInputs.join(", ")}. Diğer varlıklar işlendi.` }]
      : []),
  ];
}

export function buildDefaultAliasDictionary(): AliasDictionary {
  const universeAliases = ASSET_UNIVERSE.reduce<AliasDictionary>((acc, asset) => {
    const ticker = normalizeSymbol(asset.ticker);
    return {
      ...acc,
      [normalizeAliasKey(asset.ticker)]: ticker,
      [normalizeAliasKey(asset.name)]: ticker,
    };
  }, {});
  return normalizeAliasDictionary({ ...BASE_ALIAS_SEEDS, ...universeAliases });
}

export function buildDefaultClassDictionary(): Record<string, AssetClass> {
  const universeClasses = ASSET_UNIVERSE.reduce<Record<string, AssetClass>>((acc, asset) => {
    acc[normalizeSymbol(asset.ticker)] = CATEGORY_TO_CLASS[asset.category];
    return acc;
  }, {});
  return normalizeClassDictionary({ ...BASE_CLASS_SEEDS, ...universeClasses });
}

export function buildAssetCatalog(): AssetCatalogItem[] {
  const aliasDictionary = buildDefaultAliasDictionary();
  const classBySymbol = buildDefaultClassDictionary();
  const nameBySymbol = ASSET_UNIVERSE.reduce<Record<string, string>>((acc, asset) => {
    acc[normalizeSymbol(asset.ticker)] = asset.name;
    return acc;
  }, {});
  const aliasesBySymbol = Object.entries(aliasDictionary).reduce<Record<string, string[]>>((acc, [alias, symbol]) => {
    acc[symbol] = [...(acc[symbol] ?? []), alias];
    return acc;
  }, {});

  return Object.keys(classBySymbol)
    .sort((left, right) => left.localeCompare(right))
    .map((symbol) => ({
      symbol,
      name: nameBySymbol[symbol] ?? symbol,
      class: classBySymbol[symbol] ?? AssetClass.Unknown,
      aliases: aliasesBySymbol[symbol] ?? [normalizeAliasKey(symbol)],
    }));
}

export class AssetParserService {
  private readonly aliasDictionary: AliasDictionary;
  private readonly classBySymbol: Record<string, AssetClass>;
  private readonly maxAssets: number;

  constructor(config: AssetParserConfig = {}) {
    this.aliasDictionary = normalizeAliasDictionary({
      ...buildDefaultAliasDictionary(),
      ...(config.aliasDictionary ?? {}),
    });
    this.classBySymbol = normalizeClassDictionary({
      ...buildDefaultClassDictionary(),
      ...(config.classBySymbol ?? {}),
    });
    this.maxAssets = config.maxAssets ?? DEFAULT_MAX_ASSETS;
  }

  parse(rawInput: string): AssetParserResult {
    const tokens = tokenizeInput(rawInput, this.aliasDictionary);
    const boundedTokens = tokens.slice(0, this.maxAssets);
    const assets = deduplicateBySymbol(boundedTokens.map((token) => this.normalizeToken(token)));
    return {
      assets,
      warnings: buildWarnings(tokens.length, this.maxAssets, assets),
      truncated: tokens.length > this.maxAssets,
    };
  }

  private normalizeToken(token: string): NormalizedAsset {
    const symbol = this.aliasDictionary[normalizeAliasKey(token)] ?? normalizeSymbol(token);
    const assetClass = inferAssetClass(symbol, normalizeAliasKey(token), this.classBySymbol);
    return {
      symbol,
      originalInput: token.trim(),
      class: assetClass,
      metrics: fallbackMetrics(symbol, assetClass),
      computation: {
        isFallback: true,
        fallbackReasons: ["parser_seed_metrics"],
        modelVersion: "analysis_engine_v2",
        timeHorizon: "1y",
      },
    };
  }
}

const defaultParserService = new AssetParserService();

export function parseUniversalAssets(rawInput: string): AssetParserResult {
  return defaultParserService.parse(rawInput);
}

