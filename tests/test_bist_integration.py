import pytest

from tradingagents.dataflows.bist_data import (
    get_bist_fundamentals,
    get_bist_price_history,
    to_yahoo_symbol,
)
from tradingagents.screening.scoring_engine import percentile_rank, score_stock


class TestSymbolConversion:
    def test_basic_conversion(self):
        assert to_yahoo_symbol("TUPRS") == "TUPRS.IS"

    def test_already_converted(self):
        assert to_yahoo_symbol("TUPRS.IS") == "TUPRS.IS"

    def test_lowercase(self):
        assert to_yahoo_symbol("tuprs") == "TUPRS.IS"

    def test_whitespace(self):
        assert to_yahoo_symbol(" TUPRS ") == "TUPRS.IS"


class TestPriceDataValidation:
    @pytest.mark.integration
    def test_valid_bist_ticker(self):
        df = get_bist_price_history("TUPRS", period="1mo")
        assert df is not None
        assert len(df) > 5
        assert "Close" in df.columns

    @pytest.mark.integration
    def test_invalid_ticker_returns_none(self):
        df = get_bist_price_history("XXXXINVALID", period="1mo")
        assert df is None

    @pytest.mark.integration
    def test_gyo_returns_none(self):
        df = get_bist_price_history("GYO", period="1mo")
        assert df is None

    @pytest.mark.integration
    def test_fundamentals_tuprs(self):
        fundamentals = get_bist_fundamentals("TUPRS")
        if fundamentals is not None:
            assert fundamentals["symbol"] == "TUPRS.IS"
            assert fundamentals["source"] == "yfinance"


class TestScoringEngine:
    def test_none_input_returns_none(self):
        result = score_stock(
            ticker="TEST",
            price_df=None,
            fundamentals={},
            macro_snapshot={},
            universe_data={},
        )
        assert result is None

    def test_percentile_rank_empty_universe(self):
        result = percentile_rank([], 5.0)
        assert result is None
