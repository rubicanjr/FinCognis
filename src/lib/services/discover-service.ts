import { AssetClass, type AnalysisCriterionScoreId, type NormalizedAsset } from "@/components/tools/correlation/universal-asset-comparison";
import { ASSET_CATALOG } from "@/data/asset-catalog";
import type { DiscoverRequest, DiscoverResponse } from "@/lib/contracts/universal-asset-schemas";
import { marketDataGateway } from "@/lib/gateways/market-data-gateway";
import { SPK_LEGAL_DISCLAIMER } from "@/lib/legal/spk-disclaimer";
import { analyzeUniversalAssets } from "@/lib/services/universal-asset-analysis-service";

type DiscoverProgressEvent = {
  scanned: number;
  total: number;
  percent: number;
  message: string;
};

type MacroSource = "tcmb_evds_live" | "last_known_fallback";

interface MacroSnapshot {
  policyRate: number;
  source: MacroSource;
  fetchedAtIso: string;
  note?: string;
}

interface BaseDiscoverRow {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  sectorSource: "yahoo" | "static_map" | "unknown";
  criteriaScores: NormalizedAsset["criteriaScores"];
  computation?: NormalizedAsset["computation"];
}

interface DiscoverBaseCacheValue {
  rows: BaseDiscoverRow[];
  totalScanned: number;
  builtAtMs: number;
}

interface CacheEntry<TValue> {
  expiresAt: number;
  value: TValue;
}

