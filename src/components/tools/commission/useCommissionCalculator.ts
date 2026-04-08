"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState, type ChangeEvent } from "react";
import brokersSeed from "@/components/tools/brokers.json";
import { FEE_INFO, STORAGE_KEYS } from "@/components/tools/commission/constants";
import type {
  Broker,
  BrokerQuote,
  BrokersDataset,
  Category,
  CommunityReport,
  CurrencyCode,
  HistoryItem,
  InputMode,
  LongTermProjection,
  Market,
  RoundTripSimulation,
  ScenarioRow,
  TransactionType,
} from "@/components/tools/commission/types";
import {
  buildShareQuery,
  computeBrokerQuote,
  computeLongTermProjection,
  computeRoundTripSimulation,
  downloadTextFile,
  formatMoney,
  formatPercent,
  parseLocaleNumber,
  toInputValue,
} from "@/components/tools/commissionHelpers";

function isValidDataset(value: unknown): value is BrokersDataset {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<BrokersDataset>;
  if (!Array.isArray(data.categories) || !Array.isArray(data.markets) || !Array.isArray(data.brokers)) {
    return false;
  }

  const categoryIds = new Set(data.categories.map((category) => category?.id).filter(Boolean));
  const marketIds = new Set(data.markets.map((market) => market?.id).filter(Boolean));
  if (categoryIds.size === 0 || marketIds.size === 0) {
    return false;
  }

  const hasValidMarkets = data.markets.every((market) => {
    if (!market || typeof market !== "object") return false;
    if (!categoryIds.has(market.categoryId)) return false;
    const fees = market.defaultFees;
    if (!fees) return false;
    return (
      Number.isFinite(fees.bsmvRate) &&
      Number.isFinite(fees.bistRate) &&
      Number.isFinite(fees.takasbankFixed) &&
      Number.isFinite(fees.spreadRate) &&
      Number.isFinite(fees.swapDailyRate) &&
      Number.isFinite(fees.fxConversionRate) &&
      Number.isFinite(fees.withholdingRate) &&
      fees.bsmvRate >= 0 &&
      fees.bistRate >= 0 &&
      fees.takasbankFixed >= 0 &&
      fees.spreadRate >= 0 &&
      fees.swapDailyRate >= 0 &&
      fees.fxConversionRate >= 0 &&
      fees.withholdingRate >= 0
    );
  });
  if (!hasValidMarkets) {
    return false;
  }

  return data.brokers.every((broker) => {
    if (!broker || typeof broker !== "object") return false;
    if (!Array.isArray(broker.supportedCategories) || !Array.isArray(broker.supportedMarkets)) return false;
    if (!Array.isArray(broker.commissionModel?.tiers) || broker.commissionModel.tiers.length === 0) return false;
    if (!Number.isFinite(broker.commissionModel.minCommission) || broker.commissionModel.minCommission < 0) return false;
    if (!broker.supportedCategories.every((id) => categoryIds.has(id))) return false;
    if (!broker.supportedMarkets.every((id) => marketIds.has(id))) return false;

    let prevMax = -Infinity;
    for (const tier of broker.commissionModel.tiers) {
      if (!Number.isFinite(tier.maxMonthlyVolume) || !Number.isFinite(tier.rate)) return false;
      if (tier.maxMonthlyVolume <= 0 || tier.maxMonthlyVolume < prevMax) return false;
      if (tier.rate < 0 || tier.rate > 0.05) return false;
      prevMax = tier.maxMonthlyVolume;
    }

    if (broker.promotions && !broker.promotions.every((promotion) => Number.isFinite(promotion.rateMultiplier) && promotion.rateMultiplier > 0 && promotion.rateMultiplier <= 2)) {
      return false;
    }

    return true;
  });
}

function parseStoredJson<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

const DEFAULT_DATASET = brokersSeed as BrokersDataset;

