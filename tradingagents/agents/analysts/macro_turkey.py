"""
Türkiye makro analiz yardımcıları.
"""

from __future__ import annotations

from typing import Optional
import logging

from tradingagents.dataflows.tcmb_evds import get_turkey_macro_snapshot

logger = logging.getLogger(__name__)


def analyze_turkey_macro() -> dict:
    """
    TCMB EVDS makro snapshot döndürür.
    """
    snapshot = get_turkey_macro_snapshot()
    if not snapshot.get("data_available"):
        logger.info("[MACRO TURKEY] Macro snapshot is unavailable or partial")
    return snapshot
