"use client";

import { useEffect, useMemo, useState } from "react";
import brokersSeed from "./brokers.json";
import {
  CURRENCIES,
  INPUT_MODES,
  TRANSACTION_TYPES,
  buildShareQuery,
  computeBrokerQuote,
  computeLongTermProjection,
  computeRoundTripSimulation,
  downloadTextFile,
  formatCompactNumber,
  formatMoney,
  formatPercent,
  parseLocaleNumber,
  toInputValue,
} from "./commissionHelpers";

const FEE_INFO = {
  commission: "Araci kurumun uyguladigi islem ucreti. Kademeli oran ile otomatik hesaplanir.",
  bsmv: "Banka ve Sigorta Muameleleri Vergisi. Genelde komisyon uzerinden %5 uygulanir.",
  bistPayi: "Borsa payi. Pay piyasasinda yuzbinde 2,5 seviyesinde olabilir.",
  takasbank: "Takas ve saklama hizmet bedeli.",
  spread: "Alis-satis makasi kaynakli zimmi maliyet.",
  swap: "Pozisyon tasima maliyeti (overnight).",
  fxConversion: "USD/TRY gibi doviz cevrimlerinde uygulanan maliyet.",
  stopaj: "Vergiye tabi kar olustuysa uygulanan kesinti.",
};

const STORAGE_KEYS = {
  history: "commission-history",
  reports: "commission-rate-reports",
};

function InfoTip({ text }) {
  return (
    <span
      className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-surface-container-high text-[10px] font-bold text-secondary"
      title={text}
      aria-label={text}
    >
      ?
    </span>
  );
}

function parseManualRateInput(value) {
  const cleaned = value.replace(/[^0-9,.-]/g, "");
  return cleaned;
}