const DISCOVER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const POLICY_CACHE_TTL_MS = 60 * 60 * 1000;
const YAHOO_BASE_URL = "https://query2.finance.yahoo.com";
const YAHOO_FALLBACK_BASE_URL = "https://query1.finance.yahoo.com";
const YAHOO_TIMEOUT_MS = 6000;
const YAHOO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const LAST_KNOWN_POLICY_RATE_DEFAULT = 46;
const LAST_KNOWN_POLICY_RATE = (() => {
  const candidate = process.env.LAST_KNOWN_POLICY_RATE;
  if (!candidate) return LAST_KNOWN_POLICY_RATE_DEFAULT;
  const parsed = Number(candidate.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : LAST_KNOWN_POLICY_RATE_DEFAULT;
})();
const POLICY_SERIES = "TP.MB.S.AOFON";
const POLICY_SERIES_RESPONSE_KEY = "TP_MB_S_AOFON";
const DISCLAIMER = SPK_LEGAL_DISCLAIMER;

const baseDiscoverCache = new Map<string, CacheEntry<DiscoverBaseCacheValue>>();
let policyRateCache: CacheEntry<MacroSnapshot> | null = null;

const SHORT_METRIC_KEYS: AnalysisCriterionScoreId[] = ["teknik_momentum", "kurumsal_akis", "katalizor_takvimi"];
const LONG_METRIC_KEYS: AnalysisCriterionScoreId[] = ["kazanc_kalitesi", "sermaye_tahsisi", "degerleme", "bist_ozgu"];

const BIST_SECTOR_MAP: Record<string, string> = {
  // GYO
  EKGYO: "real estate",
  ISGYO: "real estate",
  ALGYO: "real estate",
  NUGYO: "real estate",
  // Bankacılık
  AKBNK: "financials",
  GARAN: "financials",
  ISCTR: "financials",
  HALKB: "financials",
  YKBNK: "financials",
  VAKBN: "financials",
  ALBRK: "financials",
  QNBFB: "financials",
  // Sigorta/Finans
  SAHOL: "financials",
  KCHOL: "financials",
  // Tüketici
  BIMAS: "consumer cyclical",
  MGROS: "consumer cyclical",
  SOKM: "consumer cyclical",
  ARCLK: "consumer cyclical",
  // Sanayi/İhracat
  EREGL: "industrials",
  KRDMD: "industrials",
  FROTO: "industrials",
  TOASO: "industrials",
  TKFEN: "industrials",
  ENKAI: "industrials",
  // Enerji
  TUPRS: "energy",
  AKSEN: "energy",
  ODAS: "energy",
  ZOREN: "energy",
  // Savunma
  ASELS: "aerospace & defense",
  RODRG: "aerospace & defense",
  // Havacılık
  THYAO: "industrials",
  PGSUS: "industrials",
  TAVHL: "industrials",
  // Telecom
  TCELL: "communication services",
  TTKOM: "communication services",
  // Diğer
  LOGO: "technology",
  INDES: "technology",
  SISE: "industrials",
  PETKM: "energy",
  DOHOL: "industrials",
  KOZAL: "materials",
  KOZA1: "materials",
  // Ek kapsam: Sanayi
  CCOLA: "consumer cyclical",
  ULKER: "consumer cyclical",
  PRKAB: "industrials",
  BRSAN: "industrials",
  CIMSA: "industrials",
  AKCNS: "industrials",
  ADANA: "industrials",
  BOLUC: "industrials",
  GOLTS: "industrials",
  // Enerji/Petrokimya
  AYGAZ: "energy",
  SELEC: "industrials",
  // GYO genişlet
  OZGYO: "real estate",
  PEGYO: "real estate",
  TRGYO: "real estate",
  VKGYO: "real estate",
  YIGIT: "real estate",
  // Teknoloji
  NETAS: "technology",
  ESCOM: "technology",
  ARENA: "technology",
  // Finans dışı holding
  DOAS: "consumer cyclical",
  OTKAR: "industrials",
  // Kimya/İlaç
  ECILC: "healthcare",
  SELVA: "healthcare",
  // Unknown listesinden eklenenler
  AEFES: "consumer cyclical",
  AGHOL: "financials",
  AGROT: "industrials",
  AHGAZ: "energy",
  AKFYE: "energy",
  AKSA: "industrials",
  ALARK: "industrials",
  ALFAS: "industrials",
  ALTNY: "aerospace & defense",
  ANHYT: "financials",
  ANSGR: "financials",
  ARDYZ: "technology",
  ASTOR: "industrials",
  AVPGY: "real estate",
  BERA: "industrials",
  BSOKE: "industrials",
  BTCIM: "industrials",
  CANTE: "energy",
  ENERY: "energy",
  ENJSA: "energy",
  GUBRF: "materials",
  HEKTS: "materials",
  ISMEN: "financials",
  KLSER: "industrials",
  MAVI: "consumer cyclical",
  OYAKC: "industrials",
  REEDR: "technology",
  SASA: "materials",
  SKBNK: "financials",
  TABGD: "consumer cyclical",
  TTRAK: "industrials",
  VESTL: "consumer cyclical",
};

const METRIC_LABELS: Record<AnalysisCriterionScoreId, string> = {
  teknik_momentum: "Teknik Momentum",
  kurumsal_akis: "Kurumsal Akış",
  katalizor_takvimi: "Katalizör Takvimi",
  kazanc_kalitesi: "Kazanç Kalitesi",
  sermaye_tahsisi: "Sermaye Tahsisi",
  degerleme: "Değerleme",
  bist_ozgu: "BIST Özgü",
};

const BIST30_SET = new Set<string>([
  "AKBNK", "AKSEN", "ASELS", "BIMAS", "EKGYO", "ENKAI", "EREGL", "FROTO", "GARAN", "GUBRF",
  "HEKTS", "ISCTR", "KCHOL", "KRDMD", "MGROS", "ODAS", "PETKM", "PGSUS", "SAHOL", "SASA",
  "SISE", "TAVHL", "TCELL", "THYAO", "TKFEN", "TOASO", "TTKOM", "TUPRS", "VESTL", "YKBNK",
]);

const BIST100_SET = new Set<string>([
  ...Array.from(BIST30_SET.values()),
  "AEFES", "AGHOL", "AHGAZ", "AKSA", "ALARK", "ALBRK", "ALKIM", "ANHYT", "ARCLK", "ATLAS", "AYDEM", "BAGFS",
  "BASGZ", "BERA", "BRISA", "BTCIM", "CATKD", "CCOLA", "CIMSA", "CRDFA", "CYTLO", "DAGI", "DEVA", "DOAS",
  "DOHOL", "ECILC", "EGEEN", "EKIZ", "ELITE", "ENJSA", "ERBOS", "ETGYO", "EZAJ", "FLAP", "FENIS", "GESN",
  "GLYHO", "GOZDE", "GSDDE", "GSRAY", "HALKB", "IPEKE", "ISGYO", "ISMEN", "IZFAS", "IZMDC", "KARSN", "KLNMA",
  "KONTR", "KORDS", "KOZAA", "KOZAL", "KTSKR", "LKMAN", "MAVI", "METUR", "MPARK", "NTHOL", "NUHCM", "OTKAR",
  "OYAKC", "PNSUT", "POLTK", "QNBFL", "RCSGD", "RYGYO", "SAFKR", "SARKY", "SELGD", "SKBNK", "SMRTG", "SNGYR",
  "SNPAM", "SOKM", "TABGD", "TMSN", "TRGYO", "TSKZ", "TTRAK", "TUKAS", "ULASK", "ULUUN", "UNYEC", "UZUCB",
  "VAKBN", "VERUS", "VKFYO", "VTKFO", "YATAS", "YESYU", "ZOREN",
]);

function chunkArray<TItem>(items: TItem[], size: number): TItem[][] {
  if (size <= 0) return [items];
  const chunks: TItem[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toDailyCacheKey(horizon: DiscoverRequest["horizon"]): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${horizon}:${day}`;
}

function ageLabel(builtAtMs: number): string {
  const ageMs = Math.max(0, Date.now() - builtAtMs);
  const minutes = Math.floor(ageMs / 60000);
  if (minutes < 1) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes > 0 ? `${hours}h ${restMinutes}m` : `${hours}h`;
}

function mapHorizonToAnalyze(horizon: DiscoverRequest["horizon"]): "1mo" | "1y" {
  return horizon === "short" ? "1mo" : "1y";
}

function getLiveBistUniverse(minMarketCap: DiscoverRequest["minMarketCap"]): Array<{ ticker: string; name: string }> {
  const seen = new Set<string>();
  return ASSET_CATALOG.filter((asset) => asset.assetClass === "equity_bist")
    .filter((asset) => {
      const ticker = asset.ticker.toUpperCase();
      if (minMarketCap === "bist30") return BIST30_SET.has(ticker);
      if (minMarketCap === "bist100") return BIST100_SET.has(ticker);
      return true;
    })
    .filter((asset) => {
      const upper = asset.ticker.toUpperCase();
      if (seen.has(upper)) return false;
      seen.add(upper);
      return true;
    })
    .map((asset) => ({ ticker: asset.ticker.toUpperCase(), name: asset.name }));
}

function hasUsableCriteriaScore(asset: NormalizedAsset, metricId: AnalysisCriterionScoreId): boolean {
  const item = asset.criteriaScores?.[metricId];
  return Boolean(item?.available && typeof item.score === "number");
}

function isDataWarningRow(asset: NormalizedAsset, metricIds: AnalysisCriterionScoreId[]): boolean {
  const available = metricIds.filter((metricId) => hasUsableCriteriaScore(asset, metricId));
  return available.length === 0;
}

function normalizeWeights(weights: Record<string, number>, keys: string[]): Record<string, number> {
  const source = keys.reduce<Record<string, number>>((acc, key) => {
    const value = Number.isFinite(weights[key]) ? Math.max(0, weights[key] ?? 0) : 0;
    acc[key] = value;
    return acc;
  }, {});
  const total = Object.values(source).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    const equal = 100 / keys.length;
    return keys.reduce<Record<string, number>>((acc, key) => {
      acc[key] = equal;
      return acc;
    }, {});
  }
  return keys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = (source[key] / total) * 100;
    return acc;
  }, {});
}

function resolveProfileWeights(request: DiscoverRequest): Record<AnalysisCriterionScoreId, number> {
  if (request.horizon === "short") {
    const normalized = normalizeWeights(
      {
        teknik_momentum: request.profileWeights.teknikMomentum ?? 0,
        kurumsal_akis: request.profileWeights.kurumsalAkis ?? 0,
        katalizor_takvimi: request.profileWeights.katalizorTakvimi ?? 0,
      },
      ["teknik_momentum", "kurumsal_akis", "katalizor_takvimi"]
    );
    return {
      teknik_momentum: normalized.teknik_momentum,
      kurumsal_akis: normalized.kurumsal_akis,
      katalizor_takvimi: normalized.katalizor_takvimi,
      kazanc_kalitesi: 0,
      sermaye_tahsisi: 0,
      degerleme: 0,
      bist_ozgu: 0,
    };
  }

  const normalized = normalizeWeights(
    {
      kazanc_kalitesi: request.profileWeights.kazancKalitesi ?? 0,
      sermaye_tahsisi: request.profileWeights.sermayeTahsisi ?? 0,
      degerleme: request.profileWeights.degerleme ?? 0,
      bist_ozgu: request.profileWeights.bistOzgu ?? 0,
    },
    ["kazanc_kalitesi", "sermaye_tahsisi", "degerleme", "bist_ozgu"]
  );

  return {
    teknik_momentum: 0,
    kurumsal_akis: 0,
    katalizor_takvimi: 0,
    kazanc_kalitesi: normalized.kazanc_kalitesi,
    sermaye_tahsisi: normalized.sermaye_tahsisi,
    degerleme: normalized.degerleme,
    bist_ozgu: normalized.bist_ozgu,
  };
}

type SectorBucket = "reit" | "consumer" | "banking" | "export" | "defense" | "energy" | "other";

function normalizeSectorText(value: string): string {
  return value.toLocaleLowerCase("tr-TR").trim();
}

function classifySectorBucket(
  sector: string,
  industry: string
): { bucket: SectorBucket; mapped: boolean } {
  const normalizedSector = normalizeSectorText(sector);
  const normalizedIndustry = normalizeSectorText(industry);
  const text = `${normalizedSector} ${normalizedIndustry}`;

  const containsAny = (keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

  if (containsAny(["real estate", "gayrimenkul", "reit", "gyo"])) {
    return { bucket: "reit", mapped: true };
  }
  if (containsAny(["financials", "financial services", "bank", "bankacılık", "bankacilik"])) {
    return { bucket: "banking", mapped: true };
  }
  if (containsAny(["consumer cyclical", "consumer defensive", "consumer", "retail", "perakende", "gıda", "gida"])) {
    return { bucket: "consumer", mapped: true };
  }
  if (containsAny(["aerospace & defense", "defense", "savunma"])) {
    return { bucket: "defense", mapped: true };
  }
  if (containsAny(["energy", "enerji", "electric", "elektrik", "oil", "gaz"])) {
    return { bucket: "energy", mapped: true };
  }
  if (containsAny(["industrials", "industrial", "sanayi", "manufacturing", "steel", "cement", "otomotiv", "airlines", "export"])) {
    return { bucket: "export", mapped: true };
  }

  return { bucket: "other", mapped: false };
}

function resolveMacroCoefficient(
  policyRate: number,
  sector: string,
  industry: string
): { coefficient: number; sectorMapped: boolean } {
  const { bucket, mapped } = classifySectorBucket(sector, industry);

  if (!mapped) {
    return { coefficient: 1, sectorMapped: false };
  }

  if (policyRate > 40) {
    if (bucket === "reit") return { coefficient: 0.4, sectorMapped: true };
    if (bucket === "consumer") return { coefficient: 0.65, sectorMapped: true };
    if (bucket === "banking") return { coefficient: 0.75, sectorMapped: true };
    if (bucket === "energy") return { coefficient: 0.9, sectorMapped: true };
    return { coefficient: 1, sectorMapped: true };
  }
  if (policyRate > 30) {
    if (bucket === "reit") return { coefficient: 0.6, sectorMapped: true };
    if (bucket === "consumer") return { coefficient: 0.8, sectorMapped: true };
    if (bucket === "banking") return { coefficient: 0.85, sectorMapped: true };
    if (bucket === "energy") return { coefficient: 0.95, sectorMapped: true };
    return { coefficient: 1, sectorMapped: true };
  }
  if (policyRate < 20) {
    if (bucket === "reit") return { coefficient: 1.2, sectorMapped: true };
    if (bucket === "consumer") return { coefficient: 1.15, sectorMapped: true };
    if (bucket === "banking") return { coefficient: 1.1, sectorMapped: true };
  }
  return { coefficient: 1, sectorMapped: true };
}

async function fetchPolicyRateFromEvds(): Promise<MacroSnapshot | null> {
  const apiKey = process.env.TCMB_EVDS_API_KEY ?? process.env.EVDS_API_KEY;
  if (!apiKey) {
    console.warn("[discover] EVDS live fetch skipped: TCMB_EVDS_API_KEY/EVDS_API_KEY not set");
    return null;
  }
  const baseUrls = [
    process.env.EVDS_BASE_URL ?? "https://evds2.tcmb.gov.tr/service/evds",
  ]
    .map((item) => item.trim())
    .filter(Boolean);
  if (baseUrls.length === 0) return null;

  const today = new Date();
  const start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  const toEvdsDate = (value: Date): string => `${String(value.getDate()).padStart(2, "0")}-${String(value.getMonth() + 1).padStart(2, "0")}-${value.getFullYear()}`;

  for (const baseUrl of baseUrls) {
    const url = `${baseUrl}/series=${encodeURIComponent(POLICY_SERIES)}&startDate=${toEvdsDate(start)}&endDate=${toEvdsDate(today)}&type=json&key=${encodeURIComponent(apiKey)}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), YAHOO_TIMEOUT_MS);
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });
      clearTimeout(timeout);
      if (!response.ok) {
        console.warn("[discover] EVDS live fetch non-OK response", {
          baseUrl,
          status: response.status,
        });
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("json")) {
        console.warn("[discover] EVDS live fetch returned non-JSON response", {
          baseUrl,
          contentType,
        });
        continue;
      }

      const payload = (await response.json().catch(() => null)) as unknown;
      const maybeItems =
        typeof payload === "object" && payload !== null && "items" in payload && Array.isArray((payload as { items?: unknown[] }).items)
          ? ((payload as { items: Array<Record<string, unknown>> }).items ?? [])
          : [];

      if (maybeItems.length === 0) {
        console.warn("[discover] EVDS live fetch returned empty items", {
          baseUrl,
          series: POLICY_SERIES,
        });
      }

      const numericValues = maybeItems
        .map((item) => {
          const raw = item[POLICY_SERIES_RESPONSE_KEY] ?? item[POLICY_SERIES] ?? item.POLICY_RATE ?? item.value;
          if (typeof raw === "number" && Number.isFinite(raw)) return raw;
          if (typeof raw === "string") {
            const normalized = raw.replace(",", ".").trim();
            const parsed = Number(normalized);
            return Number.isFinite(parsed) ? parsed : null;
          }
          return null;
        })
        .filter((item): item is number => typeof item === "number");
      const latest = numericValues.at(-1);
      if (typeof latest === "number") {
        return {
          policyRate: latest,
          source: "tcmb_evds_live",
          fetchedAtIso: new Date().toISOString(),
        };
      }
    } catch (error: unknown) {
      console.warn("[discover] EVDS live fetch error", {
        baseUrl,
        message: error instanceof Error ? error.message : String(error),
      });
      // keep trying fallback endpoints
    }
  }

  return null;
}

