"""
notifications/whatsapp_symbols.py

TradeMind WhatsApp Symbol Resolver

Purpose
-------
Normalize user-entered stock names into canonical symbols used by
TradeMind.

Examples
--------
"reliance"        -> RELIANCE.NS
"Reliance"        -> RELIANCE.NS
"tcs"             -> TCS.NS
"infosys"         -> INFY.NS
"gold"            -> GC=F
"silver"          -> SI=F

This module contains NO business logic.
It only resolves symbols.
"""

from __future__ import annotations

from difflib import get_close_matches
from typing import Optional

# ------------------------------------------------------------------
# Canonical Symbol Map
# ------------------------------------------------------------------

SYMBOLS = {
    "RELIANCE": "RELIANCE.NS",
    "TCS": "TCS.NS",
    "INFY": "INFY.NS",
    "INFOSYS": "INFY.NS",
    "HDFCBANK": "HDFCBANK.NS",
    "ICICIBANK": "ICICIBANK.NS",
    "SBIN": "SBIN.NS",
    "ITC": "ITC.NS",
    "WIPRO": "WIPRO.NS",
    "LT": "LT.NS",
    "BAJFINANCE": "BAJFINANCE.NS",
    "ADANIENT": "ADANIENT.NS",

    # ETFs
    "NIFTYBEES": "NIFTYBEES.NS",
    "GOLDBEES": "GOLDBEES.NS",
    "SILVERBEES": "SILVERBEES.NS",

    # Commodities
    "GOLD": "GC=F",
    "SILVER": "SI=F",
}

# ------------------------------------------------------------------
# Friendly aliases
# ------------------------------------------------------------------

ALIASES = {
    "RELIANCE INDUSTRIES": "RELIANCE",
    "RIL": "RELIANCE",

    "TATA CONSULTANCY SERVICES": "TCS",

    "INFOSYS LTD": "INFOSYS",

    "STATE BANK": "SBIN",

    "HDFC BANK": "HDFCBANK",

    "ICICI BANK": "ICICIBANK",

    "BAJAJ FINANCE": "BAJFINANCE",

    "L&T": "LT",

    "NIFTY ETF": "NIFTYBEES",

    "GOLD ETF": "GOLDBEES",

    "SILVER ETF": "SILVERBEES",
}

# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------


def normalize_symbol(text: str) -> Optional[str]:
    """
    Convert user input into a canonical market symbol.

    Returns
    -------
    Canonical symbol or None.
    """

    if not text:
        return None

    text = text.strip().upper()

    if text.endswith(".NS"):
        return text

    if text in SYMBOLS:
        return SYMBOLS[text]

    if text in ALIASES:
        return SYMBOLS[ALIASES[text]]

    matches = get_close_matches(
        text,
        list(SYMBOLS.keys()) + list(ALIASES.keys()),
        n=1,
        cutoff=0.75,
    )

    if matches:
        match = matches[0]

        if match in SYMBOLS:
            return SYMBOLS[match]

        return SYMBOLS[ALIASES[match]]

    return None


def is_supported(text: str) -> bool:
    """Return True if the supplied symbol/name is supported."""
    return normalize_symbol(text) is not None


def supported_symbols() -> list[str]:
    """Return supported canonical names."""
    return sorted(SYMBOLS.keys())


def help_text() -> str:
    """
    Help message shown to WhatsApp users.
    """

    return (
        "TradeMind AI\n\n"
        "Send any supported stock name.\n\n"
        "Examples:\n"
        "• Reliance\n"
        "• TCS\n"
        "• Infosys\n"
        "• HDFC Bank\n"
        "• Gold\n"
        "• Silver\n"
        "• NIFTYBEES\n"
    )