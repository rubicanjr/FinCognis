"""
BIST özel temel analiz yardımcıları.
"""

from __future__ import annotations

from typing import Optional
import logging

from tradingagents.dataflows.bist_data import get_bist_fundamentals

logger = logging.getLogger(__name__)


def analyze_bist_fundamentals(ticker: str) -> Optional[dict]:
    """
    BIST hissesi için doğrulanmış temel veri setini getirir.
    Veri eksikse None döner.
    """
    data = get_bist_fundamentals(ticker)
    if data is None:
        logger.warning("[BIST FUND ANALYST] No fundamentals for %s", ticker)
        return None
    return {
        "ticker": ticker.upper().strip(),
        "symbol": data.get("symbol"),
        "source": data.get("source"),
        "fetched_at": data.get("fetched_at"),
        "snapshot": data,
    }
