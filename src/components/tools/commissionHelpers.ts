import type {
  Broker,
  BrokerQuote,
  CurrencyCode,
  LongTermProjection,
  Market,
  RoundTripSimulation,
  TransactionType,
} from "@/components/tools/commission/types";

export const TRANSACTION_TYPES: Array<{ id: TransactionType; label: string }> = [
  { id: "buy", label: "Alis" },
  { id: "sell", label: "Satis" },
  { id: "roundtrip", label: "Round-trip (Alis + Satis)" },
];

export const INPUT_MODES = [
  { id: "amount", label: "Tutar ile hesapla" },
  { id: "quantity_price", label: "Adet + Fiyat ile hesapla" },
] as const;

export const CURRENCIES: Array<{ id: CurrencyCode; label: string }> = [
  { id: "TRY", label: "TRY" },
  { id: "USD", label: "USD" },
];

interface ComputeLegCostParams {
  notionalTry: number;
  commissionRate: number;
  minCommission: number;
  bsmvRate: number;
  bistRate: number;
  takasbankFixed: number;
  spreadRate: number;
  includeBsmv: boolean;
  includeBist: boolean;
  includeTakasbank: boolean;
}

interface ComputeBrokerQuoteParams {
  broker: Broker;
  market: Market;
  transactionType: TransactionType;
  notional: number;
  currency: CurrencyCode;
  usdTryRate: number;
  monthlyVolume: number;
  manualRate: number;
  promotionsEnabled: boolean;
  swapDays: number;
  overrideSpreadRate: number;
  overrideSwapDailyRate: number;
  overrideFxRate: number;
  overrideWithholdingRate: number;
  taxableProfitEstimate: number;
}

interface ComputeRoundTripParams {
  broker: Broker;
  market: Market;
  quantity: number;
  entryPrice: number;
  targetPrice: number;
  currency: CurrencyCode;
  usdTryRate: number;
  monthlyVolume: number;
  manualRate: number;
  promotionsEnabled: boolean;
  holdingDays: number;
  overrideSpreadRate: number;
  overrideSwapDailyRate: number;
  overrideFxRate: number;
  overrideWithholdingRate: number;
}

interface ProjectionParams {
  quote: BrokerQuote | null;
  monthlyTradeCount: number;
  years: number;
  annualReturnRate: number;
  annualBtcGrowthRate: number;
}

export function parseLocaleNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const raw = String(value).trim().replace(/\s/g, "");
  if (!raw) {
    return 0;
  }

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  let normalized = raw;

  // TR grouped format: 1.234.567,89
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  }
  // EN grouped format: 1,234,567.89
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) {
    normalized = raw.replace(/,/g, "");
  } else if (hasComma && !hasDot) {
    normalized = raw.replace(",", ".");
  } else if (hasComma && hasDot) {
    // Mixed format fallback: decimal separator is whichever appears last
    const lastComma = raw.lastIndexOf(",");
    const lastDot = raw.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toInputValue(numberValue: number, decimals = 2): string {
  if (!Number.isFinite(numberValue)) {
    return "";
  }

  return numberValue.toFixed(decimals).replace(".", ",");
}

export function formatMoney(value: number, currency: CurrencyCode = "TRY"): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function formatPercent(value: number, fractionDigits = 3): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `%${safeValue.toFixed(fractionDigits)}`;
}

export function formatCompactNumber(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(safeValue);
}

function pickTierRate(tiers: Broker["commissionModel"]["tiers"], monthlyVolume: number): number {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return 0;
  }

  const sortedTiers = [...tiers].sort(
    (left, right) => left.maxMonthlyVolume - right.maxMonthlyVolume
  );
  const tier =
    sortedTiers.find((item) => monthlyVolume <= item.maxMonthlyVolume) ??
    sortedTiers[sortedTiers.length - 1];

  return tier.rate;
}

function getPromotionMultiplier(broker: Broker, promotionsEnabled: boolean): number {
  if (!promotionsEnabled || !Array.isArray(broker.promotions) || broker.promotions.length === 0) {
    return 1;
  }

  const activePromotions = broker.promotions.filter((item) => item.active);
  if (activePromotions.length === 0) {
    return 1;
  }

  return activePromotions.reduce((multiplier, promotion) => {
    return multiplier * (promotion.rateMultiplier || 1);
  }, 1);
}

