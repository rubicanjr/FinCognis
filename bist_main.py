"""
BIST tek hisse analizi giriş noktası.

Kullanım:
  python bist_main.py --ticker TUPRS --date 2026-05-01
"""

from __future__ import annotations

import argparse
from datetime import datetime
import logging

from dotenv import load_dotenv

from tradingagents.default_config import DEFAULT_CONFIG
from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.dataflows.bist_data import get_bist_fundamentals, to_yahoo_symbol
from tradingagents.dataflows.tcmb_evds import get_turkey_macro_snapshot

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

DISCLAIMER = (
    "Bu analiz eğitim amaçlıdır. Yatırım tavsiyesi değildir. "
    "SPK lisanslı bir danışmana başvurunuz."
)


def _format_macro_context(macro: dict) -> str:
    if not macro.get("data_available"):
        return "Macro data: Data not available (TCMB_EVDS_API_KEY not set)"
    lines = ["=== TURKEY MACRO CONTEXT ==="]
    if macro.get("tufe_latest") is not None:
        lines.append(f"TUFE (monthly): {macro['tufe_latest']:.2f}%")
    if macro.get("policy_rate") is not None:
        lines.append(f"Policy Rate: {macro['policy_rate']:.2f}%")
    if macro.get("usdtry") is not None:
        lines.append(f"USD/TRY: {macro['usdtry']:.4f}")
    if macro.get("eurtry") is not None:
        lines.append(f"EUR/TRY: {macro['eurtry']:.4f}")
    lines.append("===========================")
    return "\n".join(lines)


def run_bist_analysis(
    ticker: str,
    analysis_date: str,
    config_overrides: dict | None = None,
) -> dict:
    yahoo_symbol = to_yahoo_symbol(ticker)
    logger.info("[BIST] Analyzing %s (%s) for %s", ticker, yahoo_symbol, analysis_date)

    config = DEFAULT_CONFIG.copy()
    config["llm_provider"] = "anthropic"
    config["deep_think_llm"] = "claude-sonnet-4-6"
    config["quick_think_llm"] = "claude-sonnet-4-6"
    config["max_debate_rounds"] = 2
    config["data_vendors"] = {
        "core_stock_apis": "yfinance",
        "technical_indicators": "yfinance",
        "fundamental_data": "yfinance",
        "news_data": "yfinance",
    }
    if config_overrides:
        config.update(config_overrides)

    macro = get_turkey_macro_snapshot()
    macro_context = _format_macro_context(macro)
    fundamentals = get_bist_fundamentals(ticker)
    if fundamentals is None:
        logger.warning("[BIST] %s fundamentals unavailable. Proceeding with limited data.", ticker)

    ta = TradingAgentsGraph(debug=True, config=config)
    try:
        _, decision = ta.propagate(yahoo_symbol, analysis_date, extra_context=macro_context)
    except Exception as exc:
        logger.error("[BIST] Pipeline error for %s: %s", ticker, exc)
        return {
            "ticker": ticker,
            "yahoo_symbol": yahoo_symbol,
            "error": str(exc),
            "decision": None,
            "macro_context": macro,
            "fundamentals_available": False,
            "disclaimer": DISCLAIMER,
        }

    return {
        "ticker": ticker,
        "yahoo_symbol": yahoo_symbol,
        "analysis_date": analysis_date,
        "decision": decision,
        "macro_context": macro,
        "fundamentals_available": fundamentals is not None,
        "disclaimer": DISCLAIMER,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BIST Single Stock Analysis")
    parser.add_argument("--ticker", required=True, help="BIST ticker (e.g. TUPRS)")
    parser.add_argument(
        "--date",
        default=datetime.utcnow().strftime("%Y-%m-%d"),
        help="Analysis date (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--provider",
        default="anthropic",
        choices=["anthropic", "openai", "google", "xai"],
    )
    args = parser.parse_args()

    result = run_bist_analysis(
        ticker=args.ticker,
        analysis_date=args.date,
        config_overrides={"llm_provider": args.provider},
    )

    print("\n" + "=" * 60)
    print(f"ANALYSIS: {result['ticker']} | {result.get('analysis_date', args.date)}")
    print("=" * 60)
    if result.get("decision"):
        print(result["decision"])
    elif result.get("error"):
        print(f"ERROR: {result['error']}")
    print(result["disclaimer"])
