export type TransactionType = "buy" | "sell" | "roundtrip";
export type InputMode = "amount" | "quantity_price";
export type CurrencyCode = "TRY" | "USD";

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface MarketDefaultFees {
  bsmvRate: number;
  bistRate: number;
  takasbankFixed: number;
  spreadRate: number;
  swapDailyRate: number;
  fxConversionRate: number;
  withholdingRate: number;
}

export interface Market {
  id: string;
  name: string;
  categoryId: string;
  defaultFees: MarketDefaultFees;
}

export interface CommissionTier {
  maxMonthlyVolume: number;
  rate: number;
}

export interface CommissionModel {
  tiers: CommissionTier[];
  minCommission: number;
}

export interface BrokerFees {
  bsmvIncluded?: boolean;
  bistIncluded?: boolean;
  takasbankIncluded?: boolean;
  spreadRate?: number;
  swapDailyRate?: number;
  fxConversionRate?: number;
  withholdingRate?: number;
  takasbankFixed?: number;
}

export interface BrokerPromotion {
  title: string;
  rateMultiplier: number;
  active: boolean;
}

export interface Broker {
  id: string;
  name: string;
  institutionType: string;
  supportedCategories: string[];
  supportedMarkets: string[];
  currencies: CurrencyCode[];
  commissionModel: CommissionModel;
  fees: BrokerFees;
  promotions?: BrokerPromotion[];
}

export interface BrokersDatasetMeta {
  defaultUsdTry?: number;
  disclaimer?: string;
  lastUpdated?: string;
}

export interface BrokersDataset {
  categories: Category[];
  markets: Market[];
  brokers: Broker[];
  _meta?: BrokersDatasetMeta;
}

export interface QuoteBreakdown {
  commission: number;
  bsmv: number;
  bistPayi: number;
  takasbank: number;
  spread: number;
  swap: number;
  fxConversion: number;
  stopaj: number;
}

export interface BrokerQuote {
  brokerId: string;
  brokerName: string;
  marketName: string;
  currency: CurrencyCode;
  notional: number;
  notionalTry: number;
  legCount: number;
  baseRate: number;
  promotionMultiplier: number;
  effectiveRate: number;
  breakdown: QuoteBreakdown;
  totalCostTry: number;
  totalCostCurrency: number;
  effectiveCostPct: number;
  breakEvenPct: number;
  breakEvenPriceMoveTry: number;
}

export interface RoundTripSimulation {
  quantity: number;
  entryPrice: number;
  targetPrice: number;
  grossProfitTry: number;
  totalCostsTry: number;
  stopaj: number;
  holdingSwap: number;
  netProfitTry: number;
  netReturnPct: number;
}

export interface LongTermProjection {
  annualCost: number;
  totalNominalCost: number;
  compoundFutureValue: number;
  btcFutureValue: number;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  category: string;
  market: string;
  broker: string;
  totalCostTry: number;
  effectiveCostPct: number;
  transactionType: TransactionType;
  notional: number;
  currency: CurrencyCode;
}

export interface CommunityReport {
  id: string;
  institution: string;
  suggestedRate: number;
  note: string;
  createdAt: string;
}

export interface ScenarioRow {
  quote: BrokerQuote;
  annualCost: number;
}
