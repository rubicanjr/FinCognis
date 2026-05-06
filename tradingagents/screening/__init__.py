"""
Screening modülü.
"""

from tradingagents.screening.bist_screener import run_bist_screen
from tradingagents.screening.us_screener import run_us_screen

SCREENING_TRIGGERS = [
    "tarama yap",
    "bist analiz",
    "en iyi hisseler",
    "hisse öner",
    "sohbete çalışmanı yapar mısın",
]


def handle_screening_intent(user_message: str) -> bool:
    message_lower = user_message.lower()
    return any(trigger in message_lower for trigger in SCREENING_TRIGGERS)


__all__ = [
    "run_bist_screen",
    "run_us_screen",
    "SCREENING_TRIGGERS",
    "handle_screening_intent",
]