async function getMacroSnapshot(): Promise<MacroSnapshot> {
  if (policyRateCache && policyRateCache.expiresAt > Date.now()) {
    return policyRateCache.value;
  }

  const live = await fetchPolicyRateFromEvds();
  if (live) {
    policyRateCache = {
      expiresAt: Date.now() + POLICY_CACHE_TTL_MS,
      value: live,
    };
    return live;
  }

  const fallback: MacroSnapshot = {
    policyRate: LAST_KNOWN_POLICY_RATE,
    source: "last_known_fallback",
    fetchedAtIso: new Date().toISOString(),
    note: "TCMB_EVDS_API_KEY bulunamadı veya canlı veri alınamadı; son bilinen oran kullanıldı.",
  };

  console.warn("[discover] Policy rate fallback is active", {
    source: fallback.source,
    policyRate: fallback.policyRate,
  });

  policyRateCache = {
    expiresAt: Date.now() + POLICY_CACHE_TTL_MS,
    value: fallback,
  };

  return fallback;
}

async function fetchYahooJson(endpoint: string): Promise<unknown | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), YAHOO_TIMEOUT_MS);
    const response = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": YAHOO_UA,
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return (await response.json().catch(() => null)) as unknown;
  } catch {
    return null;
  }
}

function readStringField(record: Record<string, unknown> | undefined, key: string): string | null {
  const value = record?.[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractSectorIndustryFromQuoteSummary(payload: unknown): { sector: string | null; industry: string | null } {
  if (!payload || typeof payload !== "object") {
    return { sector: null, industry: null };
  }
  const quoteSummary = (payload as { quoteSummary?: { result?: Array<Record<string, unknown>> } }).quoteSummary;
  const first = quoteSummary?.result?.[0];
  if (!first || typeof first !== "object") {
    return { sector: null, industry: null };
  }

  const assetProfile = first.assetProfile as Record<string, unknown> | undefined;
  const summaryProfile = first.summaryProfile as Record<string, unknown> | undefined;

  const sector = readStringField(assetProfile, "sector") ?? readStringField(summaryProfile, "sector");
  const industry = readStringField(assetProfile, "industry") ?? readStringField(summaryProfile, "industry");
  return { sector, industry };
}

function extractSectorIndustryFromQuote(payload: unknown): { sector: string | null; industry: string | null } {
  if (!payload || typeof payload !== "object") {
    return { sector: null, industry: null };
  }
  const quoteResponse = (payload as { quoteResponse?: { result?: Array<Record<string, unknown>> } }).quoteResponse;
  const first = quoteResponse?.result?.[0];
  if (!first || typeof first !== "object") {
    return { sector: null, industry: null };
  }
  const sector = readStringField(first, "sector");
  const industry = readStringField(first, "industry");
  return { sector, industry };
}

async function fetchSectorIndustry(symbol: string): Promise<{ sector: string | null; industry: string | null }> {
  const providerSymbol = `${symbol}.IS`;
  const baseUrls = [YAHOO_BASE_URL, YAHOO_FALLBACK_BASE_URL];
  const modules = ["assetProfile", "summaryProfile", "assetProfile,summaryProfile"];

  for (const baseUrl of baseUrls) {
    for (const moduleName of modules) {
      const endpoint = `${baseUrl}/v10/finance/quoteSummary/${encodeURIComponent(providerSymbol)}?modules=${encodeURIComponent(moduleName)}`;
      const payload = await fetchYahooJson(endpoint);
      const extracted = extractSectorIndustryFromQuoteSummary(payload);
      if (extracted.sector) {
        return extracted;
      }
    }
  }

  for (const baseUrl of baseUrls) {
    const quoteEndpoint = `${baseUrl}/v7/finance/quote?symbols=${encodeURIComponent(providerSymbol)}`;
    const payload = await fetchYahooJson(quoteEndpoint);
    const extracted = extractSectorIndustryFromQuote(payload);
    if (extracted.sector) {
      return extracted;
    }
  }

  return { sector: null, industry: null };
}

function resolveSectorSource(
  symbol: string,
  yahooProfile: { sector: string | null; industry: string | null }
): { sector: string; industry: string; sectorSource: "yahoo" | "static_map" | "unknown" } {
  const hasYahooSector = typeof yahooProfile.sector === "string" && yahooProfile.sector.trim().length > 0;
  if (hasYahooSector) {
    return {
      sector: yahooProfile.sector!.trim(),
      industry: yahooProfile.industry?.trim() || yahooProfile.sector!.trim(),
      sectorSource: "yahoo",
    };
  }

  const fromStatic = BIST_SECTOR_MAP[symbol.toUpperCase()];
  if (fromStatic) {
    return {
      sector: fromStatic,
      industry: fromStatic,
      sectorSource: "static_map",
    };
  }

  return {
    sector: "bilinmiyor",
    industry: "bilinmiyor",
    sectorSource: "unknown",
  };
}

async function buildBaseDiscoverData(
  horizon: DiscoverRequest["horizon"],
  minMarketCap: DiscoverRequest["minMarketCap"],
  onProgress?: (event: DiscoverProgressEvent) => void,
  shouldStop?: () => boolean
): Promise<DiscoverBaseCacheValue> {
  const universe = getLiveBistUniverse(minMarketCap);
  const total = universe.length;
  let scanned = 0;

  const progressTick = (): void => {
    const percent = total <= 0 ? 100 : Math.round((scanned / total) * 100);
    onProgress?.({
      scanned,
      total,
      percent,
      message: `${total} hisse taranıyor... %${percent}`,
    });
  };

  progressTick();

  const chunks = chunkArray(universe, 50);
  const validUniverseChunks = await Promise.all(
    chunks.map(async (chunk) => {
      const settled = await Promise.all(
        chunk.map(async (item) => {
          if (shouldStop?.()) return null;
          try {
            const history = await marketDataGateway.getHistory(item.ticker, {
              range: "1mo",
              interval: "1d",
            });
            const valid = history.providerSymbol.endsWith(".IS") && history.points.length > 0;
            return valid ? item : null;
          } catch {
            return null;
          } finally {
            scanned += 1;
            progressTick();
          }
        })
      );
      return settled.filter((entry): entry is { ticker: string; name: string } => entry !== null);
    })
  );

  const validUniverse = validUniverseChunks.flat();
  if (shouldStop?.()) {
    throw new Error("DISCOVER_ABORTED");
  }

  const analyzeInputChunks = chunkArray(validUniverse, 50).map((chunk) =>
    chunk.map((item) => ({
      symbol: item.ticker,
      originalInput: item.ticker,
      class: AssetClass.Equity,
    }))
  );

  const analyzedChunks = await Promise.all(
    analyzeInputChunks.map((chunk) =>
      analyzeUniversalAssets(chunk, marketDataGateway, {
        analysisMode: "discover",
        timeHorizon: mapHorizonToAnalyze(horizon),
      })
    )
  );

  const analyzed = analyzedChunks.flat();
  if (shouldStop?.()) {
    throw new Error("DISCOVER_ABORTED");
  }

  const sectorMapEntries = await Promise.all(
    chunkArray(analyzed.map((item) => item.symbol), 50).flatMap((symbolChunk) =>
      symbolChunk.map(async (symbol) => {
        const profile = await fetchSectorIndustry(symbol);
        return [symbol, profile] as const;
      })
    )
  );

  const sectorMap = new Map<string, { sector: string; industry: string; sectorSource: "yahoo" | "static_map" | "unknown" }>(
    sectorMapEntries.map(([symbol, profile]) => [symbol, resolveSectorSource(symbol, profile)])
  );
  const nameMap = new Map<string, string>(validUniverse.map((item) => [item.ticker, item.name]));
  const rows: BaseDiscoverRow[] = analyzed.map((asset) => {
    const sectorProfile = sectorMap.get(asset.symbol) ?? {
      sector: "bilinmiyor",
      industry: "bilinmiyor",
      sectorSource: "unknown" as const,
    };
    return {
      symbol: asset.symbol,
      name: nameMap.get(asset.symbol) ?? asset.symbol,
      sector: sectorProfile.sector,
      industry: sectorProfile.industry,
      sectorSource: sectorProfile.sectorSource,
      criteriaScores: asset.criteriaScores,
      computation: asset.computation,
    };
  });

  return {
    rows,
    totalScanned: total,
    builtAtMs: Date.now(),
  };
}

function buildScoredResults(
  baseRows: BaseDiscoverRow[],
  request: DiscoverRequest,
  macroSnapshot: MacroSnapshot
): DiscoverResponse["results"] {
  const weightMap = resolveProfileWeights(request);
  const activeMetricKeys = request.horizon === "short" ? SHORT_METRIC_KEYS : LONG_METRIC_KEYS;
  const unmappedSectorPairs = new Set<string>();

  return baseRows.map((row) => {
      const macroProfile = request.macroFilter
        ? resolveMacroCoefficient(macroSnapshot.policyRate, row.sector, row.industry)
        : { coefficient: 1, sectorMapped: true };
      const macroCoefficient = macroProfile.coefficient;
      const macroBucketMapped = macroProfile.sectorMapped;
      const sectorMapped = row.sectorSource !== "unknown";
      const pairKey = `${row.sector} / ${row.industry}`;

      if (!macroBucketMapped && !unmappedSectorPairs.has(pairKey)) {
        unmappedSectorPairs.add(pairKey);
        console.warn(`[discover] Sector mapping failed: ${row.sector} / ${row.industry}`);
      }

      const weightedScores = activeMetricKeys.map((metricId) => {
        const raw = row.criteriaScores?.[metricId]?.score;
        const normalized = typeof raw === "number" ? clamp(raw, 1, 10) / 10 : 0;
        const weight = weightMap[metricId] ?? 0;
        const weighted = normalized * (weight / 100);
        return { metricId, weighted, raw: typeof raw === "number" ? raw : null };
      });

      const rawFit = weightedScores.reduce((sum, item) => sum + item.weighted, 0);
      const profileFitScore = clamp(Number((rawFit * macroCoefficient * 100).toFixed(1)), 0, 100);
      const topMetric =
        [...weightedScores].sort((left, right) => right.weighted - left.weighted)[0]?.metricId ?? activeMetricKeys[0];
      const dataWarning = isDataWarningRow(
        {
          symbol: row.symbol,
          originalInput: row.symbol,
          class: AssetClass.Equity,
          metrics: { risk: 5, return: 5, liquidity: 5, diversification: 5, calmness: 5 },
          criteriaScores: row.criteriaScores,
          computation: row.computation,
        },
        activeMetricKeys
      )
        ? "Veri yetersiz — bu hisse için bazı metrikler hesaplanamadı."
        : undefined;

      const macroPenaltyApplied = macroCoefficient < 1;

      return {
        symbol: row.symbol,
        name: row.name,
        sector: row.sector,
        industry: row.industry,
        sectorMapped,
        sectorSource: row.sectorSource,
        profileFitScore,
        highlightMetric: METRIC_LABELS[topMetric],
        macroCoefficient,
        macroPenaltyApplied,
        macroPenaltyMessage: macroPenaltyApplied
          ? "⚠️ Bu hisse mevcut faiz ortamında düşük ağırlık aldı."
          : undefined,
        dataWarning,
      };
    });
}

export async function runDiscover(
  request: DiscoverRequest,
  onProgress?: (event: DiscoverProgressEvent) => void,
  shouldStop?: () => boolean
): Promise<DiscoverResponse> {
  const cacheKey = `${toDailyCacheKey(request.horizon)}:${request.minMarketCap}`;
  const cachedEntry = baseDiscoverCache.get(cacheKey);
  const isValidCache = Boolean(cachedEntry && cachedEntry.expiresAt > Date.now());

  let baseData: DiscoverBaseCacheValue;
  let cached = false;

  if (isValidCache && cachedEntry) {
    baseData = cachedEntry.value;
    cached = true;
    onProgress?.({
      scanned: baseData.totalScanned,
      total: baseData.totalScanned,
      percent: 100,
      message: `${baseData.totalScanned} hisse taranıyor... %100`,
    });
  } else {
    baseData = await buildBaseDiscoverData(request.horizon, request.minMarketCap, onProgress, shouldStop);
    baseDiscoverCache.set(cacheKey, {
      expiresAt: Date.now() + DISCOVER_CACHE_TTL_MS,
      value: baseData,
    });
  }

  if (shouldStop?.()) {
    throw new Error("DISCOVER_ABORTED");
  }

  const macroSnapshot = await getMacroSnapshot();

  const results = buildScoredResults(baseData.rows, request, macroSnapshot);
  const payload: DiscoverResponse = {
    results,
    totalScanned: baseData.totalScanned,
    cached,
    cacheAge: ageLabel(baseData.builtAtMs),
    macroSnapshot,
    disclaimer: DISCLAIMER,
  };

  return payload;
}

export type { DiscoverProgressEvent };
