"""
backend/wealth/advisor/opportunity/helpers.py

Pure helper functions for the Opportunity Analysis engine.

These functions are intentionally stateless and reusable.
They perform mathematical operations, normalization,
confidence calculations and score aggregation.
"""

from __future__ import annotations

from collections.abc import Iterable
from statistics import mean

# ==========================================================
# Numeric Helpers
# ==========================================================


def clamp(
    value: float,
    minimum: float = 0.0,
    maximum: float = 100.0,
) -> float:
    """
    Clamp a value within the given range.
    """

    return max(minimum, min(value, maximum))


def round_score(
    value: float,
    digits: int = 2,
) -> float:
    """
    Round a score while preventing floating-point noise.
    """

    return round(float(value), digits)


def normalize_score(
    value: float,
    maximum: float,
) -> float:
    """
    Normalize a value into a 0–100 score.

    Returns 0 if the maximum is non-positive.
    """

    if maximum <= 0:
        return 0.0

    return clamp((value / maximum) * 100.0)


# ==========================================================
# Statistics
# ==========================================================


def safe_mean(
    values: Iterable[float],
) -> float:
    """
    Return the arithmetic mean.

    Returns 0.0 for an empty iterable.
    """

    values = list(values)

    if not values:
        return 0.0

    return float(mean(values))


def safe_min(
    values: Iterable[float],
) -> float:
    """
    Return the minimum value.

    Returns 0.0 for an empty iterable.
    """

    values = list(values)

    if not values:
        return 0.0

    return float(min(values))


def safe_max(
    values: Iterable[float],
) -> float:
    """
    Return the maximum value.

    Returns 0.0 for an empty iterable.
    """

    values = list(values)

    if not values:
        return 0.0

    return float(max(values))


# ==========================================================
# Weighted Scoring
# ==========================================================


def weighted_score(
    scores: dict[str, float],
    weights: dict[str, float],
) -> float:
    """
    Calculate a weighted opportunity score.
    """

    total = 0.0

    for key, weight in weights.items():
        total += scores.get(key, 0.0) * weight

    return clamp(total)


# ==========================================================
# Confidence
# ==========================================================


def confidence_label(
    confidence: float,
) -> str:
    """
    Convert a confidence value into a
    human-readable label.
    """

    if confidence >= 0.90:
        return "Very High"

    if confidence >= 0.80:
        return "High"

    if confidence >= 0.65:
        return "Medium"

    if confidence >= 0.50:
        return "Low"

    return "Very Low"


def confidence_percentage(
    confidence: float,
) -> float:
    """
    Convert a confidence value (0–1)
    into a percentage.
    """

    return round_score(
        clamp(confidence * 100.0),
    )


# ==========================================================
# Opportunity Metrics
# ==========================================================


def upside_percentage(
    current_price: float,
    target_price: float,
) -> float:
    """
    Calculate percentage upside from the
    current price to the target price.
    """

    if current_price <= 0:
        return 0.0

    upside = (
        (target_price - current_price)
        / current_price
    ) * 100.0

    return round_score(upside)


def expected_return_score(
    expected_return: float,
    minimum: float = 0.0,
    maximum: float = 20.0,
) -> float:
    """
    Convert an expected annual return
    into a normalized 0–100 score.
    """

    if maximum <= minimum:
        return 0.0

    normalized = (
        (expected_return - minimum)
        / (maximum - minimum)
    ) * 100.0

    return clamp(normalized)


def improvement_percentage(
    current_score: float,
    improved_score: float,
) -> float:
    """
    Calculate percentage improvement
    between two scores.
    """

    if current_score <= 0:
        return 0.0

    improvement = (
        (improved_score - current_score)
        / current_score
    ) * 100.0

    return round_score(improvement)


# ==========================================================
# Portfolio Metrics
# ==========================================================


def portfolio_quality(
    quality_scores: Iterable[float],
) -> float:
    """
    Average quality score of all holdings.
    """

    return round_score(
        safe_mean(quality_scores),
    )


def portfolio_growth(
    expected_returns: Iterable[float],
) -> float:
    """
    Average expected annual return of
    the portfolio.
    """

    return round_score(
        safe_mean(expected_returns),
    )