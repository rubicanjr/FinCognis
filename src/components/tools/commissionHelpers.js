export const TRANSACTION_TYPES = [
  { id: "buy", label: "Alis" },
  { id: "sell", label: "Satis" },
  { id: "roundtrip", label: "Round-trip (Alis + Satis)" },
];

export const INPUT_MODES = [
  { id: "amount", label: "Tutar ile hesapla" },
  { id: "quantity_price", label: "Adet + Fiyat ile hesapla" },
];

export const CURRENCIES = [
  { id: "TRY", label: "TRY" },
  { id: "USD", label: "USD" },
];

export function parseLocaleNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const normalized = String(value).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toInputValue(numberValue, decimals = 2) {
  if (!Number.isFinite(numberValue)) {
    return "";
  }

  return numberValue.toFixed(decimals).replace(".", ",");
}

export function formatMoney(value, currency = "TRY") {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function formatPercent(value, fractionDigits = 3) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `%${safeValue.toFixed(fractionDigits)}`;
}

export function formatCompactNumber(value) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function pickTierRate(tiers, monthlyVolume) {
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

function getPromotionMultiplier(broker, promotionsEnabled) {
  if (!promotionsEnabled) {
    return 1;
  }

  if (!Array.isArray(broker.promotions) || broker.promotions.length === 0) {
    return 1;
  }

  const activePromotions = broker.promotions.filter((item) => item.active);
  if (activePromotions.length === 0) {
    return 1;
  }

  return activePromotions.reduce(
    (currentMultiplier, promotion) => currentMultiplier * (promotion.rateMultiplier || 1),
    1
  );
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
}) {
  const commission = Math.max(notionalTry * commissionRate, minCommission);
  const bsmv = includeBsmv ? 0 : commission * bsmvRate;
  const bistPayi = includeBist ? 0 : notionalTry * bistRate;
  const takasbank = includeTakasbank ? 0 : takasbankFixed;
  const spread = notionalTry * spreadRate;
  const total = commission + bsmv + bistPayi + takasbank + spread;

  return {
    commission,
    bsmv,
    bistPayi,
    takasbank,
    spread,
    total,
  };
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
}) {
  const currencyRate = currency === "USD" ? usdTryRate : 1;
  const notionalTry = notional * currencyRate;

  if (!Number.isFinite(notionalTry) || notionalTry <= 0) {
    return null;
  }

  const baseRate = manualRate > 0
    ? manualRate
    : pickTierRate(broker.commissionModel.tiers, monthlyVolume);
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
    includeBsmv: broker.fees.bsmvIncluded,
    includeBist: broker.fees.bistIncluded,
    includeTakasbank: broker.fees.takasbankIncluded,
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
}) {
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

  const totalCostsTry =
    buyQuote.totalCostTry + sellQuote.totalCostTry + stopaj + holdingSwap;
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
}) {
  if (!quote) {
    return null;
  }

  const monthlyTrades = Math.max(monthlyTradeCount, 0);
  const horizonYears = Math.max(years, 1);
  const annualCost = quote.totalCostTry * monthlyTrades * 12;
  const annualReturn = Math.max(annualReturnRate, 0) / 100;
  const annualBtcGrowth = Math.max(annualBtcGrowthRate, 0) / 100;

  const compoundFutureValue = calculateAnnuityFutureValue(
    annualCost,
    annualReturn,
    horizonYears
  );
  const btcFutureValue = calculateAnnuityFutureValue(
    annualCost,
    annualBtcGrowth,
    horizonYears
  );

  return {
    annualCost,
    totalNominalCost: annualCost * horizonYears,
    compoundFutureValue,
    btcFutureValue,
  };
}

function calculateAnnuityFutureValue(annualContribution, annualRate, years) {
  if (annualRate <= 0) {
    return annualContribution * years;
  }

  return (
    annualContribution *
    ((Math.pow(1 + annualRate, years) - 1) / annualRate)
  );
}

export function buildShareQuery(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

export function downloadTextFile(filename, text, mimeType = "text/plain;charset=utf-8") {
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

