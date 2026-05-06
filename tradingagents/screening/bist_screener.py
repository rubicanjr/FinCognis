"""
BIST tarama motoru.
BIST30 veya BIST100 evreninden en iyi hisseleri seçer.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
import logging

import numpy as np

from tradingagents.dataflows.bist_data import (
    BIST30_TICKERS,
    BIST100_TICKERS,
    get_bist_batch,
    get_bist_fundamentals,
)
from tradingagents.dataflows.tcmb_evds import get_turkey_macro_snapshot
from tradingagents.screening.scoring_engine import score_stock

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "Bu analiz eğitim amaçlıdır. Yatırım tavsiyesi değildir. "
    "SPK lisanslı bir danışmana başvurunuz."
)


def _build_universe_distributions(price_data: dict, fundamentals_by_ticker: dict) -> dict:
    momentum: list[float] = []
    volume_ratio: list[float] = []
    pe_ratios: list[float] = []
    roe_values: list[float] = []

    for _, df in price_data.items():
        if df is None or len(df) < 21:
            continue
        closes = df["Close"].dropna()
        volumes = df["Volume"].dropna()
        if len(closes) >= 21:
            momentum.append(float(np.log(closes.iloc[-1] / closes.iloc[-21])))
        if len(volumes) >= 20:
            base = float(volumes.iloc[-20:].mean())
            if base > 0:
                volume_ratio.append(float(volumes.iloc[-5:].mean()) / base)

    for _, item in fundamentals_by_ticker.items():
        if not item:
            continue
        pe = item.get("pe_ratio")
        roe = item.get("roe")
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


def run_bist_screen(
    universe: str = "bist30",
    horizon: str = "medium_term",
    top_n: int = 5,
) -> dict:
    logger.info(
        "[SCREENER] Starting BIST screen: universe=%s horizon=%s top_n=%s",
        universe,
        horizon,
        top_n,
    )

    tickers = BIST30_TICKERS if universe == "bist30" else BIST100_TICKERS
    macro = get_turkey_macro_snapshot()
    price_data = get_bist_batch(tickers, period="1y")
    fundamentals_by_ticker = {ticker: get_bist_fundamentals(ticker) for ticker in tickers}
    universe_data = _build_universe_distributions(price_data, fundamentals_by_ticker)

    scores = []
    failed_tickers: list[str] = []
    for ticker in tickers:
        df = price_data.get(ticker)
        fundamentals = fundamentals_by_ticker.get(ticker) or {}
        result = score_stock(
            ticker=ticker,
            price_df=df,
            fundamentals=fundamentals,
            macro_snapshot=macro,
            universe_data=universe_data,
            horizon=horizon,
        ) if df is not None else None
        if result is None:
            failed_tickers.append(ticker)
            continue
        scores.append(result)

    scores.sort(key=lambda item: item["score"], reverse=True)
    finalists = scores[:top_n]
    logger.info(
        "[SCREENER] Complete: scored=%s failed=%s finalists=%s",
        len(scores),
        len(failed_tickers),
        len(finalists),
    )

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "universe": universe,
        "horizon": horizon,
        "total_screened": len(tickers),
        "successful_fetches": len(tickers) - len(failed_tickers),
        "finalists": finalists,
        "failed_tickers": failed_tickers,
        "macro_context": macro,
        "disclaimer": DISCLAIMER,
    }
