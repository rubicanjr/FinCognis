"""
BIST veri çekimi — yfinance üzerinden.
Tüm semboller otomatik olarak .IS formatına çevrilir.
Veri doğrulama her fonksiyonda zorunludur.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
import logging

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

# BIST 30 bileşenleri — doğrulanmış liste
BIST30_TICKERS = [
    "AKBNK", "AKSEN", "ARCLK", "ASELS", "BIMAS",
    "DOHOL", "EKGYO", "EREGL", "FROTO", "GARAN",
    "HALKB", "ISCTR", "KCHOL", "KOZAL", "KRDMD",
    "LOGO", "MGROS", "ODAS", "PETKM", "PGSUS",
    "SAHOL", "SASA", "SISE", "TAVHL", "TCELL",
    "THYAO", "TKFEN", "TOASO", "TTKOM", "TUPRS",
]

# BIST 100 genişletilmiş liste — screener için (BIST30 + likit ek set)
BIST100_TICKERS = sorted(
    set(
        BIST30_TICKERS
        + [
            "AEFES", "AGHOL", "AKFGY", "AKSA", "AKSEN", "ALARK", "ALFAS",
            "ANSGR", "ASTOR", "AYGAZ", "BRSAN", "BUCIM", "CANTE", "CCOLA",
            "CIMSA", "DOAS", "ECILC", "ENJSA", "ENKAI", "GESAN", "GWIND",
            "HEKTS", "INDES", "ISDMR", "KARSN", "KAYSE", "KLSER", "KONTR",
            "MAVI", "MPARK", "OTKAR", "OYAKC", "QUAGR", "SELEC", "SKBNK",
            "SMRTG", "SOKM", "TABGD", "TSKB", "ULKER", "VAKBN", "VESBE",
            "VESTL", "YEOTK", "YKBNK", "ZOREN", "ALBRK", "ANHYT", "ARASE",
            "BIOEN", "CIMSA", "DOCO", "EUPWR", "GUBRF", "KCAER", "KERVT",
            "KLNMA", "KONYA", "ODINE", "PASEU", "REEDR", "SDTTR", "TATEN",
            "TEZOL", "THYAO", "TMSN", "TRGYO", "TTRAK", "TURSG", "VAKKO",
        ]
    )
)


def to_yahoo_symbol(ticker: str) -> str:
    """
    BIST ticker'ını Yahoo Finance formatına çevirir.
    TUPRS → TUPRS.IS
    Zaten .IS içeriyorsa dokunma.
    """
    normalized = ticker.upper().strip()
    if normalized.endswith(".IS"):
        return normalized
    return f"{normalized}.IS"


def validate_price_data(df: pd.DataFrame, symbol: str) -> bool:
    """
    Fiyat verisini doğrula. Yetersiz veri varsa False döndür.
    Hiçbir zaman fallback değer üretme.
    """
    if df is None or df.empty:
        logger.warning("[VALIDATION FAIL] %s: Empty dataframe", symbol)
        return False
    if len(df) < 5:
        logger.warning(
            "[VALIDATION FAIL] %s: Insufficient data points: %s",
            symbol,
            len(df),
        )
        return False
    if "Close" not in df.columns or df["Close"].isna().all():
        logger.warning("[VALIDATION FAIL] %s: All Close values NaN", symbol)
        return False
    return True


def get_bist_price_history(
    ticker: str,
    period: str = "1y",
    interval: str = "1d",
) -> Optional[pd.DataFrame]:
    """
    BIST hissesi için fiyat geçmişi çeker.
    """
    yahoo_symbol = to_yahoo_symbol(ticker)
    try:
        ticker_obj = yf.Ticker(yahoo_symbol)
        df = ticker_obj.history(period=period, interval=interval)
        if not validate_price_data(df, yahoo_symbol):
            return None

        df.attrs["source"] = "yfinance"
        df.attrs["symbol"] = yahoo_symbol
        df.attrs["fetched_at"] = datetime.utcnow().isoformat()
        logger.info(
            "[DATA OK] %s: %s rows, %s to %s",
            yahoo_symbol,
            len(df),
            df.index[0].date(),
            df.index[-1].date(),
        )
        return df
    except Exception as exc:
        logger.error("[FETCH ERROR] %s: %s", yahoo_symbol, exc)
        return None


def get_bist_fundamentals(ticker: str) -> Optional[dict]:
    """
    Temel finansal verileri çeker ve doğrular.
    Eksik alan varsa None döndürür, tahmin üretmez.
    """
    yahoo_symbol = to_yahoo_symbol(ticker)
    try:
        ticker_obj = yf.Ticker(yahoo_symbol)
        info = ticker_obj.info
        if not info or info.get("regularMarketPrice") is None:
            logger.warning(
                "[FUNDAMENTALS FAIL] %s: No market data returned",
                yahoo_symbol,
            )
            return None

        result = {
            "symbol": yahoo_symbol,
            "source": "yfinance",
            "fetched_at": datetime.utcnow().isoformat(),
            "current_price": info.get("regularMarketPrice"),
            "currency": info.get("currency"),
            "pe_ratio": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "pb_ratio": info.get("priceToBook"),
            "ev_ebitda": info.get("enterpriseToEbitda"),
            "roe": info.get("returnOnEquity"),
            "roa": info.get("returnOnAssets"),
            "profit_margin": info.get("profitMargins"),
            "operating_margin": info.get("operatingMargins"),
            "revenue_growth": info.get("revenueGrowth"),
            "earnings_growth": info.get("earningsGrowth"),
            "debt_to_equity": info.get("debtToEquity"),
            "current_ratio": info.get("currentRatio"),
            "free_cashflow": info.get("freeCashflow"),
            "operating_cashflow": info.get("operatingCashflow"),
            "market_cap": info.get("marketCap"),
            "volume": info.get("regularMarketVolume"),
            "avg_volume": info.get("averageVolume"),
            "dividend_yield": info.get("dividendYield"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
        }

        critical_fields = ["current_price", "currency"]
        missing = [field for field in critical_fields if result[field] is None]
        if missing:
            logger.warning(
                "[FUNDAMENTALS INCOMPLETE] %s: Missing critical fields: %s",
                yahoo_symbol,
                missing,
            )
            return None
        return result
    except Exception as exc:
        logger.error("[FUNDAMENTALS ERROR] %s: %s", yahoo_symbol, exc)
        return None


def get_bist_batch(
    tickers: list[str],
    period: str = "1y",
) -> dict[str, Optional[pd.DataFrame]]:
    """
    Birden fazla BIST hissesi için veri çeker.
    Başarısız olanlar None olarak döner, exception fırlatmaz.
    """
    results: dict[str, Optional[pd.DataFrame]] = {}
    for ticker in tickers:
        results[ticker] = get_bist_price_history(ticker, period=period)

    success = sum(1 for value in results.values() if value is not None)
    logger.info("[BATCH] %s/%s symbols fetched successfully", success, len(tickers))
    return results