function computeLegCost({
  notionalTry,
  commissionRate,
  minCommission,
  bsmvRate,
  bistRate,
  takasbankFixed,
  spreadRate,
  includeBsmv,
  includeBist,
  includeTakasbank,
}: ComputeLegCostParams) {
  const commission = Math.max(notionalTry * commissionRate, minCommission);
  const bsmv = includeBsmv ? 0 : commission * bsmvRate;
  const bistPayi = includeBist ? 0 : notionalTry * bistRate;
  const takasbank = includeTakasbank ? 0 : takasbankFixed;
  const spread = notionalTry * spreadRate;
  const total = commission + bsmv + bistPayi + takasbank + spread;

  return { commission, bsmv, bistPayi, takasbank, spread, total };
}

export function computeBrokerQuote({
  broker,
  market,
  transactionType,
  notional,
  currency,
  usdTryRate,
  monthlyVolume,
  manualRate,
  promotionsEnabled,
  swapDays,
  overrideSpreadRate,
  overrideSwapDailyRate,
  overrideFxRate,
  overrideWithholdingRate,
  taxableProfitEstimate,
}: ComputeBrokerQuoteParams): BrokerQuote | null {
  const currencyRate = currency === "USD" ? usdTryRate : 1;
  const notionalTry = notional * currencyRate;

  if (!Number.isFinite(notionalTry) || notionalTry <= 0) {
    return null;
  }

  const baseRate =
    manualRate > 0 ? manualRate : pickTierRate(broker.commissionModel.tiers, monthlyVolume);
  const promotionMultiplier = getPromotionMultiplier(broker, promotionsEnabled);
  const effectiveRate = baseRate * promotionMultiplier;
  const legCount = transactionType === "roundtrip" ? 2 : 1;

  const bsmvRate = market.defaultFees.bsmvRate;
  const bistRate = market.defaultFees.bistRate;
  const takasbankFixed = broker.fees.takasbankFixed ?? market.defaultFees.takasbankFixed;
  const spreadRate =
    overrideSpreadRate > 0
      ? overrideSpreadRate
      : broker.fees.spreadRate ?? market.defaultFees.spreadRate;
  const swapDailyRate =
    overrideSwapDailyRate > 0
      ? overrideSwapDailyRate
      : broker.fees.swapDailyRate ?? market.defaultFees.swapDailyRate;
  const fxConversionRate =
    overrideFxRate > 0
      ? overrideFxRate
      : broker.fees.fxConversionRate ?? market.defaultFees.fxConversionRate;
  const withholdingRate =
    overrideWithholdingRate >= 0
      ? overrideWithholdingRate
      : broker.fees.withholdingRate ?? market.defaultFees.withholdingRate;

  const leg = computeLegCost({
    notionalTry,
    commissionRate: effectiveRate,
    minCommission: broker.commissionModel.minCommission,
    bsmvRate,
    bistRate,
    takasbankFixed,
    spreadRate,
    includeBsmv: Boolean(broker.fees.bsmvIncluded),
    includeBist: Boolean(broker.fees.bistIncluded),
    includeTakasbank: Boolean(broker.fees.takasbankIncluded),
  });

  const swapCost = notionalTry * swapDailyRate * Math.max(swapDays, 0);
  const fxConversion = currency === "USD" ? notionalTry * fxConversionRate : 0;
  const stopaj = Math.max(taxableProfitEstimate, 0) * withholdingRate;

  const totalCostTry = leg.total * legCount + swapCost + fxConversion + stopaj;
  const referenceVolumeTry = notionalTry * legCount;
  const effectiveCostPct = referenceVolumeTry > 0 ? (totalCostTry / referenceVolumeTry) * 100 : 0;
  const breakEvenPct = notionalTry > 0 ? (totalCostTry / notionalTry) * 100 : 0;

  return {
    brokerId: broker.id,
    brokerName: broker.name,
    marketName: market.name,
    currency,
    notional,
    notionalTry,
    legCount,
    baseRate,
    promotionMultiplier,
    effectiveRate,
    breakdown: {
      commission: leg.commission * legCount,
      bsmv: leg.bsmv * legCount,
      bistPayi: leg.bistPayi * legCount,
      takasbank: leg.takasbank * legCount,
      spread: leg.spread * legCount,
      swap: swapCost,
      fxConversion,
      stopaj,
    },
    totalCostTry,
    totalCostCurrency: totalCostTry / currencyRate,
    effectiveCostPct,
    breakEvenPct,
    breakEvenPriceMoveTry: (breakEvenPct / 100) * notionalTry,
  };
}

