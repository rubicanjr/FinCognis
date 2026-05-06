"""
Tarama modu giriş noktası.

Kullanım:
  python screening_main.py --universe bist30 --top 3
  python screening_main.py --universe us --top 5 --horizon long_term
"""

from __future__ import annotations

import argparse
from datetime import datetime
import json
import logging
from pathlib import Path

from dotenv import load_dotenv

from bist_main import run_bist_analysis
from tradingagents.default_config import DEFAULT_CONFIG
from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.screening.bist_screener import run_bist_screen
from tradingagents.screening.us_screener import run_us_screen

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def _run_us_analysis(ticker: str, analysis_date: str) -> dict:
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
    graph = TradingAgentsGraph(debug=True, config=config)
    try:
        _, decision = graph.propagate(ticker, analysis_date)
        return {"ticker": ticker, "analysis_date": analysis_date, "decision": decision}
    except Exception as exc:
        return {"ticker": ticker, "analysis_date": analysis_date, "error": str(exc)}


def run_full_screening(
    universe: str = "bist30",
    horizon: str = "medium_term",
    top_n: int = 3,
    run_debate: bool = True,
    analysis_date: str | None = None,
) -> None:
    analysis_date = analysis_date or datetime.utcnow().strftime("%Y-%m-%d")

    print(f"\n{'=' * 60}")
    print(f"SCREENING | Universe: {universe.upper()}")
    print(f"Horizon: {horizon} | Date: {analysis_date}")
    print(f"{'=' * 60}\n")

    logger.info("[PIPELINE] Phase 1: Quantitative screening")
    if universe in {"bist30", "bist100"}:
        screen_result = run_bist_screen(universe=universe, horizon=horizon, top_n=top_n)
    else:
        screen_result = run_us_screen(universe="us_large_cap", horizon=horizon, top_n=top_n)

    print(f"Screened: {screen_result['total_screened']} stocks")
    print(f"Successful fetches: {screen_result['successful_fetches']}")
    print(f"Failed: {len(screen_result['failed_tickers'])} tickers")
    if screen_result["failed_tickers"]:
        print(f"Failed tickers: {', '.join(screen_result['failed_tickers'])}")

    print(f"\n--- TOP {top_n} EDUCATIONAL FILTER OUTPUTS ---")
    for index, finalist in enumerate(screen_result["finalists"], 1):
        print(
            f"{index}. {finalist['ticker']}: "
            f"Score={finalist['score']:.4f} | "
            f"Data completeness={finalist['data_completeness']:.0%}"
        )
        if finalist["missing_components"]:
            print(f"   Missing: {', '.join(finalist['missing_components'])}")

    macro = screen_result["macro_context"]
    if macro.get("data_available"):
        print("\n--- MACRO CONTEXT ---")
        if macro.get("tufe_latest") is not None:
            print(f"TÜFE (aylık): %{macro['tufe_latest']:.2f}")
        if macro.get("policy_rate") is not None:
            print(f"Politika faizi: %{macro['policy_rate']:.2f}")
        if macro.get("usdtry") is not None:
            print(f"USD/TRY: {macro['usdtry']:.4f}")
    else:
        print("\nMakro veri mevcut değil.")

    debate_results: list[dict] = []
    if run_debate and screen_result["finalists"]:
        print(f"\n--- PHASE 2: DEBATE ANALYSIS FOR TOP {top_n} ---")
        for finalist in screen_result["finalists"]:
            ticker = finalist["ticker"]
            logger.info("[PIPELINE] Running debate for %s", ticker)
            if universe in {"bist30", "bist100"}:
                debate_result = run_bist_analysis(ticker=ticker, analysis_date=analysis_date)
            else:
                debate_result = _run_us_analysis(ticker=ticker, analysis_date=analysis_date)
            debate_results.append(debate_result)
            print(f"\n{'─' * 50}")
            print(f"DEBATE RESULT: {ticker}")
            print(f"{'─' * 50}")
            if debate_result.get("decision"):
                print(debate_result["decision"])
            elif debate_result.get("error"):
                print(f"Error: {debate_result['error']}")

    report = {
        "generated_at": datetime.utcnow().isoformat(),
        "universe": universe,
        "horizon": horizon,
        "analysis_date": analysis_date,
        "screening": screen_result,
        "debate_analyses": debate_results,
    }

    output_dir = Path(DEFAULT_CONFIG.get("results_dir", "./screening_reports"))
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / f"screen_report_{analysis_date}_{universe}.json"
    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2, default=str)
    print(f"\nReport saved: {report_path}")
    print(screen_result["disclaimer"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BIST/US Stock Screener")
    parser.add_argument(
        "--universe",
        default="bist30",
        choices=["bist30", "bist100", "us"],
        help="Stock universe to screen",
    )
    parser.add_argument("--top", type=int, default=3, help="Number of finalists")
    parser.add_argument(
        "--horizon",
        default="medium_term",
        choices=["short_term", "medium_term", "long_term"],
    )
    parser.add_argument("--date", default=None, help="Analysis date YYYY-MM-DD")
    parser.add_argument("--no-debate", action="store_true", help="Skip debate stage")
    args = parser.parse_args()

    run_full_screening(
        universe=args.universe,
        horizon=args.horizon,
        top_n=args.top,
        run_debate=not args.no_debate,
        analysis_date=args.date,
    )