function CostPie({ breakdown, total }) {
  const segments = [
    { id: "commission", label: "Komisyon", color: "#4ade80", value: breakdown.commission },
    { id: "bsmv", label: "BSMV", color: "#60a5fa", value: breakdown.bsmv },
    { id: "bistPayi", label: "BIST", color: "#f59e0b", value: breakdown.bistPayi },
    { id: "takasbank", label: "Takasbank", color: "#a78bfa", value: breakdown.takasbank },
    { id: "spread", label: "Spread", color: "#f97316", value: breakdown.spread },
    { id: "swap", label: "Swap", color: "#14b8a6", value: breakdown.swap },
    { id: "fxConversion", label: "Doviz", color: "#f43f5e", value: breakdown.fxConversion },
    { id: "stopaj", label: "Stopaj", color: "#ef4444", value: breakdown.stopaj },
  ].filter((item) => item.value > 0);

  if (!total || segments.length === 0) {
    return (
      <div className="flex h-40 w-40 items-center justify-center rounded-full bg-surface-container-high text-xs text-on-surface-variant">
        Veri yok
      </div>
    );
  }

  let progress = 0;
  const gradient = segments
    .map((segment) => {
      const start = progress * 360;
      const ratio = segment.value / total;
      progress += ratio;
      const end = progress * 360;
      return `${segment.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-5">
      <div
        className="relative h-40 w-40 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="absolute inset-5 flex items-center justify-center rounded-full bg-surface text-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
              Toplam
            </p>
            <p className="font-headline text-sm font-bold text-on-surface">
              {formatMoney(total)}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {segments.map((segment) => (
          <div key={segment.id} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="min-w-[72px] text-on-surface-variant">{segment.label}</span>
            <span className="font-semibold text-on-surface">
              {formatPercent((segment.value / total) * 100, 1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CommissionCalculator() {
  const [dataset, setDataset] = useState(brokersSeed);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    brokersSeed.categories[0]?.id ?? ""
  );
  const [selectedMarketId, setSelectedMarketId] = useState(
    brokersSeed.markets[0]?.id ?? ""
  );
  const [selectedBrokerId, setSelectedBrokerId] = useState("");
  const [comparisonBrokerIds, setComparisonBrokerIds] = useState([]);

  const [transactionType, setTransactionType] = useState("buy");
  const [inputMode, setInputMode] = useState("amount");
  const [currency, setCurrency] = useState("TRY");

  const [amountInput, setAmountInput] = useState("100.000");
  const [quantityInput, setQuantityInput] = useState("100");
  const [priceInput, setPriceInput] = useState("120");

  const [monthlyVolumeInput, setMonthlyVolumeInput] = useState("1.000.000");
  const [dailyVolumeInput, setDailyVolumeInput] = useState("50.000");
  const [usdTryInput, setUsdTryInput] = useState(
    String(brokersSeed._meta.defaultUsdTry ?? 38)
  );
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

  const [manualRateInputs, setManualRateInputs] = useState({});
  const [promotionsEnabled, setPromotionsEnabled] = useState(true);

  const [profileName, setProfileName] = useState("misafir");
  const [historyItems, setHistoryItems] = useState([]);
  const [shareStatus, setShareStatus] = useState("");
  const [liveStatus, setLiveStatus] = useState("");

  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [communityInstitution, setCommunityInstitution] = useState("");
  const [communityRateInput, setCommunityRateInput] = useState("");
  const [communityNote, setCommunityNote] = useState("");
  const [communityReports, setCommunityReports] = useState([]);

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminStatus, setAdminStatus] = useState("");

  const categories = dataset.categories ?? [];
  const markets = dataset.markets ?? [];
  const brokers = dataset.brokers ?? [];

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );
  const marketsByCategory = useMemo(
    () => markets.filter((market) => market.categoryId === selectedCategoryId),
    [markets, selectedCategoryId]
  );
  const selectedMarket = useMemo(
    () => markets.find((market) => market.id === selectedMarketId) ?? null,
    [markets, selectedMarketId]
  );

  const monthlyVolume = parseLocaleNumber(monthlyVolumeInput);
  const dailyVolume = parseLocaleNumber(dailyVolumeInput);
  const effectiveMonthlyVolume = Math.max(monthlyVolume, dailyVolume * 22);
  const usdTryRate = Math.max(parseLocaleNumber(usdTryInput), 1);
  const swapDays = Math.max(parseLocaleNumber(swapDaysInput), 0);

  const notional = useMemo(() => {
    if (inputMode === "amount") {
      return Math.max(parseLocaleNumber(amountInput), 0);
    }

    const qty = Math.max(parseLocaleNumber(quantityInput), 0);
    const price = Math.max(parseLocaleNumber(priceInput), 0);
    return qty * price;
  }, [inputMode, amountInput, quantityInput, priceInput]);

  const filteredBrokers = useMemo(
    () =>
      brokers.filter(
        (broker) =>
          broker.supportedCategories.includes(selectedCategoryId) &&
          broker.supportedMarkets.includes(selectedMarketId)
      ),
    [brokers, selectedCategoryId, selectedMarketId]
  );

  const quotes = useMemo(() => {
    if (!selectedMarket) {
      return [];
    }

    return filteredBrokers
      .map((broker) =>
        computeBrokerQuote({
          broker,
          market: selectedMarket,
          transactionType,
          notional,
          currency,
          usdTryRate,
          monthlyVolume: effectiveMonthlyVolume,
          manualRate: parseLocaleNumber(manualRateInputs[broker.id]),
          promotionsEnabled,
          swapDays,
          overrideSpreadRate: parseLocaleNumber(spreadRateInput),
          overrideSwapDailyRate: parseLocaleNumber(swapRateInput),
          overrideFxRate: parseLocaleNumber(fxRateInput),
          overrideWithholdingRate:
            withholdingRateInput === ""
              ? -1
              : parseLocaleNumber(withholdingRateInput) / 100,
          taxableProfitEstimate: parseLocaleNumber(taxableProfitInput),
        })
      )
      .filter(Boolean)
      .sort((left, right) => left.totalCostTry - right.totalCostTry);
  }, [
    selectedMarket,
    filteredBrokers,
    transactionType,
    notional,
    currency,
    usdTryRate,
    effectiveMonthlyVolume,
    manualRateInputs,
    promotionsEnabled,
    swapDays,
    spreadRateInput,
    swapRateInput,
    fxRateInput,
    withholdingRateInput,
    taxableProfitInput,
  ]);

  const selectedQuote = useMemo(
    () => quotes.find((quote) => quote.brokerId === selectedBrokerId) ?? quotes[0] ?? null,
    [quotes, selectedBrokerId]
  );
  const cheapestThree = quotes.slice(0, 3);
  const worstQuote = quotes[quotes.length - 1] ?? null;

  const simulation = useMemo(() => {
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
      manualRate: parseLocaleNumber(manualRateInputs[broker.id]),
      promotionsEnabled,
      holdingDays: parseLocaleNumber(roundTripHoldingDaysInput),
      overrideSpreadRate: parseLocaleNumber(spreadRateInput),
      overrideSwapDailyRate: parseLocaleNumber(swapRateInput),
      overrideFxRate: parseLocaleNumber(fxRateInput),
      overrideWithholdingRate:
        withholdingRateInput === ""
          ? -1
          : parseLocaleNumber(withholdingRateInput) / 100,
    });
  }, [
    selectedQuote,
    selectedMarket,
    filteredBrokers,
    roundTripQuantityInput,
    roundTripEntryPriceInput,
    roundTripTargetPriceInput,
    currency,
    usdTryRate,
    effectiveMonthlyVolume,
    manualRateInputs,
    promotionsEnabled,
    roundTripHoldingDaysInput,
    spreadRateInput,
    swapRateInput,
    fxRateInput,
    withholdingRateInput,
  ]);

  const projection = useMemo(
    () =>
      computeLongTermProjection({
        quote: selectedQuote,
        monthlyTradeCount: parseLocaleNumber(monthlyTradeCountInput),
        years: parseLocaleNumber(projectionYearsInput),
        annualReturnRate: parseLocaleNumber(annualReturnInput),
        annualBtcGrowthRate: parseLocaleNumber(btcGrowthInput),
      }),
    [
      selectedQuote,
      monthlyTradeCountInput,
      projectionYearsInput,
      annualReturnInput,
      btcGrowthInput,
    ]
  );

  const scenarioQuotes = useMemo(
    () => quotes.filter((quote) => comparisonBrokerIds.includes(quote.brokerId)).slice(0, 3),
    [quotes, comparisonBrokerIds]
  );

  useEffect(() => {
    if (marketsByCategory.length === 0) {
      return;
    }

    const hasSelectedMarket = marketsByCategory.some(
      (market) => market.id === selectedMarketId
    );
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
  }, [quotes, comparisonBrokerIds]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const category = searchParams.get("category");
    const market = searchParams.get("market");
    const type = searchParams.get("type");
    const mode = searchParams.get("mode");
    const curr = searchParams.get("currency");
    const amount = searchParams.get("amount");
    const qty = searchParams.get("qty");
    const price = searchParams.get("price");
    const monthly = searchParams.get("monthly");

    if (category) setSelectedCategoryId(category);
    if (market) setSelectedMarketId(market);
    if (type) setTransactionType(type);
    if (mode) setInputMode(mode);
    if (curr) setCurrency(curr);
    if (amount) setAmountInput(amount);
    if (qty) setQuantityInput(qty);
    if (price) setPriceInput(price);
    if (monthly) setMonthlyVolumeInput(monthly);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const normalized = profileName.trim().toLowerCase() || "misafir";
    const saved = window.localStorage.getItem(`${STORAGE_KEYS.history}:${normalized}`);
    setHistoryItems(saved ? JSON.parse(saved) : []);
  }, [profileName]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem(STORAGE_KEYS.reports);
    setCommunityReports(saved ? JSON.parse(saved) : []);
  }, []);

  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setSelectedMarketId("");
    setSelectedBrokerId("");
    setComparisonBrokerIds([]);
  };

  const toggleScenarioBroker = (brokerId) => {
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
    if (!selectedQuote || typeof window === "undefined") {
      return;
    }

    const normalized = profileName.trim().toLowerCase() || "misafir";
    const newItem = {
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
    window.localStorage.setItem(
      `${STORAGE_KEYS.history}:${normalized}`,
      JSON.stringify(updated)
    );
  };

  const deleteHistoryItem = (id) => {
    if (typeof window === "undefined") {
      return;
    }

    const normalized = profileName.trim().toLowerCase() || "misafir";
    const updated = historyItems.filter((item) => item.id !== id);
    setHistoryItems(updated);
    window.localStorage.setItem(
      `${STORAGE_KEYS.history}:${normalized}`,
      JSON.stringify(updated)
    );
  };

  const handleShare = async () => {
    if (typeof window === "undefined") {
      return;
    }

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

    downloadTextFile(
      "komisyon-karsilastirma.csv",
      `\uFEFF${rows.join("\n")}`,
      "text/csv;charset=utf-8"
    );
  };

  const exportPdf = () => {
    if (!selectedQuote || typeof window === "undefined") {
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
      const currencyData = await response.json();
      if (currencyData?.rates?.TRY) {
        setUsdTryInput(String(currencyData.rates.TRY.toFixed(4)));
      }

      const spreadResponse = await fetch(
        "https://api.binance.com/api/v3/ticker/bookTicker?symbol=BTCUSDT"
      );
      const spreadData = await spreadResponse.json();
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
      `Kategori: ${selectedCategory?.name ?? "-"}\nPiyasa: ${selectedMarket?.name ?? "-"}\nMesaj: ${feedbackMessage}`
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

    const report = {
      id: `${Date.now()}`,
      institution: communityInstitution,
      suggestedRate: parseLocaleNumber(communityRateInput),
      note: communityNote,
      createdAt: new Date().toISOString(),
    };
    const updated = [report, ...communityReports].slice(0, 50);
    setCommunityReports(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(updated));
    }
    setCommunityInstitution("");
    setCommunityRateInput("");
    setCommunityNote("");
  };

  const exportBrokerJson = () => {
    downloadTextFile(
      "broker-tarifeleri.json",
      JSON.stringify(dataset, null, 2),
      "application/json;charset=utf-8"
    );
    setAdminStatus("Mevcut broker verisi JSON olarak indirildi.");
  };

  const importBrokerJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const parsed = JSON.parse(content);
      if (!parsed?.categories || !parsed?.markets || !parsed?.brokers) {
        throw new Error("invalid");
      }
      setDataset(parsed);
      setAdminStatus("JSON yuklendi ve tarifeler guncellendi.");
    } catch {
      setAdminStatus("JSON dosyasi gecersiz. categories/markets/brokers alanlari gerekli.");
    } finally {
      event.target.value = "";
    }
  };

  const updateFirstTierRate = (brokerId, value) => {
    setDataset((current) => ({
      ...current,
      brokers: current.brokers.map((broker) => {
        if (broker.id !== brokerId) {
          return broker;
        }
        const nextRate = parseLocaleNumber(value);
        const tiers = broker.commissionModel.tiers.map((tier, index) =>
          index === 0 ? { ...tier, rate: nextRate } : tier
        );
        return {
          ...broker,
          commissionModel: {
            ...broker.commissionModel,
            tiers,
          },
        };
      }),
    }));
  };

  const parseBistPdf = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedMarket) {
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder("latin1").decode(buffer);
      let extractedRate = null;

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
        setAdminStatus(
          "PDF icinden otomatik BIST orani bulunamadi. Metin tabanli PDF veya manuel duzenleme kullanin."
        );
        return;
      }

      const safeRate = Math.max(extractedRate, 0);
      setDataset((current) => ({
        ...current,
        markets: current.markets.map((market) =>
          market.id === selectedMarket.id
            ? {
                ...market,
                defaultFees: {
                  ...market.defaultFees,
                  bistRate: safeRate,
                },
              }
            : market
        ),
      }));
      setAdminStatus(
        `BIST orani PDF'den algilandi: ${safeRate.toFixed(8)} (${selectedMarket.name}).`
      );
    } catch {
      setAdminStatus("PDF okunamadi.");
    } finally {
      event.target.value = "";
    }
  };

  const annualScenarioRows = scenarioQuotes.map((quote) => ({
    quote,
    annualCost: quote.totalCostTry * Math.max(parseLocaleNumber(monthlyTradeCountInput), 0) * 12,
  }));
  const scenarioMin = annualScenarioRows.length
    ? Math.min(...annualScenarioRows.map((row) => row.annualCost))
    : 0;

  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="rounded-[28px] bg-surface-container-low p-5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] sm:p-6">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
              <span
                className="material-symbols-outlined text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                payments
              </span>
            </div>
            <div className="min-w-[230px]">
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.24em] text-secondary">
                FinCognis Master Araci
              </p>
              <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
                Komisyon Hesaplayici ve Karsilastirma Motoru
              </h2>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                onClick={handleShare}
                className="rounded-xl bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-high"
              >
                Sonucu Paylas
              </button>
              <button
                onClick={exportPdf}
                className="rounded-xl bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-high"
              >
                PDF Export
              </button>
              <button
                onClick={exportExcel}
                className="rounded-xl bg-surface px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-high"
              >
                Excel Export
              </button>
              <button
                onClick={refreshLiveRates}
                className="rounded-xl bg-secondary/15 px-4 py-2 text-xs font-bold text-secondary hover:bg-secondary/20"
              >
                API ile Kur/Spread Guncelle
              </button>
            </div>
          </div>

          {shareStatus && (
            <div className="mb-3 rounded-xl bg-surface px-4 py-2 text-xs text-on-surface-variant">
              {shareStatus}
            </div>
          )}
          {liveStatus && (
            <div className="mb-3 rounded-xl bg-surface px-4 py-2 text-xs text-on-surface-variant">
              {liveStatus}
            </div>
          )}

          <div className="mb-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                Islem Buyuklugu
              </p>
              <p className="mt-1 font-headline text-xl font-bold text-on-surface">
                {formatMoney(notional, currency)}
              </p>
            </div>
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                Karsilastirilan Kurum
              </p>
              <p className="mt-1 font-headline text-xl font-bold text-on-surface">
                {quotes.length}
              </p>
            </div>
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                En Ucuz Kurum
              </p>
              <p className="mt-1 text-sm font-bold text-secondary">
                {quotes[0]?.brokerName ?? "-"}
              </p>
            </div>
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                Maliyet Araligi
              </p>
              <p className="mt-1 text-sm font-bold text-on-surface">
                {quotes.length > 1
                  ? `${formatMoney(quotes[0].totalCostTry)} - ${formatMoney(
                      quotes[quotes.length - 1].totalCostTry
                    )}`
                  : "-"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                1) Kategori Secimi
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                      selectedCategoryId === category.id
                        ? "border-secondary/40 bg-secondary/15 text-secondary"
                        : "border-outline-variant/15 bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <p className="font-semibold">{category.name}</p>
                    <p className="mt-1 text-[11px] opacity-80">{category.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                2) Islem Parametreleri
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-on-surface-variant">
                  Piyasa
                  <select
                    value={selectedMarketId}
                    onChange={(event) => setSelectedMarketId(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  >
                    {marketsByCategory.map((market) => (
                      <option key={market.id} value={market.id}>
                        {market.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs text-on-surface-variant">
                  Islem Tipi
                  <select
                    value={transactionType}
                    onChange={(event) => setTransactionType(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  >
                    {TRANSACTION_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs text-on-surface-variant">
                  Giris Modeli
                  <select
                    value={inputMode}
                    onChange={(event) => setInputMode(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  >
                    {INPUT_MODES.map((mode) => (
                      <option key={mode.id} value={mode.id}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs text-on-surface-variant">
                  Para Birimi
                  <select
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr.id} value={curr.id}>
                        {curr.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 rounded-2xl bg-surface p-4 xl:grid-cols-3">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                3) Islem Girisi
              </p>
              {inputMode === "amount" ? (
                <label className="block text-xs text-on-surface-variant">
                  Islem Tutari ({currency})
                  <input
                    value={amountInput}
                    onChange={(event) => setAmountInput(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-on-surface-variant">
                    Adet
                    <input
                      value={quantityInput}
                      onChange={(event) => setQuantityInput(event.target.value)}
                      className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                    />
                  </label>
                  <label className="text-xs text-on-surface-variant">
                    Fiyat ({currency})
                    <input
                      value={priceInput}
                      onChange={(event) => setPriceInput(event.target.value)}
                      className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                    />
                  </label>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-on-surface-variant">
                  Aylik Hacim Profili ({currency})
                  <input
                    value={monthlyVolumeInput}
                    onChange={(event) => setMonthlyVolumeInput(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Gunluk Hacim ({currency})
                  <input
                    value={dailyVolumeInput}
                    onChange={(event) => setDailyVolumeInput(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                4) Ek Maliyet Parametreleri
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-on-surface-variant">
                  USD/TRY
                  <input
                    value={usdTryInput}
                    onChange={(event) => setUsdTryInput(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Swap Gun
                  <input
                    value={swapDaysInput}
                    onChange={(event) => setSwapDaysInput(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Spread Orani (ondalik)
                  <input
                    value={spreadRateInput}
                    onChange={(event) => setSpreadRateInput(event.target.value)}
                    placeholder="0,0008"
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Swap Gunluk Oran
                  <input
                    value={swapRateInput}
                    onChange={(event) => setSwapRateInput(event.target.value)}
                    placeholder="0,0002"
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Doviz Cevrim Orani
                  <input
                    value={fxRateInput}
                    onChange={(event) => setFxRateInput(event.target.value)}
                    placeholder="0,002"
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Stopaj Orani (%)
                  <input
                    value={withholdingRateInput}
                    onChange={(event) => setWithholdingRateInput(event.target.value)}
                    placeholder="10"
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
              </div>
              <label className="block text-xs text-on-surface-variant">
                Vergiye Tabi Kar Tahmini ({currency})
                <input
                  value={taxableProfitInput}
                  onChange={(event) => setTaxableProfitInput(event.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                />
              </label>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                5) Profil ve Gecmis
              </p>
              <label className="block text-xs text-on-surface-variant">
                Hesap Etiketi
                <input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={promotionsEnabled}
                  onChange={(event) => setPromotionsEnabled(event.target.checked)}
                />
                Kampanya/promosyon etkisini hesaba kat
              </label>
              <button
                onClick={saveHistory}
                className="w-full rounded-xl bg-secondary px-3 py-2 text-sm font-bold text-on-secondary hover:brightness-110"
              >
                Hesaplamayi Gecmise Kaydet
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                6) Kurum Karsilastirmasi ({quotes.length} kurum)
              </p>
              <p className="text-xs text-on-surface-variant">
                Manuel oran girisi ile kurumun size sundugu ozel tarife uygulanir.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-xs">
                <thead>
                  <tr className="text-left text-on-surface-variant">
                    <th className="px-2 py-2">Kurum</th>
                    <th className="px-2 py-2">Tur</th>
                    <th className="px-2 py-2">Kademe Orani</th>
                    <th className="px-2 py-2">Manuel Oran</th>
                    <th className="px-2 py-2">Toplam Maliyet</th>
                    <th className="px-2 py-2">Efektif %</th>
                    <th className="px-2 py-2">Round-trip Senaryo</th>
                    <th className="px-2 py-2">Secim</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr
                      key={quote.brokerId}
                      className={`border-t border-outline-variant/10 ${
                        selectedQuote?.brokerId === quote.brokerId ? "bg-secondary/5" : ""
                      }`}
                    >
                      <td className="px-2 py-2">
                        <button
                          onClick={() => setSelectedBrokerId(quote.brokerId)}
                          className="font-semibold text-on-surface hover:text-secondary"
                        >
                          {quote.brokerName}
                        </button>
                      </td>
                      <td className="px-2 py-2 text-on-surface-variant">
                        {filteredBrokers.find((item) => item.id === quote.brokerId)?.institutionType}
                      </td>
                      <td className="px-2 py-2">{formatPercent(quote.baseRate * 100, 3)}</td>
                      <td className="px-2 py-2">
                        <input
                          value={manualRateInputs[quote.brokerId] ?? ""}
                          onChange={(event) =>
                            setManualRateInputs((current) => ({
                              ...current,
                              [quote.brokerId]: parseManualRateInput(event.target.value),
                            }))
                          }
                          placeholder="0,0012"
                          className="w-24 rounded-lg bg-surface-container-high px-2 py-1 text-xs text-on-surface outline-none focus:ring-1 focus:ring-secondary/40"
                        />
                      </td>
                      <td className="px-2 py-2 font-semibold text-on-surface">
                        {formatMoney(quote.totalCostTry)}
                      </td>
                      <td className="px-2 py-2 text-secondary">
                        {formatPercent(quote.effectiveCostPct, 3)}
                      </td>
                      <td className="px-2 py-2 text-on-surface-variant">
                        {formatPercent(quote.breakEvenPct, 3)}
                      </td>
                      <td className="px-2 py-2">
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={comparisonBrokerIds.includes(quote.brokerId)}
                            onChange={() => toggleScenarioBroker(quote.brokerId)}
                          />
                          <span>Senaryo</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
            <div className="rounded-2xl bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                  7) Secilen Kurum Sonuc Detayi
                </p>
                <p className="text-xs text-on-surface-variant">{selectedQuote?.brokerName ?? "-"}</p>
              </div>

              {selectedQuote ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-surface-container-high p-3">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
                        Toplam Maliyet
                      </p>
                      <p className="mt-1 font-headline text-xl font-bold text-on-surface">
                        {formatMoney(selectedQuote.totalCostTry)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface-container-high p-3">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
                        Efektif Maliyet
                      </p>
                      <p className="mt-1 font-headline text-xl font-bold text-secondary">
                        {formatPercent(selectedQuote.effectiveCostPct, 3)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface-container-high p-3">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
                        Break-even
                      </p>
                      <p className="mt-1 font-headline text-xl font-bold text-on-surface">
                        {formatPercent(selectedQuote.breakEvenPct, 3)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <CostPie
                      breakdown={selectedQuote.breakdown}
                      total={selectedQuote.totalCostTry}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <CostRow label="Komisyon" value={selectedQuote.breakdown.commission} tip={FEE_INFO.commission} />
                      <CostRow label="BSMV" value={selectedQuote.breakdown.bsmv} tip={FEE_INFO.bsmv} />
                      <CostRow label="BIST Payi" value={selectedQuote.breakdown.bistPayi} tip={FEE_INFO.bistPayi} />
                      <CostRow label="Takasbank" value={selectedQuote.breakdown.takasbank} tip={FEE_INFO.takasbank} />
                      <CostRow label="Spread" value={selectedQuote.breakdown.spread} tip={FEE_INFO.spread} />
                      <CostRow label="Swap" value={selectedQuote.breakdown.swap} tip={FEE_INFO.swap} />
                      <CostRow label="Doviz Cevrim" value={selectedQuote.breakdown.fxConversion} tip={FEE_INFO.fxConversion} />
                      <CostRow label="Stopaj" value={selectedQuote.breakdown.stopaj} tip={FEE_INFO.stopaj} />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">Bu secimde kurum bulunamadi.</p>
              )}
            </div>

            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                8) En Ucuz 3 Kurum
              </p>
              <div className="space-y-2">
                {cheapestThree.map((quote, index) => (
                  <div key={quote.brokerId} className="rounded-xl bg-surface-container-high p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-on-surface">
                        {index + 1}. {quote.brokerName}
                      </p>
                      <p className="text-secondary">{formatMoney(quote.totalCostTry)}</p>
                    </div>
                    {worstQuote && (
                      <p className="mt-1 text-[11px] text-on-surface-variant">
                        En pahaliya gore fark: {formatMoney(worstQuote.totalCostTry - quote.totalCostTry)}
                      </p>
                    )}
                  </div>
                ))}
                {cheapestThree.length === 0 && (
                  <p className="text-sm text-on-surface-variant">Sonuc yok.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                9) Round-trip Kar/Zarar Simulasyonu
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-on-surface-variant">
                  Adet
                  <input
                    value={roundTripQuantityInput}
                    onChange={(event) => setRoundTripQuantityInput(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Alis Fiyati ({currency})
                  <input
                    value={roundTripEntryPriceInput}
                    onChange={(event) => setRoundTripEntryPriceInput(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Hedef Satis Fiyati ({currency})
                  <input
                    value={roundTripTargetPriceInput}
                    onChange={(event) => setRoundTripTargetPriceInput(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Elde Tutma Gunu
                  <input
                    value={roundTripHoldingDaysInput}
                    onChange={(event) => setRoundTripHoldingDaysInput(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
              </div>
              {simulation ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <ScenarioRow label="Brut Kar/Zarar" value={formatMoney(simulation.grossProfitTry)} />
                  <ScenarioRow label="Toplam Maliyet" value={formatMoney(simulation.totalCostsTry)} />
                  <ScenarioRow label="Net Sonuc" value={formatMoney(simulation.netProfitTry)} />
                  <ScenarioRow label="Net Getiri" value={formatPercent(simulation.netReturnPct, 3)} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-on-surface-variant">
                  Simulasyon icin adet ve fiyat alanlarini doldurun.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                10) Uzun Vadeli Etki ve "Tasarruf Etseydin"
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-on-surface-variant">
                  Aylik Islem Adedi
                  <input
                    value={monthlyTradeCountInput}
                    onChange={(event) => setMonthlyTradeCountInput(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Projeksiyon Suresi (yil)
                  <input
                    value={projectionYearsInput}
                    onChange={(event) => setProjectionYearsInput(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Alternatif Yillik Getiri (%)
                  <input
                    value={annualReturnInput}
                    onChange={(event) => setAnnualReturnInput(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  BTC Yillik Buyume Varsayimi (%)
                  <input
                    value={btcGrowthInput}
                    onChange={(event) => setBtcGrowthInput(event.target.value)}
                    className="mt-1 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                </label>
              </div>
              {projection ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <ScenarioRow label="Yillik Maliyet" value={formatMoney(projection.annualCost)} />
                  <ScenarioRow label="Toplam Nominal Maliyet" value={formatMoney(projection.totalNominalCost)} />
                  <ScenarioRow label="Bilesik Etki" value={formatMoney(projection.compoundFutureValue)} />
                  <ScenarioRow label="BTC'de Olsaydi" value={formatMoney(projection.btcFutureValue)} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-on-surface-variant">Hesaplama icin once kurum secin.</p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-surface p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
              11) Senaryo Karsilastirmasi (Maks 3 Kurum)
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {annualScenarioRows.map((row) => (
                <div key={row.quote.brokerId} className="rounded-xl bg-surface-container-high p-3">
                  <p className="font-semibold text-on-surface">{row.quote.brokerName}</p>
                  <p className="mt-1 text-sm text-secondary">{formatMoney(row.annualCost)}</p>
                  <p className="mt-1 text-[11px] text-on-surface-variant">
                    En iyiye fark: {formatMoney(row.annualCost - scenarioMin)}
                  </p>
                </div>
              ))}
              {annualScenarioRows.length === 0 && (
                <p className="text-sm text-on-surface-variant">
                  Karsilastirma icin tablodan en az bir kurum secin.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                12) Hesaplama Gecmisi
              </p>
              <div className="max-h-56 space-y-2 overflow-auto pr-1">
                {historyItems.map((item) => (
                  <div key={item.id} className="rounded-xl bg-surface-container-high p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-on-surface">{item.broker}</p>
                      <button
                        onClick={() => deleteHistoryItem(item.id)}
                        className="text-[11px] text-error"
                      >
                        Sil
                      </button>
                    </div>
                    <p className="mt-1 text-on-surface-variant">
                      {item.category} / {item.market}
                    </p>
                    <p className="mt-1 text-on-surface">
                      {formatMoney(item.totalCostTry)} ({formatPercent(item.effectiveCostPct, 3)})
                    </p>
                  </div>
                ))}
                {historyItems.length === 0 && (
                  <p className="text-sm text-on-surface-variant">Kayitli gecmis yok.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-surface p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                13) Geri Bildirim ve Oran Bildirimi
              </p>
              <label className="block text-xs text-on-surface-variant">
                Geri Bildirim
                <textarea
                  value={feedbackMessage}
                  onChange={(event) => setFeedbackMessage(event.target.value)}
                  className="mt-1 h-20 w-full rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                />
              </label>
              <button
                onClick={submitFeedback}
                className="mt-2 rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-on-secondary"
              >
                Feedback Gonder
              </button>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <input
                  value={communityInstitution}
                  onChange={(event) => setCommunityInstitution(event.target.value)}
                  placeholder="Kurum adi"
                  className="rounded-xl bg-surface-container-high px-3 py-2 text-xs text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                />
                <input
                  value={communityRateInput}
                  onChange={(event) => setCommunityRateInput(event.target.value)}
                  placeholder="Yeni oran (0,0012)"
                  className="rounded-xl bg-surface-container-high px-3 py-2 text-xs text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
                />
              </div>
              <textarea
                value={communityNote}
                onChange={(event) => setCommunityNote(event.target.value)}
                placeholder="Not"
                className="mt-2 h-16 w-full rounded-xl bg-surface-container-high px-3 py-2 text-xs text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
              />
              <button
                onClick={submitCommunityRateReport}
                className="mt-2 rounded-xl bg-surface-container-high px-3 py-2 text-xs font-bold text-on-surface"
              >
                "Bu kurumun orani degisti" bildir
              </button>
              <p className="mt-2 text-[11px] text-on-surface-variant">
                Toplam bildirim: {communityReports.length}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-surface p-4">
            <button
              onClick={() => setShowAdminPanel((current) => !current)}
              className="rounded-xl border border-outline-variant/20 px-3 py-2 text-xs font-bold text-on-surface"
            >
              {showAdminPanel ? "Admin Panelini Gizle" : "Admin Paneli (Tarife Yonetimi)"}
            </button>

            {showAdminPanel && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportBrokerJson}
                    className="rounded-xl bg-surface-container-high px-3 py-2 text-xs font-bold text-on-surface"
                  >
                    Broker JSON Disa Aktar
                  </button>
                  <label className="cursor-pointer rounded-xl bg-surface-container-high px-3 py-2 text-xs font-bold text-on-surface">
                    Broker JSON Ice Aktar
                    <input
                      type="file"
                      accept=".json"
                      onChange={importBrokerJson}
                      className="hidden"
                    />
                  </label>
                  <label className="cursor-pointer rounded-xl bg-surface-container-high px-3 py-2 text-xs font-bold text-on-surface">
                    BIST PDF Parse
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={parseBistPdf}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-xs">
                    <thead>
                      <tr className="text-left text-on-surface-variant">
                        <th className="px-2 py-2">Kurum</th>
                        <th className="px-2 py-2">Ilk Kademe Orani</th>
                        <th className="px-2 py-2">Min Komisyon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBrokers.map((broker) => (
                        <tr key={broker.id} className="border-t border-outline-variant/10">
                          <td className="px-2 py-2 text-on-surface">{broker.name}</td>
                          <td className="px-2 py-2">
                            <input
                              defaultValue={toInputValue(
                                broker.commissionModel.tiers[0]?.rate ?? 0,
                                5
                              )}
                              onBlur={(event) =>
                                updateFirstTierRate(broker.id, event.target.value)
                              }
                              className="w-28 rounded-lg bg-surface-container-high px-2 py-1 text-xs text-on-surface outline-none focus:ring-1 focus:ring-secondary/40"
                            />
                          </td>
                          <td className="px-2 py-2 text-on-surface-variant">
                            {formatMoney(broker.commissionModel.minCommission)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {adminStatus && (
                  <p className="text-xs text-on-surface-variant">{adminStatus}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="px-2 text-center text-[11px] leading-6 text-on-surface-variant/70">
          {dataset._meta?.disclaimer} Son guncelleme: {dataset._meta?.lastUpdated}. Kategori:
          {" "}
          {selectedCategory?.name}. Piyasa: {selectedMarket?.name}. Aktif kurum:{" "}
          {formatCompactNumber(filteredBrokers.length)}.
        </p>
      </div>
    </section>
  );
}

function CostRow({ label, value, tip }) {
  return (
    <div className="rounded-xl bg-surface-container-high p-3">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          {label}
          <InfoTip text={tip} />
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold text-on-surface">{formatMoney(value)}</p>
    </div>
  );
}

function ScenarioRow({ label, value }) {
  return (
    <div className="rounded-xl bg-surface-container-high p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">{label}</p>
      <p className="mt-1 text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}
