"""
backend/wealth/advisor/recommendations/models.py

TradeMind Recommendation Models

Shared data models for the recommendation engine.

Responsibilities
----------------
✓ Recommendation DTOs
✓ Evaluation DTOs
✓ Context objects
✓ Summary models

This module intentionally contains NO business logic.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..enums import (
    HealthStatus,
    Priority,
    RecommendationType,
)
from ..models import AdviceItem, AdvisorFinding

# ==========================================================
# Context Models
# ==========================================================


@dataclass(slots=True)
class RecommendationContext:
    """
    Shared context used while generating recommendations.
    """

    overall_score: float
    risk_score: float
    opportunity_score: float
    confidence_score: float

    health_status: HealthStatus
    recommendation: RecommendationType

    portfolio_value: float
    cash_allocation: float

    diversification_score: float
    concentration_score: float


# ==========================================================
# Holding Recommendation
# ==========================================================


@dataclass(slots=True)
class HoldingRecommendation:
    """
    Recommendation for a single portfolio holding.
    """

    symbol: str

    action: RecommendationType

    priority: Priority

    confidence: float

    current_weight: float

    target_weight: float

    expected_return: float

    reason: str

    supporting_findings: list[AdvisorFinding] = field(
        default_factory=list
    )


# ==========================================================
# Allocation Recommendation
# ==========================================================


@dataclass(slots=True)
class AllocationRecommendation:
    """
    Portfolio allocation recommendation.
    """

    asset_class: str

    current_allocation: float

    target_allocation: float

    change_percentage: float

    reason: str

    priority: Priority


# ==========================================================
# Recommendation Summary
# ==========================================================


@dataclass(slots=True)
class RecommendationSummary:
    """
    High-level summary of generated recommendations.
    """

    total: int

    buy_count: int

    sell_count: int

    hold_count: int

    rebalance_count: int

    diversify_count: int


# ==========================================================
# Recommendation Evaluation
# ==========================================================


@dataclass(slots=True)
class RecommendationEvaluation:
    """
    Final output of the Recommendation Engine.
    """

    overall_score: float

    recommendation: RecommendationType

    health_status: HealthStatus

    summary: RecommendationSummary

    recommendations: list[AdviceItem]

    holding_recommendations: list[
        HoldingRecommendation
    ]

    allocation_recommendations: list[
        AllocationRecommendation
    ]

    findings: list[AdvisorFinding]

    confidence: float

    generated_at: str | None = None