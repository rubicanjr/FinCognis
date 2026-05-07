"""
Temel doğrulama testleri.
Çalıştır: python -m pytest agents/test_bist.py -v
"""

import pandas as pd

from agents.bist_data_provider import to_yahoo, validate_not_fake_ticker
from agents.bist_scoring import calc_max_drawdown, calc_sharpe


class TestSymbolConversion:
    def test_basic(self):
        assert to_yahoo("TUPRS") == "TUPRS.IS"

    def test_already_converted(self):
        assert to_yahoo("TUPRS.IS") == "TUPRS.IS"

    def test_lowercase(self):
        assert to_yahoo("tuprs") == "TUPRS.IS"

    def test_whitespace(self):
        assert to_yahoo(" TUPRS ") == "TUPRS.IS"


class TestFakeTickerRejection:
    def test_gyo_rejected(self):
        # "GYO" gerçek ticker değil
        assert validate_not_fake_ticker("GYO") is False

    def test_gayrimenkul_rejected(self):
        assert validate_not_fake_ticker("GAYRIMENKUL") is False

    def test_random_string_rejected(self):
        assert validate_not_fake_ticker("XYZINVALID99") is False


class TestScoring:
    def test_empty_returns_none(self):
        assert calc_max_drawdown(None) is None
        assert calc_sharpe(None) is None

    def test_short_series_returns_none(self):
        s = pd.Series([100, 101, 99])
        assert calc_max_drawdown(s) is None
        assert calc_sharpe(s) is None

    def test_drawdown_known_value(self):
        # 100 -> 50 -> %50 drawdown
        prices = pd.Series([100.0] * 10 + [50.0] * 10)
        dd = calc_max_drawdown(prices)
        assert dd is not None
        assert abs(dd - 0.5) < 0.01

    def test_sharpe_flat_series(self):
        # Sıfır volatilite -> None (sıfır bölme koruması)
        prices = pd.Series([100.0] * 100)
        result = calc_sharpe(prices)
        assert result is None

