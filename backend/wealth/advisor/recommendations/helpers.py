"""
backend/wealth/advisor/recommendations/helpers.py

TradeMind Recommendation Helpers

Pure helper functions for the recommendation engine.

This module intentionally contains no business logic.
"""

from __future__ import annotations

from collections.abc import Iterable

from ..enums import Priority
from ..models import AdviceItem
from .models import HoldingRecommendation

# ==========================================================
# Numeric Helpers
# ==========================================================


def clamp(
    value: float,
    minimum: float = 0.0,
    maximum: float = 100.0,
) -> float:
    """
    Clamp a value within the specified range.
    """
    return max(minimum, min(value, maximum))


def round_score(
    score: float,
    digits: int = 2,
) -> float:
    """
    Round a score to the requested precision.
    """
    return round(score, digits)


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

    return sum(values) / len(values)


def weighted_score(
    values: dict[str, float],
    weights: dict[str, float],
) -> float:
    """
    Compute a weighted score.

    Missing weights default to zero.
    """
    total = 0.0

    for name, value in values.items():
        total += value * weights.get(name, 0.0)

    return clamp(total)


# ==========================================================
# Recommendation Helpers
# ==========================================================


def confidence_label(
    confidence: float,
) -> str:
    """
    Convert a confidence score into a label.
    """

    if confidence >= 90:
        return "Very High"

    if confidence >= 75:
        return "High"

    if confidence >= 60:
        return "Moderate"

    return "Low"


def priority_score(
    priority: Priority,
) -> int:
    """
    Convert a Priority enum into a sortable integer.
    """

    mapping = {
        Priority.CRITICAL: 4,
        Priority.HIGH: 3,
        Priority.MEDIUM: 2,
        Priority.LOW: 1,
    }

    return mapping.get(priority, 0)


def sort_by_priority(
    recommendations: list[AdviceItem],
) -> list[AdviceItem]:
    """
    Sort recommendations by priority.
    """

    return sorted(
        recommendations,
        key=lambda recommendation: priority_score(
            recommendation.priority,
        ),
        reverse=True,
    )


def deduplicate_by_symbol(
    recommendations: list[HoldingRecommendation],
) -> list[HoldingRecommendation]:
    """
    Remove duplicate recommendations for the
    same symbol while preserving order.
    """

    seen: set[str] = set()
    unique: list[HoldingRecommendation] = []

    for recommendation in recommendations:
        if recommendation.symbol in seen:
            continue

        seen.add(recommendation.symbol)
        unique.append(recommendation)

    return unique


def recommendation_ratio(
    count: int,
    total: int,
) -> float:
    """
    Return the percentage of recommendations
    represented by count.
    """

    if total <= 0:
        return 0.0

    return round(
        (count / total) * 100,
        2,
    )


def allocation_difference(
    current: float,
    target: float,
) -> float:
    """
    Absolute allocation deviation.
    """

    return abs(target - current)


def needs_rebalancing(
    current: float,
    target: float,
    tolerance: float,
) -> bool:
    """
    Determine whether a portfolio allocation
    exceeds the configured tolerance.
    """

    return allocation_difference(
        current,
        target,
    ) >= tolerance