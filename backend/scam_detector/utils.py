"""
utils.py

Shared utility functions for the AI Scam Detector.

This file intentionally contains NO business logic.

Responsibilities
----------------
✔ Text cleaning
✔ URL extraction
✔ Stock symbol extraction
✔ Emoji detection
✔ Capitalization analysis
✔ Message statistics

Hackathon Version
"""

import re
from typing import List, Optional
from urllib.parse import urlparse


# ---------------------------------------------------------------------
# Common URL Shorteners
# ---------------------------------------------------------------------

SHORTENER_DOMAINS = {
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "rebrand.ly",
    "is.gd",
    "ow.ly",
    "buff.ly",
    "shorturl.at",
    "cutt.ly"
}


# ---------------------------------------------------------------------
# Clean Text
# ---------------------------------------------------------------------

def clean_text(text: str) -> str:
    """
    Normalize whitespace.

    Doesn't lowercase because some
    detectors need capitalization.
    """

    text = re.sub(r"\s+", " ", text)
    return text.strip()


# ---------------------------------------------------------------------
# URL Extraction
# ---------------------------------------------------------------------

def extract_urls(text: str) -> List[str]:
    """
    Extract all URLs.
    """

    pattern = r"(https?://[^\s]+|www\.[^\s]+)"

    return re.findall(pattern, text)


# ---------------------------------------------------------------------
# Domain Extraction
# ---------------------------------------------------------------------

def get_domain(url: str) -> Optional[str]:
    """
    Returns domain.

    https://bit.ly/demo

    →

    bit.ly
    """

    try:

        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        return urlparse(url).netloc.lower()

    except Exception:
        return None


# ---------------------------------------------------------------------
# URL Shortener
# ---------------------------------------------------------------------

def is_shortened_url(url: str) -> bool:

    domain = get_domain(url)

    if domain is None:
        return False

    return domain in SHORTENER_DOMAINS


# ---------------------------------------------------------------------
# Uppercase Ratio
# ---------------------------------------------------------------------

def uppercase_ratio(text: str) -> float:
    """
    Percentage of uppercase letters.
    """

    letters = [c for c in text if c.isalpha()]

    if not letters:
        return 0

    upper = sum(1 for c in letters if c.isupper())

    return upper / len(letters)


# ---------------------------------------------------------------------
# Emoji Count
# ---------------------------------------------------------------------

EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F700-\U0001F77F"
    "\U0001F900-\U0001F9FF"
    "\U00002600-\U000026FF"
    "]+",
    flags=re.UNICODE,
)


def count_emojis(text: str) -> int:

    return len(EMOJI_PATTERN.findall(text))


# ---------------------------------------------------------------------
# Exclamation Count
# ---------------------------------------------------------------------

def count_exclamations(text: str) -> int:

    return text.count("!")


# ---------------------------------------------------------------------
# Percentage Claims
# ---------------------------------------------------------------------

def extract_percentage_claims(text: str) -> List[int]:
    """
    Finds claims like

    100%

    250%

    500%
    """

    matches = re.findall(r"(\d{1,4})\s*%", text)

    return [int(x) for x in matches]


# ---------------------------------------------------------------------
# Target Price Detection
# ---------------------------------------------------------------------

def extract_price_targets(text: str) -> List[str]:
    """
    Detect

    Target ₹4500

    Target 4500

    ₹1000 soon
    """

    pattern = (
        r"(?:target\s*[₹$]?\s*\d+(?:\.\d+)?)|"
        r"(?:[₹$]\s*\d+(?:\.\d+)?)"
    )

    return re.findall(pattern, text, flags=re.IGNORECASE)


# ---------------------------------------------------------------------
# Stock Symbol Extraction
# ---------------------------------------------------------------------

def extract_stock_symbols(text: str) -> List[str]:
    """
    Simple prototype.

    Finds

    $RELIANCE

    $TCS

    $INFY
    """

    return re.findall(r"\$([A-Z]{2,15})", text)


# ---------------------------------------------------------------------
# Message Statistics
# ---------------------------------------------------------------------

def message_stats(text: str) -> dict:
    """
    Useful for debugging and LLM context.
    """

    return {

        "length": len(text),

        "words": len(text.split()),

        "uppercase_ratio": round(
            uppercase_ratio(text),
            2
        ),

        "emoji_count": count_emojis(text),

        "exclamation_count": count_exclamations(text),

        "urls": extract_urls(text),

        "percentage_claims": extract_percentage_claims(text),

        "price_targets": extract_price_targets(text),

        "symbols": extract_stock_symbols(text),
    }


# ---------------------------------------------------------------------
# Smoke Test
# ---------------------------------------------------------------------

if __name__ == "__main__":

    sample = """
    🚀🚀 BUY $RELIANCE NOW!!

    Guaranteed 250% Profit!!

    Target ₹5000

    https://bit.ly/demo
    """

    print(message_stats(sample))