export function useCommissionCalculator() {
  const [dataset, setDataset] = useState<BrokersDataset>(DEFAULT_DATASET);
  const [selectedCategoryId, setSelectedCategoryId] = useState(DEFAULT_DATASET.categories[0]?.id ?? "");
  const [selectedMarketId, setSelectedMarketId] = useState(DEFAULT_DATASET.markets[0]?.id ?? "");
  const [selectedBrokerId, setSelectedBrokerId] = useState("");
  const [comparisonBrokerIds, setComparisonBrokerIds] = useState<string[]>([]);

  const [transactionType, setTransactionType] = useState<TransactionType>("buy");
  const [inputMode, setInputMode] = useState<InputMode>("amount");
  const [currency, setCurrency] = useState<CurrencyCode>("TRY");

  const [amountInput, setAmountInput] = useState("100.000");
  const [quantityInput, setQuantityInput] = useState("100");
  const [priceInput, setPriceInput] = useState("120");

  const [monthlyVolumeInput, setMonthlyVolumeInput] = useState("1.000.000");
  const [dailyVolumeInput, setDailyVolumeInput] = useState("50.000");
  const [usdTryInput, setUsdTryInput] = useState(String(DEFAULT_DATASET._meta?.defaultUsdTry ?? 38));
  const [swapDaysInput, setSwapDaysInput] = useState("1");

  const [spreadRateInput, setSpreadRateInput] = useState("");
  const [swapRateInput, setSwapRateInput] = useState("");
  const [fxRateInput, setFxRateInput] = useState("");
  const [withholdingRateInput, setWithholdingRateInput] = useState("");
  const [taxableProfitInput, setTaxableProfitInput] = useState("");

  const [roundTripQuantityInput, setRoundTripQuantityInput] = useState("100");
  const [roundTripEntryPriceInput, setRoundTripEntryPriceInput] = useState("120");
  const [roundTripTargetPriceInput, setRoundTripTargetPriceInput] = useState("132");
  const [roundTripHoldingDaysInput, setRoundTripHoldingDaysInput] = useState("3");

  const [monthlyTradeCountInput, setMonthlyTradeCountInput] = useState("10");
  const [projectionYearsInput, setProjectionYearsInput] = useState("5");
  const [annualReturnInput, setAnnualReturnInput] = useState("25");
  const [btcGrowthInput, setBtcGrowthInput] = useState("60");

  const [manualRateInputs, setManualRateInputs] = useState<Record<string, string>>({});
  const [promotionsEnabled, setPromotionsEnabled] = useState(true);

  const [profileName, setProfileName] = useState("misafir");
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [shareStatus, setShareStatus] = useState("");
  const [liveStatus, setLiveStatus] = useState("");

  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [communityInstitution, setCommunityInstitution] = useState("");
  const [communityRateInput, setCommunityRateInput] = useState("");
  const [communityNote, setCommunityNote] = useState("");
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([]);

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminStatus, setAdminStatus] = useState("");

  const categories = dataset.categories ?? [];
  const markets = dataset.markets ?? [];
  const brokers = dataset.brokers ?? [];

  const selectedCategory = useMemo<Category | null>(() => {
    return categories.find((category) => category.id === selectedCategoryId) ?? null;
  }, [categories, selectedCategoryId]);

  const marketsByCategory = useMemo<Market[]>(() => {
    return markets.filter((market) => market.categoryId === selectedCategoryId);
  }, [markets, selectedCategoryId]);

  const selectedMarket = useMemo<Market | null>(() => {
    return markets.find((market) => market.id === selectedMarketId) ?? null;
  }, [markets, selectedMarketId]);

  const monthlyVolume = parseLocaleNumber(monthlyVolumeInput);
  const dailyVolume = parseLocaleNumber(dailyVolumeInput);
  const effectiveMonthlyVolume = Math.max(monthlyVolume, dailyVolume * 22);
  const usdTryRate = Math.max(parseLocaleNumber(usdTryInput), 1);
  const swapDays = Math.max(parseLocaleNumber(swapDaysInput), 0);

  const notional = useMemo<number>(() => {
    if (inputMode === "amount") {
      return Math.max(parseLocaleNumber(amountInput), 0);
    }
    const qty = Math.max(parseLocaleNumber(quantityInput), 0);
    const price = Math.max(parseLocaleNumber(priceInput), 0);
    return qty * price;
  }, [amountInput, inputMode, priceInput, quantityInput]);

  const filteredBrokers = useMemo<Broker[]>(() => {
    return brokers.filter((broker) => {
      return (
        broker.supportedCategories.includes(selectedCategoryId) &&
        broker.supportedMarkets.includes(selectedMarketId)
      );
    });
  }, [brokers, selectedCategoryId, selectedMarketId]);

  const deferredNotional = useDeferredValue(notional);
  const deferredManualRateInputs = useDeferredValue(manualRateInputs);
  const deferredComparisonIds = useDeferredValue(comparisonBrokerIds);

  const quotes = useMemo<BrokerQuote[]>(() => {
    if (!selectedMarket) {
      return [];
    }

    return filteredBrokers
      .map((broker) =>
        computeBrokerQuote({
          broker,
          market: selectedMarket,
          transactionType,
          notional: deferredNotional,
          currency,
          usdTryRate,
          monthlyVolume: effectiveMonthlyVolume,
          manualRate: parseLocaleNumber(deferredManualRateInputs[broker.id]),
          promotionsEnabled,
          swapDays,
          overrideSpreadRate: parseLocaleNumber(spreadRateInput),
          overrideSwapDailyRate: parseLocaleNumber(swapRateInput),
          overrideFxRate: parseLocaleNumber(fxRateInput),
          overrideWithholdingRate:
            withholdingRateInput === "" ? -1 : parseLocaleNumber(withholdingRateInput) / 100,
          taxableProfitEstimate: parseLocaleNumber(taxableProfitInput),
        })
      )
      .filter((quote): quote is BrokerQuote => Boolean(quote))
      .sort((left, right) => left.totalCostTry - right.totalCostTry);
  }, [
    currency,
    deferredManualRateInputs,
    deferredNotional,
    effectiveMonthlyVolume,
    filteredBrokers,
    fxRateInput,
    promotionsEnabled,
    selectedMarket,
    spreadRateInput,
    swapDays,
    swapRateInput,
    taxableProfitInput,
    transactionType,
    usdTryRate,
    withholdingRateInput,
  ]);

  const selectedQuote = useMemo<BrokerQuote | null>(() => {
    return quotes.find((quote) => quote.brokerId === selectedBrokerId) ?? quotes[0] ?? null;
  }, [quotes, selectedBrokerId]);

  const cheapestThree = quotes.slice(0, 3);
  const worstQuote = quotes[quotes.length - 1] ?? null;

  const simulation = useMemo<RoundTripSimulation | null>(() => {
    if (!selectedQuote || !selectedMarket) {
      return null;
    }

    const broker = filteredBrokers.find((item) => item.id === selectedQuote.brokerId);
    if (!broker) {
      return null;
    }

    return computeRoundTripSimulation({
      broker,
      market: selectedMarket,
      quantity: parseLocaleNumber(roundTripQuantityInput),
      entryPrice: parseLocaleNumber(roundTripEntryPriceInput),
      targetPrice: parseLocaleNumber(roundTripTargetPriceInput),
      currency,
      usdTryRate,
      monthlyVolume: effectiveMonthlyVolume,
      manualRate: parseLocaleNumber(deferredManualRateInputs[broker.id]),
      promotionsEnabled,
      holdingDays: parseLocaleNumber(roundTripHoldingDaysInput),
      overrideSpreadRate: parseLocaleNumber(spreadRateInput),
      overrideSwapDailyRate: parseLocaleNumber(swapRateInput),
      overrideFxRate: parseLocaleNumber(fxRateInput),
      overrideWithholdingRate:
        withholdingRateInput === "" ? -1 : parseLocaleNumber(withholdingRateInput) / 100,
    });
  }, [
    currency,
    deferredManualRateInputs,
    effectiveMonthlyVolume,
    filteredBrokers,
    fxRateInput,
    promotionsEnabled,
    roundTripEntryPriceInput,
    roundTripHoldingDaysInput,
    roundTripQuantityInput,
    roundTripTargetPriceInput,
    selectedMarket,
    selectedQuote,
    spreadRateInput,
    swapRateInput,
    usdTryRate,
    withholdingRateInput,
  ]);

  const projection = useMemo<LongTermProjection | null>(() => {
    return computeLongTermProjection({
      quote: selectedQuote,
      monthlyTradeCount: parseLocaleNumber(monthlyTradeCountInput),
      years: parseLocaleNumber(projectionYearsInput),
      annualReturnRate: parseLocaleNumber(annualReturnInput),
      annualBtcGrowthRate: parseLocaleNumber(btcGrowthInput),
    });
  }, [annualReturnInput, btcGrowthInput, monthlyTradeCountInput, projectionYearsInput, selectedQuote]);

  const scenarioQuotes = useMemo(() => {
    return quotes.filter((quote) => deferredComparisonIds.includes(quote.brokerId)).slice(0, 3);
  }, [deferredComparisonIds, quotes]);

  const annualScenarioRows: ScenarioRow[] = scenarioQuotes.map((quote) => ({
    quote,
    annualCost: quote.totalCostTry * Math.max(parseLocaleNumber(monthlyTradeCountInput), 0) * 12,
  }));

  const scenarioMin = annualScenarioRows.length
    ? Math.min(...annualScenarioRows.map((row) => row.annualCost))
    : 0;

  useEffect(() => {
    if (marketsByCategory.length === 0) {
      return;
    }
    const hasSelectedMarket = marketsByCategory.some((market) => market.id === selectedMarketId);
    if (!hasSelectedMarket) {
      setSelectedMarketId(marketsByCategory[0].id);
    }
  }, [marketsByCategory, selectedMarketId]);

  useEffect(() => {
    if (quotes.length === 0) {
      setSelectedBrokerId("");
      return;
    }
    const hasSelectedBroker = quotes.some((quote) => quote.brokerId === selectedBrokerId);
    if (!hasSelectedBroker) {
      setSelectedBrokerId(quotes[0].brokerId);
    }
  }, [quotes, selectedBrokerId]);

  useEffect(() => {
    const availableIds = new Set(quotes.map((quote) => quote.brokerId));
    const cleaned = comparisonBrokerIds.filter((id) => availableIds.has(id));
    if (cleaned.length !== comparisonBrokerIds.length) {
      setComparisonBrokerIds(cleaned);
      return;
    }
    if (cleaned.length === 0 && quotes.length > 0) {
      setComparisonBrokerIds(quotes.slice(0, 3).map((quote) => quote.brokerId));
    }
  }, [comparisonBrokerIds, quotes]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const category = searchParams.get("category");
    const market = searchParams.get("market");
    const type = searchParams.get("type") as TransactionType | null;
    const mode = searchParams.get("mode") as InputMode | null;
    const curr = searchParams.get("currency") as CurrencyCode | null;
    const amount = searchParams.get("amount");
    const qty = searchParams.get("qty");
    const price = searchParams.get("price");
    const monthly = searchParams.get("monthly");

    if (category) setSelectedCategoryId(category);
    if (market) setSelectedMarketId(market);
    if (type === "buy" || type === "sell" || type === "roundtrip") setTransactionType(type);
    if (mode === "amount" || mode === "quantity_price") setInputMode(mode);
    if (curr === "TRY" || curr === "USD") setCurrency(curr);
    if (amount) setAmountInput(amount);
    if (qty) setQuantityInput(qty);
    if (price) setPriceInput(price);
    if (monthly) setMonthlyVolumeInput(monthly);
  }, []);

  useEffect(() => {
    const normalized = profileName.trim().toLowerCase() || "misafir";
    const saved = window.localStorage.getItem(`${STORAGE_KEYS.history}:${normalized}`);
    setHistoryItems(parseStoredJson<HistoryItem[]>(saved, []));
  }, [profileName]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEYS.reports);
    setCommunityReports(parseStoredJson<CommunityReport[]>(saved, []));
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedMarketId("");
    setSelectedBrokerId("");
    setComparisonBrokerIds([]);
  };

  const toggleScenarioBroker = (brokerId: string) => {
    setComparisonBrokerIds((current) => {
      if (current.includes(brokerId)) {
        return current.filter((id) => id !== brokerId);
      }
      if (current.length >= 3) {
        return [...current.slice(1), brokerId];
      }
      return [...current, brokerId];
    });
  };

  const saveHistory = () => {
    if (!selectedQuote) {
      return;
    }

    const normalized = profileName.trim().toLowerCase() || "misafir";
    const newItem: HistoryItem = {
      id: `${Date.now()}`,
      timestamp: new Date().toISOString(),
      category: selectedCategory?.name ?? "-",
      market: selectedMarket?.name ?? "-",
      broker: selectedQuote.brokerName,
      totalCostTry: selectedQuote.totalCostTry,
      effectiveCostPct: selectedQuote.effectiveCostPct,
      transactionType,
      notional,
      currency,
    };

    const updated = [newItem, ...historyItems].slice(0, 25);
    setHistoryItems(updated);
    window.localStorage.setItem(`${STORAGE_KEYS.history}:${normalized}`, JSON.stringify(updated));
  };

  const deleteHistoryItem = (id: string) => {
    const normalized = profileName.trim().toLowerCase() || "misafir";
    const updated = historyItems.filter((item) => item.id !== id);
    setHistoryItems(updated);
    window.localStorage.setItem(`${STORAGE_KEYS.history}:${normalized}`, JSON.stringify(updated));
  };

  const handleShare = async () => {
    const query = buildShareQuery({
      category: selectedCategoryId,
      market: selectedMarketId,
      type: transactionType,
      mode: inputMode,
      currency,
      amount: amountInput,
      qty: quantityInput,
      price: priceInput,
      monthly: monthlyVolumeInput,
    });
    const url = `${window.location.origin}/tools?${query}`;

    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Paylasim linki kopyalandi.");
    } catch {
      setShareStatus(url);
    }
  };

  const exportExcel = () => {
    const rows = [
      [
        "Kurum",
        "Kategori",
        "Piyasa",
        "Islem Tipi",
        "Toplam Maliyet (TRY)",
        "Efektif Maliyet (%)",
        "Komisyon",
        "BSMV",
        "BIST Payi",
        "Takasbank",
        "Spread",
        "Swap",
        "Doviz Cevrim",
        "Stopaj",
      ].join(";"),
      ...quotes.map((quote) =>
        [
          quote.brokerName,
          selectedCategory?.name ?? "",
          selectedMarket?.name ?? "",
          transactionType,
          quote.totalCostTry.toFixed(2),
          quote.effectiveCostPct.toFixed(4),
          quote.breakdown.commission.toFixed(2),
          quote.breakdown.bsmv.toFixed(2),
          quote.breakdown.bistPayi.toFixed(2),
          quote.breakdown.takasbank.toFixed(2),
          quote.breakdown.spread.toFixed(2),
          quote.breakdown.swap.toFixed(2),
          quote.breakdown.fxConversion.toFixed(2),
          quote.breakdown.stopaj.toFixed(2),
        ].join(";")
      ),
    ];

    downloadTextFile("komisyon-karsilastirma.csv", `\uFEFF${rows.join("\n")}`, "text/csv;charset=utf-8");
  };

  const exportPdf = () => {
    if (!selectedQuote) {
      return;
    }

    const popup = window.open("", "_blank", "width=920,height=760");
    if (!popup) {
      return;
    }

    const html = `
      <html>
        <head>
          <title>Komisyon Raporu</title>
          <style>
            body{font-family:Arial,sans-serif;padding:24px;color:#111}
            h1{margin:0 0 6px;font-size:24px}
            .meta{color:#555;margin-bottom:18px}
            table{border-collapse:collapse;width:100%;margin-top:12px}
            th,td{border:1px solid #ddd;padding:8px;text-align:left}
            th{background:#f5f5f5}
          </style>
        </head>
        <body>
          <h1>FinCognis Komisyon Raporu</h1>
          <div class="meta">${new Date().toLocaleString("tr-TR")}</div>
          <p><strong>Kategori:</strong> ${selectedCategory?.name ?? "-"}</p>
          <p><strong>Piyasa:</strong> ${selectedMarket?.name ?? "-"}</p>
          <p><strong>Secilen Kurum:</strong> ${selectedQuote.brokerName}</p>
          <p><strong>Toplam Maliyet:</strong> ${formatMoney(selectedQuote.totalCostTry)}</p>
          <p><strong>Efektif Maliyet:</strong> ${formatPercent(selectedQuote.effectiveCostPct)}</p>
          <h3>Maliyet Kirilimi</h3>
          <table>
            <tr><th>Kalem</th><th>Tutar (TRY)</th></tr>
            <tr><td>Komisyon</td><td>${selectedQuote.breakdown.commission.toFixed(2)}</td></tr>
            <tr><td>BSMV</td><td>${selectedQuote.breakdown.bsmv.toFixed(2)}</td></tr>
            <tr><td>BIST Payi</td><td>${selectedQuote.breakdown.bistPayi.toFixed(2)}</td></tr>
            <tr><td>Takasbank</td><td>${selectedQuote.breakdown.takasbank.toFixed(2)}</td></tr>
            <tr><td>Spread</td><td>${selectedQuote.breakdown.spread.toFixed(2)}</td></tr>
            <tr><td>Swap</td><td>${selectedQuote.breakdown.swap.toFixed(2)}</td></tr>
            <tr><td>Doviz Cevrim</td><td>${selectedQuote.breakdown.fxConversion.toFixed(2)}</td></tr>
            <tr><td>Stopaj</td><td>${selectedQuote.breakdown.stopaj.toFixed(2)}</td></tr>
          </table>
        </body>
      </html>
    `;

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 300);
  };

  const refreshLiveRates = async () => {
    setLiveStatus("Canli veriler cekiliyor...");

    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD");
      const currencyData = (await response.json()) as { rates?: { TRY?: number } };
      const nextTry = currencyData?.rates?.TRY;
      if (typeof nextTry === "number" && Number.isFinite(nextTry)) {
        setUsdTryInput(nextTry.toFixed(4));
      }

      const spreadResponse = await fetch(
        "https://api.binance.com/api/v3/ticker/bookTicker?symbol=BTCUSDT"
      );
      const spreadData = (await spreadResponse.json()) as { bidPrice?: string; askPrice?: string };
      const bid = Number.parseFloat(spreadData?.bidPrice ?? "0");
      const ask = Number.parseFloat(spreadData?.askPrice ?? "0");

      if (bid > 0 && ask > 0) {
        const spreadRate = (ask - bid) / ((ask + bid) / 2);
        setSpreadRateInput(toInputValue(spreadRate, 6));
      }

      setLiveStatus("Kur ve spread verileri guncellendi.");
    } catch {
      setLiveStatus("Canli veri servisine ulasilamadi. Elle giris kullaniliyor.");
    }
  };

  const submitFeedback = () => {
    const body = encodeURIComponent(
      `Kategori: ${selectedCategory?.name ?? "-"}\nPiyasa: ${
        selectedMarket?.name ?? "-"
      }\nMesaj: ${feedbackMessage}`
    );
    window.open(
      `mailto:fincognis@gmail.com?subject=Komisyon Hesaplayici Geri Bildirim&body=${body}`,
      "_blank"
    );
    setFeedbackMessage("");
  };

  const submitCommunityRateReport = () => {
    if (!communityInstitution || !communityRateInput) {
      return;
    }

    const report: CommunityReport = {
      id: `${Date.now()}`,
      institution: communityInstitution,
      suggestedRate: parseLocaleNumber(communityRateInput),
      note: communityNote,
      createdAt: new Date().toISOString(),
    };
    const updated = [report, ...communityReports].slice(0, 50);
    setCommunityReports(updated);
    window.localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(updated));
    setCommunityInstitution("");
    setCommunityRateInput("");
    setCommunityNote("");
  };

  const exportBrokerJson = () => {
    downloadTextFile("broker-tarifeleri.json", JSON.stringify(dataset, null, 2), "application/json;charset=utf-8");
    setAdminStatus("Mevcut broker verisi JSON olarak indirildi.");
  };

  const importBrokerJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as unknown;
      if (!isValidDataset(parsed)) {
        throw new Error("invalid-json");
      }
      startTransition(() => setDataset(parsed));
      setAdminStatus("JSON yuklendi ve tarifeler guncellendi.");
    } catch {
      setAdminStatus("JSON dosyasi gecersiz. categories/markets/brokers alanlari gerekli.");
    } finally {
      event.target.value = "";
    }
  };

  const updateFirstTierRate = (brokerId: string, value: string) => {
    const nextRate = parseLocaleNumber(value);
    setDataset((current) => ({
      ...current,
      brokers: current.brokers.map((broker) => {
        if (broker.id !== brokerId) {
          return broker;
        }
        return {
          ...broker,
          commissionModel: {
            ...broker.commissionModel,
            tiers: broker.commissionModel.tiers.map((tier, index) => {
              return index === 0 ? { ...tier, rate: nextRate } : tier;
            }),
          },
        };
      }),
    }));
  };

  const parseBistPdf = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedMarket) {
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder("latin1").decode(buffer);
      let extractedRate: number | null = null;

      const exactMatch = text.match(/0[.,]0000?25/);
      if (exactMatch) {
        extractedRate = Number.parseFloat(exactMatch[0].replace(",", "."));
      }

      if (!extractedRate) {
        const ratioMatch = text.match(/([0-9]+[.,][0-9]+)\s*(?:yuzbinde|\/\s*100000)/i);
        if (ratioMatch) {
          extractedRate = Number.parseFloat(ratioMatch[1].replace(",", ".")) / 100000;
        }
      }

      if (!extractedRate) {
        setAdminStatus("PDF icinden otomatik BIST orani bulunamadi. Metin tabanli PDF veya manuel duzenleme kullanin.");
        return;
      }

      const safeRate = Math.max(extractedRate, 0);
      setDataset((current) => ({
        ...current,
        markets: current.markets.map((market) =>
          market.id === selectedMarket.id
            ? { ...market, defaultFees: { ...market.defaultFees, bistRate: safeRate } }
            : market
        ),
      }));
      setAdminStatus(`BIST orani PDF'den algilandi: ${safeRate.toFixed(8)} (${selectedMarket.name}).`);
    } catch {
      setAdminStatus("PDF okunamadi.");
    } finally {
      event.target.value = "";
    }
  };

  return {
    FEE_INFO,
    dataset,
    setDataset,
    categories,
    marketsByCategory,
    filteredBrokers,
    selectedCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedMarket,
    selectedMarketId,
    setSelectedMarketId,
    selectedBrokerId,
    setSelectedBrokerId,
    quotes,
    selectedQuote,
    cheapestThree,
    worstQuote,
    comparisonBrokerIds,
    setComparisonBrokerIds,
    annualScenarioRows,
    scenarioMin,
    simulation,
    projection,
    notional,
    effectiveMonthlyVolume,
    usdTryRate,
    amountInput,
    setAmountInput,
    quantityInput,
    setQuantityInput,
    priceInput,
    setPriceInput,
    monthlyVolumeInput,
    setMonthlyVolumeInput,
    dailyVolumeInput,
    setDailyVolumeInput,
    usdTryInput,
    setUsdTryInput,
    swapDaysInput,
    setSwapDaysInput,
    spreadRateInput,
    setSpreadRateInput,
    swapRateInput,
    setSwapRateInput,
    fxRateInput,
    setFxRateInput,
    withholdingRateInput,
    setWithholdingRateInput,
    taxableProfitInput,
    setTaxableProfitInput,
    roundTripQuantityInput,
    setRoundTripQuantityInput,
    roundTripEntryPriceInput,
    setRoundTripEntryPriceInput,
    roundTripTargetPriceInput,
    setRoundTripTargetPriceInput,
    roundTripHoldingDaysInput,
    setRoundTripHoldingDaysInput,
    monthlyTradeCountInput,
    setMonthlyTradeCountInput,
    projectionYearsInput,
    setProjectionYearsInput,
    annualReturnInput,
    setAnnualReturnInput,
    btcGrowthInput,
    setBtcGrowthInput,
    manualRateInputs,
    setManualRateInputs,
    transactionType,
    setTransactionType,
    inputMode,
    setInputMode,
    currency,
    setCurrency,
    promotionsEnabled,
    setPromotionsEnabled,
    profileName,
    setProfileName,
    historyItems,
    shareStatus,
    setShareStatus,
    liveStatus,
    setLiveStatus,
    feedbackMessage,
    setFeedbackMessage,
    communityInstitution,
    setCommunityInstitution,
    communityRateInput,
    setCommunityRateInput,
    communityNote,
    setCommunityNote,
    communityReports,
    showAdminPanel,
    setShowAdminPanel,
    adminStatus,
    setAdminStatus,
    handleCategoryChange,
    toggleScenarioBroker,
    saveHistory,
    deleteHistoryItem,
    handleShare,
    exportExcel,
    exportPdf,
    refreshLiveRates,
    submitFeedback,
    submitCommunityRateReport,
    exportBrokerJson,
    importBrokerJson,
    updateFirstTierRate,
    parseBistPdf,
  };
}

export type UseCommissionCalculatorResult = ReturnType<typeof useCommissionCalculator>;

export type FileInputEvent = ChangeEvent<HTMLInputElement>;
