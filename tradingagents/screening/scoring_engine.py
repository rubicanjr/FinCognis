"""
Puanlama motoru — hesaplanabilir metriklerle tarama.

Kurallar:
- Fallback yok: metrik üretilemezse None
- Kritik veri yoksa hisse elenir
- Her hesaplama doğrulanmış veriyle yapılır
"""

from __future__ import annotations

from typing import Optional
import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)
np.random.seed(42)

WEIGHTS = {
    "short_term": {
        "momentum": 0.35,
        "volume": 0.25,
        "fundamental": 0.20,
        "macro": 0.20,
    },
    "medium_term": {
        "fundamental": 0.35,
        "momentum": 0.25,
        "macro": 0.25,
        "volume": 0.15,
    },
    "long_term": {
        "fundamental": 0.45,
        "macro": 0.30,
        "momentum": 0.15,
        "volume": 0.10,
    },
}


def percentile_rank(universe: list[float], value: float) -> Optional[float]:
    if not universe or value is None:
        return None
    arr = np.array([item for item in universe if item is not None and not np.isnan(item)])
    if len(arr) == 0:
        return None
    return float(np.sum(arr < value) / len(arr))


def _validated_returns(price_df: pd.DataFrame) -> pd.Series:
    closes = price_df["Close"].dropna()
    returns = closes.pct_change().dropna()
    if len(returns) < 2:
        raise ValueError("returns.length < 2")
    return returns


def calc_momentum_score(
    price_df: pd.DataFrame,
    universe_momentum: list[float],
) -> Optional[float]:
    if price_df is None or len(price_df) < 21:
        return None
    try:
        _validated_returns(price_df)
        closes = price_df["Close"].dropna()
        log_return = float(np.log(closes.iloc[-1] / closes.iloc[-21]))
        score = percentile_rank(universe_momentum, log_return)
        if score is None or np.isnan(score):
            return None
        return score
    except Exception as exc:
        logger.warning("[MOMENTUM CALC ERROR] %s", exc)
        return None


def calc_volume_score(
    price_df: pd.DataFrame,
    universe_volume: list[float],
) -> Optional[float]:
    if price_df is None or len(price_df) < 20:
        return None
    try:
        _validated_returns(price_df)
        volumes = price_df["Volume"].dropna()
        if len(volumes) < 20:
            return None
        recent_avg = float(volumes.iloc[-5:].mean())
        historical_avg = float(volumes.iloc[-20:].mean())
        if historical_avg == 0:
            return None
        ratio = recent_avg / historical_avg
        score = percentile_rank(universe_volume, ratio)
        if score is None or np.isnan(score):
            return None
        return score
    except Exception as exc:
        logger.warning("[VOLUME CALC ERROR] %s", exc)
        return None


def calc_fundamental_score(
    fundamentals: dict,
    universe_pe: list[float],
    universe_roe: list[float],
) -> Optional[float]:
    if not fundamentals:
        return None
    scores: list[float] = []

    pe = fundamentals.get("pe_ratio")
    if pe is not None and pe > 0 and universe_pe:
        pe_score = percentile_rank(universe_pe, pe)
        if pe_score is not None:
            scores.append(1 - pe_score)

    roe = fundamentals.get("roe")
    if roe is not None and universe_roe:
        roe_score = percentile_rank(universe_roe, roe)
        if roe_score is not None:
            scores.append(roe_score)

    margin = fundamentals.get("profit_margin")
    if margin is not None:
        margin_score = float(max(0.0, min(1.0, (margin + 0.5) / 1.0)))
        scores.append(margin_score)

    clean_scores = [score for score in scores if score is not None and not np.isnan(score)]
    if not clean_scores:
        logger.warning("[FUNDAMENTAL SCORE] No valid sub-metrics available")
        return None
    return float(np.mean(clean_scores))


def calc_macro_adjustment(macro_snapshot: dict) -> float:
    if not macro_snapshot or not macro_snapshot.get("data_available"):
        logger.info("[MACRO ADJ] No macro data — applying neutral adjustment (1.0)")
        return 1.0

    adjustment = 1.0
    tufe = macro_snapshot.get("tufe_latest")
    if tufe is not None:
        if tufe > 5.0:
            adjustment *= 0.92
        elif tufe > 3.0:
            adjustment *= 0.96
        elif tufe < 1.5:
            adjustment *= 1.05

    rate = macro_snapshot.get("policy_rate")
    if rate is not None:
        if rate > 40.0:
            adjustment *= 0.90
        elif rate > 25.0:
            adjustment *= 0.95

    return float(np.clip(adjustment, 0.7, 1.2))


def score_stock(
    ticker: str,
    price_df: pd.DataFrame,
    fundamentals: dict,
    macro_snapshot: dict,
    universe_data: dict,
    horizon: str = "medium_term",
) -> Optional[dict]:
    weights = WEIGHTS.get(horizon, WEIGHTS["medium_term"])
    components: dict[str, float] = {}

    momentum = calc_momentum_score(price_df, universe_data.get("momentum", []))
    if momentum is not None:
        components["momentum"] = momentum

    volume = calc_volume_score(price_df, universe_data.get("volume_ratio", []))
    if volume is not None:
        components["volume"] = volume

    fundamental = calc_fundamental_score(
        fundamentals,
        universe_data.get("pe_ratios", []),
        universe_data.get("roe_values", []),
    )
    if fundamental is not None:
        components["fundamental"] = fundamental

    # Zorunlu bileşenler yoksa hisse elenir.
    if "momentum" not in components or "volume" not in components or "fundamental" not in components:
        logger.warning("[SCORE SKIP] %s: Required components missing", ticker)
        return None

    weighted_sum = 0.0
    total_weight = 0.0
    for key, value in components.items():
        weight = weights.get(key, 0.0)
        weighted_sum += value * weight
        total_weight += weight
    if total_weight == 0:
        return None

    raw_score = weighted_sum / total_weight
    macro_adj = calc_macro_adjustment(macro_snapshot)
    final_score = raw_score * macro_adj
    if np.isnan(final_score):
        return None

    return {
        "ticker": ticker,
        "score": round(float(final_score), 4),
        "components": components,
        "macro_adjustment": macro_adj,
        "horizon": horizon,
        "data_completeness": len(components) / 4,
        "missing_components": [
            item for item in ["momentum", "volume", "fundamental", "macro"] if item not in components
        ],
        "source": price_df.attrs.get("source", "unknown") if price_df is not None else "unknown",
        "fetched_at": price_df.attrs.get("fetched_at") if price_df is not None else None,
    }
