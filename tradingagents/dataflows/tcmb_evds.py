"""
TCMB EVDS REST API entegrasyonu.
Türkiye makro verileri: faiz, enflasyon, kur.

API Key: TCMB EVDS sitesinden ücretsiz alınabilir.
Ortam değişkeni: TCMB_EVDS_API_KEY
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional
import logging
import os

import pandas as pd
import requests

logger = logging.getLogger(__name__)

EVDS_BASE_URL = "https://evds2.tcmb.gov.tr/service/evds"

# Seri kodları — güncel evrende değişebilir; EVDS panelinde doğrulanmalıdır.
EVDS_SERIES = {
    "tufe_monthly": "TP.FG.J0",
    "ufe_monthly": "TP.FG.J01",
    "policy_rate": "TP.MB.S.AOFON",
    "usdtry_daily": "TP.DK.USD.A",
    "eurtry_daily": "TP.DK.EUR.A",
    "repo_rate": "TP.OM.O003",
}


def get_evds_api_key() -> Optional[str]:
    key = os.environ.get("TCMB_EVDS_API_KEY")
    if not key:
        logger.warning(
            "[EVDS] TCMB_EVDS_API_KEY not set. Macro data unavailable. "
            "Get free key at: https://evds2.tcmb.gov.tr"
        )
    return key


def fetch_evds_series(
    series_code: str,
    start_date: str,
    end_date: str,
    frequency: str = "5",
) -> Optional[pd.DataFrame]:
    """
    TCMB EVDS'den belirtilen seriyi çeker.
    API key yoksa veya istek başarısızsa None döner.
    """
    api_key = get_evds_api_key()
    if not api_key:
        return None

    params = {
        "series": series_code,
        "startDate": start_date,
        "endDate": end_date,
        "type": "json",
        "key": api_key,
        "frequency": frequency,
    }

    try:
        response = requests.get(EVDS_BASE_URL, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        if "items" not in data or not data["items"]:
            logger.warning("[EVDS] No items returned for series: %s", series_code)
            return None

        df = pd.DataFrame(data["items"])
        df.attrs["series_code"] = series_code
        df.attrs["source"] = "TCMB_EVDS"
        df.attrs["fetched_at"] = datetime.utcnow().isoformat()
        return df
    except requests.exceptions.Timeout:
        logger.error("[EVDS TIMEOUT] Series: %s", series_code)
        return None
    except requests.exceptions.RequestException as exc:
        logger.error("[EVDS REQUEST ERROR] %s: %s", series_code, exc)
        return None
    except Exception as exc:
        logger.error("[EVDS PARSE ERROR] %s: %s", series_code, exc)
        return None


def _parse_latest_float(df: Optional[pd.DataFrame], series_code: str) -> Optional[float]:
    if df is None or df.empty:
        return None
    last_row = df.iloc[-1]
    value = last_row.get(series_code)
    if value in (None, ""):
        return None
    try:
        return float(str(value).replace(",", "."))
    except (ValueError, TypeError):
        logger.warning("[EVDS] Parse error for series %s value %s", series_code, value)
        return None


def get_turkey_macro_snapshot() -> dict:
    """
    Güncel Türkiye makro verilerini çeker.
    Eksik veriler None olarak işaretlenir.
    """
    today = datetime.utcnow()
    start = (today - timedelta(days=90)).strftime("%d-%m-%Y")
    end = today.strftime("%d-%m-%Y")

    snapshot = {
        "fetched_at": today.isoformat(),
        "source": "TCMB_EVDS",
        "tufe_latest": None,
        "policy_rate": None,
        "usdtry": None,
        "eurtry": None,
        "data_available": False,
    }

    tufe_df = fetch_evds_series(EVDS_SERIES["tufe_monthly"], start, end, frequency="5")
    rate_df = fetch_evds_series(EVDS_SERIES["policy_rate"], start, end, frequency="5")
    usd_df = fetch_evds_series(EVDS_SERIES["usdtry_daily"], start, end, frequency="1")
    eur_df = fetch_evds_series(EVDS_SERIES["eurtry_daily"], start, end, frequency="1")

    snapshot["tufe_latest"] = _parse_latest_float(tufe_df, EVDS_SERIES["tufe_monthly"])
    snapshot["policy_rate"] = _parse_latest_float(rate_df, EVDS_SERIES["policy_rate"])
    snapshot["usdtry"] = _parse_latest_float(usd_df, EVDS_SERIES["usdtry_daily"])
    snapshot["eurtry"] = _parse_latest_float(eur_df, EVDS_SERIES["eurtry_daily"])

    filled_values = [
        value
        for key, value in snapshot.items()
        if key not in ("fetched_at", "source", "data_available") and value is not None
    ]
    snapshot["data_available"] = len(filled_values) > 0
    if not snapshot["data_available"]:
        logger.warning(
            "[MACRO] No macro data available. Analysis will proceed without macro context. "
            "Set TCMB_EVDS_API_KEY for full analysis."
        )

    return snapshot
