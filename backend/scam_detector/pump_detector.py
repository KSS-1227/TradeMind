"""
pump_detector.py

Behavioral Pump & Dump Detector

This module analyzes writing style rather than simple keywords.

Signals include:
- Excessive capitalization
- Emoji spam
- Unrealistic return claims
- Excessive exclamation marks
- FOMO language
- Pump keywords
- Target price claims

Returns a normalized score (0-100) with explainable evidence.
"""

from typing import Dict, List

from .utils import (
    uppercase_ratio,
    count_emojis,
    count_exclamations,
    extract_percentage_claims,
    extract_price_targets,
)

# ---------------------------------------------------------------------
# Pump Keywords
# ---------------------------------------------------------------------

PUMP_KEYWORDS = {
    "upper circuit",
    "rocket",
    "moon",
    "to the moon",
    "multibagger",
    "operator",
    "operator buying",
    "guaranteed",
    "breakout",
    "explosive",
    "massive breakout",
    "hidden gem",
    "buy before everyone",
    "next reliance",
    "100x",
    "100 bagger",
    "upper freeze",
    "only buyers",
    "don't miss",
    "last opportunity",
}

FOMO_KEYWORDS = {
    "buy now",
    "act now",
    "before it's too late",
    "last chance",
    "don't miss",
    "today only",
    "tomorrow upper circuit",
    "huge rally",
}


# ---------------------------------------------------------------------
# Detector
# ---------------------------------------------------------------------

def detect_pump_patterns(text: str) -> Dict:
    """
    Detect behavioral pump-and-dump characteristics.

    Returns
    -------
    {
        score: int,
        confidence: int,
        patterns: [...],
        metrics: {...}
    }
    """

    text_lower = text.lower()

    score = 0
    patterns: List[str] = []

    # ------------------------------------------------------------
    # Capitalization
    # ------------------------------------------------------------

    upper = uppercase_ratio(text)

    if upper > 0.60:
        score += 20
        patterns.append("Excessive capitalization")

    elif upper > 0.40:
        score += 10
        patterns.append("High capitalization")

    # ------------------------------------------------------------
    # Exclamation Marks
    # ------------------------------------------------------------

    exclamations = count_exclamations(text)

    if exclamations >= 8:
        score += 15
        patterns.append("Excessive exclamation marks")

    elif exclamations >= 4:
        score += 8
        patterns.append("Many exclamation marks")

    # ------------------------------------------------------------
    # Emoji Spam
    # ------------------------------------------------------------

    emojis = count_emojis(text)

    if emojis >= 8:
        score += 15
        patterns.append("Emoji spam")

    elif emojis >= 4:
        score += 8
        patterns.append("Heavy emoji usage")

    # ------------------------------------------------------------
    # Percentage Claims
    # ------------------------------------------------------------

    percentages = extract_percentage_claims(text)

    for pct in percentages:

        if pct >= 500:
            score += 25
            patterns.append(f"Unrealistic return claim ({pct}%)")

        elif pct >= 100:
            score += 15
            patterns.append(f"High return claim ({pct}%)")

    # ------------------------------------------------------------
    # Target Price Claims
    # ------------------------------------------------------------

    targets = extract_price_targets(text)

    if len(targets):

        score += 10

        patterns.append("Target price promotion")

    # ------------------------------------------------------------
    # Pump Keywords
    # ------------------------------------------------------------

    matched_keywords = []

    for keyword in PUMP_KEYWORDS:

        if keyword in text_lower:

            matched_keywords.append(keyword)

    if matched_keywords:

        score += min(len(matched_keywords) * 6, 24)

        patterns.append(
            f"Pump keywords ({', '.join(matched_keywords[:3])})"
        )

    # ------------------------------------------------------------
    # FOMO Language
    # ------------------------------------------------------------

    matched_fomo = []

    for keyword in FOMO_KEYWORDS:

        if keyword in text_lower:

            matched_fomo.append(keyword)

    if matched_fomo:

        score += min(len(matched_fomo) * 5, 15)

        patterns.append("FOMO marketing language")

    # ------------------------------------------------------------
    # Confidence
    # ------------------------------------------------------------

    score = min(score, 100)

    if score >= 75:
        confidence = 95

    elif score >= 50:
        confidence = 85

    elif score >= 25:
        confidence = 70

    else:
        confidence = 55

    # ------------------------------------------------------------
    # Response
    # ------------------------------------------------------------

    return {

        "score": score,

        "confidence": confidence,

        "patterns": patterns,

        "metrics": {

            "uppercase_ratio": round(upper, 2),

            "emoji_count": emojis,

            "exclamation_count": exclamations,

            "percentage_claims": percentages,

            "price_targets": targets,

            "pump_keyword_matches": matched_keywords,

            "fomo_matches": matched_fomo,
        },
    }
