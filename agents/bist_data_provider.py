"""
BIST yardımcı veri fonksiyonları.

Notlar:
- Sahte/yanlış ticker'ları erken aşamada elemek için temel doğrulama içerir.
- Yahoo formatına çevrim: TUPRS -> TUPRS.IS
"""

from __future__ import annotations

from typing import Final

# Temel doğrulama listesi (ilk etapta yaygın semboller).
# Gerektikçe merkezi katalogdan genişletilebilir.
KNOWN_BIST_TICKERS: Final[set[str]] = {
    "AKBNK",
    "ASELS",
    "BIMAS",
    "EREGL",
    "FROTO",
    "GARAN",
    "ISCTR",
    "KCHOL",
    "KOZAL",
    "PETKM",
    "PGSUS",
    "SAHOL",
    "SISE",
    "TCELL",
    "THYAO",
    "TKFEN",
    "TOASO",
    "TTKOM",
    "TUPRS",
}


def to_yahoo(ticker: str) -> str:
    """
    BIST sembolünü Yahoo Finance biçimine dönüştürür.
    """
    normalized = ticker.upper().strip()
    if normalized.endswith(".IS"):
        return normalized
    return f"{normalized}.IS"


def _normalize_bist_symbol(value: str) -> str:
    normalized = value.upper().strip()
    return normalized[:-3] if normalized.endswith(".IS") else normalized


def validate_not_fake_ticker(ticker: str) -> bool:
    """
    Ticker'ın doğrulanmış BIST listesindeki bir sembol olup olmadığını döndürür.
    """
    if not ticker or not isinstance(ticker, str):
        return False

    candidate = _normalize_bist_symbol(ticker)
    if not candidate.isalnum() or len(candidate) < 3 or len(candidate) > 6:
        return False

    return candidate in KNOWN_BIST_TICKERS

