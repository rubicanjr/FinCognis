from langchain_core.messages import HumanMessage, RemoveMessage

# Import tools from separate utility files
from tradingagents.agents.utils.core_stock_tools import (
    get_stock_data
)
from tradingagents.agents.utils.technical_indicators_tools import (
    get_indicators
)
from tradingagents.agents.utils.fundamental_data_tools import (
    get_fundamentals,
    get_balance_sheet,
    get_cashflow,
    get_income_statement
)
from tradingagents.agents.utils.news_data_tools import (
    get_news,
    get_insider_transactions,
    get_global_news
)

DATA_INTEGRITY_RULES = """
CRITICAL DATA INTEGRITY RULES — READ BEFORE ANALYSIS:

NEVER fabricate financial figures. If a number is not
present in the tool output provided to you, write
"Data not available" instead.
If you cannot verify a specific number from the provided
tool output, write 'Data unavailable' instead of estimating.
Never fabricate financial figures, dates, or percentages.
NEVER extrapolate or estimate missing data points.
Missing data = report the gap, do not fill it.
For BIST stocks: All analysis is in TRY (Turkish Lira)
unless explicitly stated otherwise. Do not convert
currencies without explicit instruction.
Confidence levels: Always state your confidence as:
HIGH (data directly from source)
MEDIUM (derived/calculated from source data)
LOW (inferred — flag clearly)
NOT AVAILABLE (data missing)
This system produces EDUCATIONAL analysis only.
Never use: buy, sell, invest, recommend.
Always use: analyze, observe, note, indicate.
For Turkish macro context: High inflation (TUFE > 40%
annual) suppresses real returns. Always distinguish
nominal vs real returns in BIST analysis.
"""


def get_language_instruction() -> str:
    """Return a prompt instruction for the configured output language.

    Returns empty string when English (default), so no extra tokens are used.
    Only applied to user-facing agents (analysts, portfolio manager).
    Internal debate agents stay in English for reasoning quality.
    """
    from tradingagents.dataflows.config import get_config
    lang = get_config().get("output_language", "English")
    if lang.strip().lower() == "english":
        return ""
    return f" Write your entire response in {lang}."


def get_data_integrity_rules() -> str:
    return DATA_INTEGRITY_RULES


def build_instrument_context(ticker: str) -> str:
    """Describe the exact instrument so agents preserve exchange-qualified tickers."""
    return (
        f"The instrument to analyze is `{ticker}`. "
        "Use this exact ticker in every tool call, report, and recommendation, "
        "preserving any exchange suffix (e.g. `.TO`, `.L`, `.HK`, `.T`)."
    )

def create_msg_delete():
    def delete_messages(state):
        """Clear messages and add placeholder for Anthropic compatibility"""
        messages = state["messages"]

        # Remove all messages
        removal_operations = [RemoveMessage(id=m.id) for m in messages]

        # Add a minimal placeholder message
        placeholder = HumanMessage(content="Continue")

        return {"messages": removal_operations + [placeholder]}

    return delete_messages


        