export function computeRoundTripSimulation({
  broker,
  market,
  quantity,
  entryPrice,
  targetPrice,
  currency,
  usdTryRate,
  monthlyVolume,
  manualRate,
  promotionsEnabled,
  holdingDays,
  overrideSpreadRate,
  overrideSwapDailyRate,
  overrideFxRate,
  overrideWithholdingRate,
}: ComputeRoundTripParams): RoundTripSimulation | null {
  const qty = Math.max(quantity, 0);
  const buyNotional = qty * Math.max(entryPrice, 0);
  const sellNotional = qty * Math.max(targetPrice, 0);

  if (buyNotional <= 0 || sellNotional <= 0) {
    return null;
  }

  const buyQuote = computeBrokerQuote({
    broker,
    market,
    transactionType: "buy",
    notional: buyNotional,
    currency,
    usdTryRate,
    monthlyVolume,
    manualRate,
    promotionsEnabled,
    swapDays: 0,
    overrideSpreadRate,
    overrideSwapDailyRate,
    overrideFxRate,
    overrideWithholdingRate,
    taxableProfitEstimate: 0,
  });
  const sellQuote = computeBrokerQuote({
    broker,
    market,
    transactionType: "sell",
    notional: sellNotional,
    currency,
    usdTryRate,
    monthlyVolume,
    manualRate,
    promotionsEnabled,
    swapDays: 0,
    overrideSpreadRate,
    overrideSwapDailyRate,
    overrideFxRate,
    overrideWithholdingRate,
    taxableProfitEstimate: 0,
  });

  if (!buyQuote || !sellQuote) {
    return null;
  }

  const rate = currency === "USD" ? usdTryRate : 1;
  const grossProfitTry = (sellNotional - buyNotional) * rate;
  const withholdingRate =
    overrideWithholdingRate >= 0
      ? overrideWithholdingRate
      : broker.fees.withholdingRate ?? market.defaultFees.withholdingRate;
  const stopaj = grossProfitTry > 0 ? grossProfitTry * withholdingRate : 0;
  const holdingSwap =
    buyQuote.notionalTry *
    (overrideSwapDailyRate > 0
      ? overrideSwapDailyRate
      : broker.fees.swapDailyRate ?? market.defaultFees.swapDailyRate) *
    Math.max(holdingDays, 0);

  const totalCostsTry = buyQuote.totalCostTry + sellQuote.totalCostTry + stopaj + holdingSwap;
  const netProfitTry = grossProfitTry - totalCostsTry;
  const investedTry = buyNotional * rate;
  const netReturnPct = investedTry > 0 ? (netProfitTry / investedTry) * 100 : 0;

  return {
    quantity: qty,
    entryPrice,
    targetPrice,
    grossProfitTry,
    totalCostsTry,
    stopaj,
    holdingSwap,
    netProfitTry,
    netReturnPct,
  };
}

export function computeLongTermProjection({
  quote,
  monthlyTradeCount,
  years,
  annualReturnRate,
  annualBtcGrowthRate,
}: ProjectionParams): LongTermProjection | null {
  if (!quote) {
    return null;
  }

  const monthlyTrades = Math.max(monthlyTradeCount, 0);
  const horizonYears = Math.max(years, 1);
  const annualCost = quote.totalCostTry * monthlyTrades * 12;
  const annualReturn = Math.max(annualReturnRate, 0) / 100;
  const annualBtcGrowth = Math.max(annualBtcGrowthRate, 0) / 100;

  const compoundFutureValue = calculateAnnuityFutureValue(annualCost, annualReturn, horizonYears);
  const btcFutureValue = calculateAnnuityFutureValue(annualCost, annualBtcGrowth, horizonYears);

  return {
    annualCost,
    totalNominalCost: annualCost * horizonYears,
    compoundFutureValue,
    btcFutureValue,
  };
}

function calculateAnnuityFutureValue(annualContribution: number, annualRate: number, years: number) {
  if (annualRate <= 0) {
    return annualContribution * years;
  }

  return annualContribution * ((Math.pow(1 + annualRate, years) - 1) / annualRate);
}

export function buildShareQuery(params: Record<string, string | number | null | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

export function downloadTextFile(
  filename: string,
  text: string,
  mimeType = "text/plain;charset=utf-8"
): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
