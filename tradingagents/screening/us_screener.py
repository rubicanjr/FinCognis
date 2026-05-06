"""
ABD hisse tarama motoru.
"""

from __future__ import annotations

from datetime import datetime
import logging

import numpy as np
import yfinance as yf

from tradingagents.screening.scoring_engine import score_stock

logger = logging.getLogger(__name__)

US_LARGE_CAP_TICKERS = [
    "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "GOOG", "TSLA",
    "BRK-B", "JPM", "V", "XOM", "UNH", "LLY", "MA", "COST", "PG", "AVGO",
    "HD", "JNJ", "BAC", "ABBV", "KO", "PEP", "WMT", "CVX", "MRK", "ADBE",
    "NFLX", "AMD", "TMO", "CRM", "MCD", "ACN", "CSCO", "ABT", "DHR",
]

DISCLAIMER = (
    "Bu analiz eğitim amaçlıdır. Yatırım tavsiyesi değildir. "
    "SPK lisanslı bir danışmana başvurunuz."
)


def _get_us_price_history(ticker: str, period: str = "1y"):
    try:
        df = yf.Ticker(ticker).history(period=period, interval="1d")
        if df is None or df.empty or len(df) < 21:
            return None
        if "Close" not in df.columns or df["Close"].dropna().shape[0] < 21:
            return None
        df.attrs["source"] = "yfinance"
        df.attrs["symbol"] = ticker
        df.attrs["fetched_at"] = datetime.utcnow().isoformat()
        return df
    except Exception as exc:
        logger.warning("[US FETCH FAIL] %s: %s", ticker, exc)
        return None


def _get_us_fundamentals(ticker: str):
    try:
        info = yf.Ticker(ticker).info
        if not info or info.get("regularMarketPrice") is None:
            return None
        return {
            "symbol": ticker,
            "source": "yfinance",
            "fetched_at": datetime.utcnow().isoformat(),
            "current_price": info.get("regularMarketPrice"),
            "currency": info.get("currency"),
            "pe_ratio": info.get("trailingPE"),
            "roe": info.get("returnOnEquity"),
            "profit_margin": info.get("profitMargins"),
        }
    except Exception as exc:
        logger.warning("[US FUND FAIL] %s: %s", ticker, exc)
        return None


def _build_universe(price_map: dict, fundamentals_map: dict) -> dict:
    momentum = []
    volume_ratio = []
    pe_ratios = []
    roe_values = []

    for df in price_map.values():
        if df is None:
            continue
        closes = df["Close"].dropna()
        volumes = df["Volume"].dropna()
        if len(closes) >= 21:
            momentum.append(float(np.log(closes.iloc[-1] / closes.iloc[-21])))
        if len(volumes) >= 20:
            base = float(volumes.iloc[-20:].mean())
            if base > 0:
                volume_ratio.append(float(volumes.iloc[-5:].mean()) / base)

    for fundamentals in fundamentals_map.values():
        if not fundamentals:
            continue
        pe = fundamentals.get("pe_ratio")
        roe = fundamentals.get("roe")
        if pe is not None and pe > 0:
            pe_ratios.append(float(pe))
        if roe is not None:
            roe_values.append(float(roe))

    return {
        "momentum": momentum,
        "volume_ratio": volume_ratio,
        "pe_ratios": pe_ratios,
        "roe_values": roe_values,
    }


def run_us_screen(
    universe: str = "us_large_cap",
    horizon: str = "medium_term",
    top_n: int = 5,
) -> dict:
    tickers = US_LARGE_CAP_TICKERS
    price_map = {ticker: _get_us_price_history(ticker, period="1y") for ticker in tickers}
    fundamentals_map = {ticker: _get_us_fundamentals(ticker) for ticker in tickers}
    universe_data = _build_universe(price_map, fundamentals_map)
    macro_context = {"data_available": False, "source": "none", "fetched_at": datetime.utcnow().isoformat()}

    scores = []
    failed_tickers = []
    for ticker in tickers:
        price_df = price_map.get(ticker)
        if price_df is None:
            failed_tickers.append(ticker)
            continue
        scored = score_stock(
            ticker=ticker,
            price_df=price_df,
            fundamentals=fundamentals_map.get(ticker) or {},
            macro_snapshot=macro_context,
            universe_data=universe_data,
            horizon=horizon,
        )
        if scored is None:
            failed_tickers.append(ticker)
            continue
        scores.append(scored)

    scores.sort(key=lambda item: item["score"], reverse=True)
    finalists = scores[:top_n]
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "universe": universe,
        "horizon": horizon,
        "total_screened": len(tickers),
        "successful_fetches": len(tickers) - len(failed_tickers),
        "finalists": finalists,
        "failed_tickers": failed_tickers,
        "macro_context": macro_context,
        "disclaimer": DISCLAIMER,
    }
