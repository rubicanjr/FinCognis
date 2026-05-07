"""
BIST analiz metrik yardımcıları.

Sıfır tolerans yaklaşımı:
- Veri yetersizse None döner.
- Fallback veya tahmini skor üretmez.
"""

from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd


def _is_valid_price_series(prices: Optional[pd.Series], min_len: int = 20) -> bool:
    if prices is None:
        return False
    if not isinstance(prices, pd.Series):
        return False
    clean = prices.dropna()
    if len(clean) < min_len:
        return False
    return bool(np.isfinite(clean.to_numpy(dtype=float)).all())


def calc_max_drawdown(prices: Optional[pd.Series]) -> Optional[float]:
    """
    Maksimum drawdown (tepe-dip düşüş oranı).
    """
    if not _is_valid_price_series(prices):
        return None

    clean = prices.dropna().astype(float)
    running_max = clean.cummax()
    drawdowns = (running_max - clean) / running_max
    max_dd = float(drawdowns.max())
    if not np.isfinite(max_dd):
        return None
    return max_dd


def calc_sharpe(prices: Optional[pd.Series], risk_free_daily: float = 0.0) -> Optional[float]:
    """
    Basit günlük Sharpe hesabı.
    """
    if not _is_valid_price_series(prices):
        return None

    clean = prices.dropna().astype(float)
    returns = clean.pct_change().dropna()
    if len(returns) < 20:
        return None

    excess = returns - risk_free_daily
    volatility = float(excess.std(ddof=0))
    if not np.isfinite(volatility) or volatility <= 0:
        return None

    sharpe = float((excess.mean() / volatility) * np.sqrt(252))
    if not np.isfinite(sharpe):
        return None
    return sharpe

