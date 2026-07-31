"""
red_flags.py

Rule-based financial scam detector.

Purpose:
- Detect common scam phrases
- Assign weighted risk scores
- Return explainable red flags

Prototype version for TradeMind Hackathon.
"""

import re
from typing import Dict, List

from .models import RedFlag

# ---------------------------------------------------------------------
# Red Flag Dictionary
# ---------------------------------------------------------------------

RED_FLAG_RULES = [
    {
        "name": "Guaranteed Returns",
        "pattern": r"(guaranteed return|100% profit|sure profit|risk[- ]?free)",
        "weight": 30,
        "description": "Claims guaranteed or risk-free returns."
    },
    {
        "name": "Double Your Money",
        "pattern": r"(double your money|2x return|3x return|5x return|10x return)",
        "weight": 25,
        "description": "Promises unrealistic investment growth."
    },
    {
        "name": "Urgency",
        "pattern": r"(buy now|act now|limited time|today only|last chance|don't miss)",
        "weight": 20,
        "description": "Creates urgency to pressure investors."
    },
    {
        "name": "Insider Tip",
        "pattern": r"(inside information|insider tip|operator tip|secret tip)",
        "weight": 20,
        "description": "Claims access to confidential information."
    },
    {
        "name": "Upper Circuit Claim",
        "pattern": r"(upper circuit|rocket|moon|multibagger|to the moon)",
        "weight": 15,
        "description": "Uses exaggerated stock movement claims."
    },
    {
        "name": "No Risk",
        "pattern": r"(zero risk|no risk|safe investment)",
        "weight": 20,
        "description": "Misleading statement suggesting no investment risk."
    }
]


# ---------------------------------------------------------------------
# Text Normalization
# ---------------------------------------------------------------------

def normalize_text(text: str) -> str:
    """
    Normalize text before applying regex rules.
    """
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


# ---------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------

def detect_red_flags(text: str) -> Dict:
    """
    Detect financial scam keywords.

    Returns
    -------
    {
        "flags": List[RedFlag],
        "score": int
    }
    """

    normalized = normalize_text(text)

    detected: List[RedFlag] = []
    total_score = 0

    for rule in RED_FLAG_RULES:

        if re.search(rule["pattern"], normalized):

            detected.append(
                RedFlag(
                    name=rule["name"],
                    description=rule["description"],
                    weight=rule["weight"]
                )
            )

            total_score += rule["weight"]

    total_score = min(total_score, 100)

    return {
        "flags": detected,
        "score": total_score
    }


# ---------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------

def has_red_flags(text: str) -> bool:
    """
    Quick boolean check.
    """

    return len(detect_red_flags(text)["flags"]) > 0


# ---------------------------------------------------------------------
# Testing
# ---------------------------------------------------------------------

if __name__ == "__main__":

    sample = """
    BUY RELIANCE NOW!!

    Guaranteed Return!!

    Double your money in 30 days!!

    Secret operator tip!!
    """

    result = detect_red_flags(sample)

    print(result["score"])

    for flag in result["flags"]:
        print(flag.name)