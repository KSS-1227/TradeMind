"""
backend/wealth/advisor/risk/helpers.py

Utility helpers for the Risk Evaluation Engine.

These helpers contain only deterministic utility functions.

Responsibilities
----------------
- Numeric clamping
- Safe averaging
- Score rounding
- Percentage validation

No business logic should exist here.
"""

from __future__ import annotations

from collections.abc import Iterable
from statistics import mean


def clamp(
    value: float,
    minimum: float = 0.0,
    maximum: float = 100.0,
) -> float:
    """
    Restrict a numeric value to the given range.
    """
    return max(minimum, min(value, maximum))


def safe_mean(values: Iterable[float]) -> float:
    """
    Safely calculate the arithmetic mean.

    Returns 0.0 for an empty iterable.
    """

    values = list(values)

    if not values:
        return 0.0

    return mean(values)


def round_score(
    score: float,
    decimals: int = 2,
) -> float:
    """
    Round a score to the desired precision.
    """
    return round(score, decimals)


def percentage(value: float) -> float:
    """
    Normalize percentage-like values.

    Ensures every percentage remains
    inside the valid range [0,100].
    """

    return clamp(value)


def weighted_score(
    score: float,
    weight: float,
) -> float:
    """
    Calculate weighted contribution.
    """

    return score * weight


def invert_score(score: float) -> float:
    """
    Converts a positive metric into
    its risk contribution.

    Example

    Health = 80

    Risk contribution = 20
    """

    return 100.0 - clamp(score)


def is_high(value: float, threshold: float) -> bool:
    """
    Check if value exceeds threshold.
    """

    return value >= threshold


def is_low(value: float, threshold: float) -> bool:
    """
    Check if value falls below threshold.
    """

    return value <= threshold


def confidence_label(confidence: float) -> str:
    """
    Human-readable confidence level.

    Used mainly for logging/debugging.
    """

    if confidence >= 80:
        return "HIGH"

    if confidence >= 60:
        return "MEDIUM"

    return "LOW"


def risk_percentage(score: float) -> float:
    """
    Normalize portfolio risk score.
    """

    return clamp(round(score, 2))


def health_percentage(score: float) -> float:
    """
    Normalize portfolio health score.
    """

    return clamp(round(score, 2))