"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  useAssetSearch,
  type AssetSearchOption,
  type AssetSelectionPayload,
} from "@/hooks/useAssetSearch";
import { verifyYahooTicker } from "@/services/yahoo-symbol-search";
import {
  isTickerFormat,
  normalizeTickerInput,
  resolveCatalogAssetByAliasOrTicker,
} from "@/utils/asset-validators";

const DEFAULT_MAX_SELECTION = 5;

export interface AssetSearchInputProps {
  selectedAssets: AssetSelectionPayload[];
  onSelectionChange: (assets: AssetSelectionPayload[]) => void;
  onChange?: (ticker: string) => void;
  onAssetSelect?: (asset: AssetSelectionPayload) => void;
  maxSelection?: number;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

function toPayload(option: AssetSearchOption): AssetSelectionPayload {
  return {
    ticker: option.ticker,
    yahooSymbol: option.yahooSymbol,
    assetClass: option.assetClass,
    exchange: option.exchange,
    currency: option.currency,
  };
}

function normalizeExchangeLabel(exchange: string): string {
  if (exchange.toUpperCase() === "COMMODITY") return "EMTIA";
  return exchange;
}

export default function AssetSearchInput({
  selectedAssets,
  onSelectionChange,
  onChange,
  onAssetSelect,
  maxSelection = DEFAULT_MAX_SELECTION,
  placeholder = "Varlık ara (örn: tuprs, altın, bitcoin, spy)",
  disabled = false,
  label = "Karşılaştırma Girdisi",
}: AssetSearchInputProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [message, setMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const blurTimerRef = useRef<number | null>(null);
  const listboxId = useId();

  const selectedTickers = useMemo(
    () => selectedAssets.map((asset) => asset.ticker.toUpperCase()),
    [selectedAssets]
  );

  const { results, isLoading } = useAssetSearch(query, selectedTickers);

  const clearBlurTimer = useCallback(() => {
    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }, []);

  const pushSelection = useCallback(
    (asset: AssetSelectionPayload): boolean => {
      if (selectedAssets.length >= maxSelection) {
        setMessage(`En fazla ${maxSelection} varlık karşılaştırabilirsiniz.`);
        return false;
      }

      if (selectedAssets.some((item) => item.ticker.toUpperCase() === asset.ticker.toUpperCase())) {
        setMessage(`${asset.ticker} zaten eklendi.`);
        return false;
      }

      const next = [...selectedAssets, asset];
      onSelectionChange(next);
      onChange?.(asset.ticker);
      onAssetSelect?.(asset);
      setMessage(null);
      setQuery("");
      setHighlightedIndex(-1);
      setIsOpen(false);
      return true;
    },
    [maxSelection, onAssetSelect, onChange, onSelectionChange, selectedAssets]
  );

  const addAssetFromOption = useCallback(
    (option: AssetSearchOption): boolean => {
      if (!option.isVerified) {
        setMessage("Doğrulanmamış varlık seçilemez.");
        return false;
      }
      return pushSelection(toPayload(option));
    },
    [pushSelection]
  );

  const rejectInput = useCallback((input: string) => {
    setQuery("");
    setMessage(`'${input}' tanınan bir yatırım varlığı değil. Listeden seçim yapınız.`);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const commitManualInput = useCallback(async (): Promise<boolean> => {
    const rawValue = query.trim();
    if (!rawValue) return true;

    const localAsset = resolveCatalogAssetByAliasOrTicker(rawValue);
    if (localAsset?.isVerified) {
      return pushSelection({
        ticker: localAsset.ticker,
        yahooSymbol: localAsset.yahooSymbol,
        assetClass: localAsset.assetClass,
        exchange: localAsset.exchange,
        currency: localAsset.currency,
      });
    }

    const normalizedTicker = normalizeTickerInput(rawValue);
    if (!isTickerFormat(normalizedTicker)) {
      rejectInput(rawValue);
      return false;
    }

    setVerifying(true);
    try {
      const verified = await verifyYahooTicker(normalizedTicker);
      if (!verified?.isVerified) {
        rejectInput(rawValue);
        return false;
      }

      return pushSelection({
        ticker: verified.ticker,
        yahooSymbol: verified.yahooSymbol,
        assetClass: verified.assetClass,
        exchange: verified.exchange,
        currency: verified.currency,
      });
    } finally {
      setVerifying(false);
    }
  }, [pushSelection, query, rejectInput]);

  const handleKeyDown = useCallback(
    async (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!isOpen) setIsOpen(true);
        setHighlightedIndex((prev) => {
          if (results.length === 0) return -1;
          return prev < results.length - 1 ? prev + 1 : 0;
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!isOpen) setIsOpen(true);
        setHighlightedIndex((prev) => {
          if (results.length === 0) return -1;
          return prev > 0 ? prev - 1 : results.length - 1;
        });
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const highlighted = highlightedIndex >= 0 ? results[highlightedIndex] : null;
        if (highlighted && isOpen) {
          addAssetFromOption(highlighted);
          return;
        }

        await commitManualInput();
      }
    },
    [addAssetFromOption, commitManualInput, highlightedIndex, isOpen, results]
  );

  const handleRemoveAsset = useCallback(
    (ticker: string) => {
      const next = selectedAssets.filter((asset) => asset.ticker !== ticker);
      onSelectionChange(next);
      setMessage(null);
    },
    [onSelectionChange, selectedAssets]
  );

  useEffect(() => {
    if (query.trim().length < 2 || results.length === 0) {
      setHighlightedIndex(-1);
      return;
    }
    setIsOpen(true);
    setHighlightedIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= results.length) return results.length - 1;
      return prev;
    });
  }, [query, results]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!containerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    return () => clearBlurTimer();
  }, [clearBlurTimer]);

  const handleBlur = useCallback(() => {
    clearBlurTimer();
    blurTimerRef.current = window.setTimeout(() => {
      const activeElement = document.activeElement;
      if (activeElement && containerRef.current?.contains(activeElement)) return;
      void commitManualInput();
      setIsOpen(false);
    }, 120);
  }, [clearBlurTimer, commitManualInput]);

  const shouldShowDropdown =
    isOpen && query.trim().length >= 2 && (results.length > 0 || isLoading || verifying);

  return (
    <div
      ref={containerRef}
      className="relative z-[120] isolate overflow-visible rounded-2xl border border-[#22b7ff]/20 bg-slate-900/45 p-2 backdrop-blur-xl shadow-[0_14px_36px_rgba(2,6,23,0.55)]"
    >
      <label htmlFor="asset-query" className="mb-2 block px-2 font-display text-[11px] font-semibold tracking-[0.06em] text-slate-300">
        {label}
      </label>

      {selectedAssets.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2 px-1">
          {selectedAssets.map((asset) => (
            <span key={`asset-chip:${asset.ticker}`} className="inline-flex items-center gap-2 rounded-full border border-[#22b7ff]/35 bg-[#22b7ff]/12 px-3 py-1 text-xs text-slate-100">
              <span className="font-display font-semibold tracking-wide">{asset.ticker}</span>
              <button
                type="button"
                onClick={() => handleRemoveAsset(asset.ticker)}
                className="rounded-full text-slate-300 transition-colors hover:text-slate-50"
                aria-label={`${asset.ticker} kaldır`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <div className="flex items-center gap-3 rounded-xl border border-white/12 bg-slate-950/65 px-3 py-3 backdrop-blur-xl transition-all duration-300 focus-within:border-[#22b7ff]/60 focus-within:shadow-[0_0_0_1px_rgba(34,183,255,0.38),0_0_28px_rgba(34,183,255,0.22)]">
          <Search className="h-5 w-5 text-slate-300" />
          <input
            id="asset-query"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setMessage(null);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400"
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={shouldShowDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-label="Karşılaştırma varlık girişi"
            disabled={disabled}
          />
          {isLoading || verifying ? <LoaderCircle className="h-4 w-4 animate-spin text-[#8ddfff]" /> : null}
        </div>

        {shouldShowDropdown ? (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-[140] mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-white/12 bg-slate-950/95 p-1 shadow-[0_20px_40px_rgba(2,6,23,0.65)] backdrop-blur-xl"
          >
            {results.map((result, index) => {
              const isActive = index === highlightedIndex;
              return (
                <button
                  key={`asset-option:${result.ticker}:${result.exchange}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => addAssetFromOption(result)}
                  className={`grid w-full grid-cols-[minmax(72px,88px)_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    isActive ? "bg-[#22b7ff]/18" : "hover:bg-slate-800/70"
                  }`}
                >
                  <span className="font-display text-sm font-semibold tracking-wide text-slate-100">{result.ticker}</span>
                  <span className="truncate text-sm text-slate-200">{result.name}</span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] tracking-[0.04em] text-slate-300">
                    {normalizeExchangeLabel(result.exchange)}
                  </span>
                </button>
              );
            })}

            {results.length === 0 && (isLoading || verifying) ? (
              <div className="px-3 py-2 text-xs text-slate-300">Aranıyor...</div>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="mt-2 px-1 text-xs text-slate-300">Karar vermeden önce farklarını gör.</p>
      {message ? <p className="mt-2 rounded-lg border border-warning/35 bg-warning-container/20 px-2 py-1 text-xs text-warning">{message}</p> : null}
    </div>
  );
}
