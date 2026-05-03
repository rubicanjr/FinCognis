export type CatalogAssetClass =
  | "equity_bist"
  | "equity_us"
  | "crypto"
  | "commodity"
  | "fx"
  | "etf_us";

export interface CatalogAsset {
  ticker: string;
  name: string;
  exchange: string;
  assetClass: CatalogAssetClass;
  yahooSymbol: string;
  currency: "TRY" | "USD";
  isVerified: boolean;
  aliases?: string[];
}

function normalizeAliasLookup(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createBistAsset(ticker: string, name: string): CatalogAsset {
  return {
    ticker,
    name,
    exchange: "BIST",
    assetClass: "equity_bist",
    yahooSymbol: `${ticker}.IS`,
    currency: "TRY",
    isVerified: true,
  };
}

function createUsEquityAsset(ticker: string, name: string): CatalogAsset {
  return {
    ticker,
    name,
    exchange: "NASDAQ/NYSE",
    assetClass: "equity_us",
    yahooSymbol: ticker,
    currency: "USD",
    isVerified: true,
  };
}

function createEtfAsset(ticker: string, name: string): CatalogAsset {
  return {
    ticker,
    name,
    exchange: "NYSE/NASDAQ",
    assetClass: "etf_us",
    yahooSymbol: ticker,
    currency: "USD",
    isVerified: true,
  };
}

const BIST_ASSETS: CatalogAsset[] = [
  createBistAsset("AEFES", "Anadolu Efes"),
  createBistAsset("AGHOL", "Anadolu Grubu Holding"),
  createBistAsset("AGROT", "Agrotech Yuksek Teknoloji"),
  createBistAsset("AHGAZ", "Ahlatci Dogalgaz"),
  createBistAsset("AKBNK", "Akbank"),
  createBistAsset("AKFYE", "Akfen Yenilenebilir Enerji"),
  createBistAsset("AKSA", "Aksa Akrilik"),
  createBistAsset("AKSEN", "Aksa Enerji"),
  createBistAsset("ALARK", "Alarko Holding"),
  createBistAsset("ALFAS", "Alfa Solar"),
  createBistAsset("ALTNY", "Altinay Savunma"),
  createBistAsset("ANSGR", "Anadolu Sigorta"),
  createBistAsset("ANHYT", "Anadolu Hayat Emeklilik"),
  createBistAsset("ARCLK", "Arcelik"),
  createBistAsset("ARDYZ", "ARD Grup Bilisim"),
  createBistAsset("ASELS", "Aselsan"),
  createBistAsset("ASTOR", "Astor Enerji"),
  createBistAsset("AVPGY", "Avrupakent GYO"),
  createBistAsset("BERA", "Bera Holding"),
  createBistAsset("BIMAS", "BIM Birlesik Magazalar"),
  createBistAsset("BRSAN", "Borusan Boru"),
  createBistAsset("BTCIM", "Baticim"),
  createBistAsset("BSOKE", "Batisoke Cimento"),
  createBistAsset("CANTE", "Can2 Termik"),
  createBistAsset("CCOLA", "Coca Cola Icecek"),
  createBistAsset("CIMSA", "Cimsa"),
  createBistAsset("DOAS", "Dogus Otomotiv"),
  createBistAsset("DOHOL", "Dogan Holding"),
  createBistAsset("EKGYO", "Emlak Konut GYO"),
  createBistAsset("ENERY", "Enerya Enerji"),
  createBistAsset("ENJSA", "Enerjisa"),
  createBistAsset("ENKAI", "Enka Insaat"),
  createBistAsset("EREGL", "Eregli Demir Celik"),
  createBistAsset("FROTO", "Ford Otosan"),
  createBistAsset("GARAN", "Garanti BBVA"),
  createBistAsset("GUBRF", "Gubre Fabrikalari"),
  createBistAsset("HALKB", "Halkbank"),
  createBistAsset("HEKTS", "Hektas"),
  createBistAsset("ISCTR", "Is Bankasi C"),
  createBistAsset("ISMEN", "Is Yatirim"),
  createBistAsset("KCHOL", "Koc Holding"),
  createBistAsset("KLSER", "Kaleseramik"),
  createBistAsset("KOZAA", "Koza Anadolu"),
  createBistAsset("KOZAL", "Koza Altin"),
  createBistAsset("KRDMD", "Kardemir D"),
  createBistAsset("MAVI", "Mavi Giyim"),
  createBistAsset("MGROS", "Migros"),
  createBistAsset("OTKAR", "Otokar"),
  createBistAsset("OYAKC", "Oyak Cimento"),
  createBistAsset("PGSUS", "Pegasus"),
  createBistAsset("PETKM", "Petkim"),
  createBistAsset("REEDR", "Reeder Teknoloji"),
  createBistAsset("SAHOL", "Sabanci Holding"),
  createBistAsset("SASA", "SASA Polyester"),
  createBistAsset("SISE", "Sisecam"),
  createBistAsset("SKBNK", "Sekerbank"),
  createBistAsset("SOKM", "Sok Marketler"),
  createBistAsset("TABGD", "Tab Gida"),
  createBistAsset("TAVHL", "TAV Havalimanlari"),
  createBistAsset("TCELL", "Turkcell"),
  createBistAsset("THYAO", "Turk Hava Yollari"),
  createBistAsset("TKFEN", "Tekfen Holding"),
  createBistAsset("TOASO", "Tofas"),
  createBistAsset("TTKOM", "Turk Telekom"),
  createBistAsset("TTRAK", "Turk Traktor"),
  createBistAsset("TUPRS", "Turkiye Petrol Rafinerileri"),
  createBistAsset("ULKER", "Ulker Biskuvi"),
  createBistAsset("VAKBN", "Vakifbank"),
  createBistAsset("VESTL", "Vestel"),
  createBistAsset("YKBNK", "Yapi Kredi"),
  createBistAsset("ZOREN", "Zorlu Enerji"),
];

const US_EQUITY_ASSETS: CatalogAsset[] = [
  createUsEquityAsset("AAPL", "Apple Inc."),
  createUsEquityAsset("MSFT", "Microsoft Corporation"),
  createUsEquityAsset("NVDA", "NVIDIA Corporation"),
  createUsEquityAsset("AMZN", "Amazon.com Inc."),
  createUsEquityAsset("TSLA", "Tesla Inc."),
  createUsEquityAsset("META", "Meta Platforms Inc."),
  createUsEquityAsset("GOOGL", "Alphabet Class A"),
  createUsEquityAsset("NFLX", "Netflix Inc."),
  createUsEquityAsset("JPM", "JPMorgan Chase & Co."),
  createUsEquityAsset("BAC", "Bank of America Corp."),
  createUsEquityAsset("XOM", "Exxon Mobil"),
  createUsEquityAsset("CVX", "Chevron"),
];

const CRYPTO_ASSETS: CatalogAsset[] = [
  { ticker: "BTC", name: "Bitcoin", exchange: "CRYPTO", assetClass: "crypto", yahooSymbol: "BTC-USD", currency: "USD", isVerified: true, aliases: ["bitcoin", "btc"] },
  { ticker: "ETH", name: "Ethereum", exchange: "CRYPTO", assetClass: "crypto", yahooSymbol: "ETH-USD", currency: "USD", isVerified: true, aliases: ["ethereum", "eth"] },
  { ticker: "BNB", name: "BNB", exchange: "CRYPTO", assetClass: "crypto", yahooSymbol: "BNB-USD", currency: "USD", isVerified: true },
  { ticker: "SOL", name: "Solana", exchange: "CRYPTO", assetClass: "crypto", yahooSymbol: "SOL-USD", currency: "USD", isVerified: true },
  { ticker: "XRP", name: "XRP", exchange: "CRYPTO", assetClass: "crypto", yahooSymbol: "XRP-USD", currency: "USD", isVerified: true },
  { ticker: "AVAX", name: "Avalanche", exchange: "CRYPTO", assetClass: "crypto", yahooSymbol: "AVAX-USD", currency: "USD", isVerified: true },
  { ticker: "ADA", name: "Cardano", exchange: "CRYPTO", assetClass: "crypto", yahooSymbol: "ADA-USD", currency: "USD", isVerified: true },
  { ticker: "DOGE", name: "Dogecoin", exchange: "CRYPTO", assetClass: "crypto", yahooSymbol: "DOGE-USD", currency: "USD", isVerified: true },
  { ticker: "TRX", name: "TRON", exchange: "CRYPTO", assetClass: "crypto", yahooSymbol: "TRX-USD", currency: "USD", isVerified: true },
  { ticker: "DOT", name: "Polkadot", exchange: "CRYPTO", assetClass: "crypto", yahooSymbol: "DOT-USD", currency: "USD", isVerified: true },
];

const COMMODITY_ASSETS: CatalogAsset[] = [
  { ticker: "XAU", name: "Altin (Spot)", exchange: "COMMODITY", assetClass: "commodity", yahooSymbol: "GC=F", currency: "USD", isVerified: true, aliases: ["altin", "altın", "gold", "ons altin"] },
  { ticker: "XAG", name: "Gumus (Spot)", exchange: "COMMODITY", assetClass: "commodity", yahooSymbol: "SI=F", currency: "USD", isVerified: true, aliases: ["gumus", "gümüş", "silver"] },
  { ticker: "WTI", name: "WTI Crude Oil", exchange: "COMMODITY", assetClass: "commodity", yahooSymbol: "CL=F", currency: "USD", isVerified: true, aliases: ["petrol", "oil", "ham petrol"] },
  { ticker: "BRENT", name: "Brent Crude Oil", exchange: "COMMODITY", assetClass: "commodity", yahooSymbol: "BZ=F", currency: "USD", isVerified: true },
];

const FX_ASSETS: CatalogAsset[] = [
  { ticker: "USDTRY", name: "Dolar/TL", exchange: "FX", assetClass: "fx", yahooSymbol: "USDTRY=X", currency: "TRY", isVerified: true, aliases: ["dolar", "usd try", "usdtry"] },
  { ticker: "EURUSD", name: "Euro/Dolar", exchange: "FX", assetClass: "fx", yahooSymbol: "EURUSD=X", currency: "USD", isVerified: true },
  { ticker: "GBPUSD", name: "Sterlin/Dolar", exchange: "FX", assetClass: "fx", yahooSymbol: "GBPUSD=X", currency: "USD", isVerified: true },
  { ticker: "EURTRY", name: "Euro/TL", exchange: "FX", assetClass: "fx", yahooSymbol: "EURTRY=X", currency: "TRY", isVerified: true, aliases: ["euro", "eur try", "eurtry"] },
  { ticker: "JPYUSD", name: "Japon Yeni/Dolar", exchange: "FX", assetClass: "fx", yahooSymbol: "JPYUSD=X", currency: "USD", isVerified: true },
];

const US_ETF_ASSETS: CatalogAsset[] = [
  createEtfAsset("SPY", "SPDR S&P 500 ETF"),
  createEtfAsset("QQQ", "Invesco QQQ Trust"),
  createEtfAsset("VTI", "Vanguard Total Stock Market ETF"),
  createEtfAsset("GLD", "SPDR Gold Shares"),
  createEtfAsset("IWM", "iShares Russell 2000 ETF"),
  createEtfAsset("TLT", "iShares 20+ Year Treasury Bond ETF"),
  createEtfAsset("XLF", "Financial Select Sector SPDR Fund"),
  createEtfAsset("XLK", "Technology Select Sector SPDR Fund"),
];

const EXPLICIT_ALIAS_MAP: Record<string, string> = {
  altin: "XAU",
  "altın": "XAU",
  gold: "XAU",
  bitcoin: "BTC",
  ethereum: "ETH",
  petrol: "WTI",
  dolar: "USDTRY",
  euro: "EURTRY",
  gumus: "XAG",
  "gümüş": "XAG",
  tupras: "TUPRS",
  "tüpraş": "TUPRS",
  turkcell: "TCELL",
  thy: "THYAO",
  "s&p500": "SPY",
  sp500: "SPY",
};

export const ASSET_CATALOG: CatalogAsset[] = [
  ...BIST_ASSETS,
  ...US_EQUITY_ASSETS,
  ...CRYPTO_ASSETS,
  ...COMMODITY_ASSETS,
  ...FX_ASSETS,
  ...US_ETF_ASSETS,
].sort((left, right) => left.ticker.localeCompare(right.ticker));

export const ASSET_BY_TICKER = ASSET_CATALOG.reduce<Record<string, CatalogAsset>>((acc, asset) => {
  acc[asset.ticker.toUpperCase()] = asset;
  return acc;
}, {});

export const STATIC_ALIAS_TO_TICKER = ASSET_CATALOG.reduce<Record<string, string>>((acc, asset) => {
  acc[normalizeAliasLookup(asset.ticker)] = asset.ticker;
  acc[normalizeAliasLookup(asset.name)] = asset.ticker;
  for (const alias of asset.aliases ?? []) {
    acc[normalizeAliasLookup(alias)] = asset.ticker;
  }
  return acc;
}, Object.entries(EXPLICIT_ALIAS_MAP).reduce<Record<string, string>>((acc, [alias, ticker]) => {
  acc[normalizeAliasLookup(alias)] = ticker;
  return acc;
}, {}));
