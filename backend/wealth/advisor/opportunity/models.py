"""
backend/wealth/advisor/opportunity/models.py

Domain models used by the Opportunity Analysis engine.

These models are internal DTOs exchanged between the
OpportunityAnalyzer, OpportunityFindingGenerator and
OpportunityEvaluator.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..enums import (
    HealthStatus,
    Priority,
    RecommendationType,
)
from ..models import AdvisorFinding

# ==========================================================
# Opportunity Components
# ==========================================================


@dataclass(slots=True)
class OpportunityComponents:
    """
    Individual component scores contributing to the
    overall opportunity score.
    """

    growth_score: float

    quality_score: float

    diversification_score: float

    confidence_score: float

    total_score: float


# ==========================================================
# Holding Opportunity Summary
# ==========================================================


@dataclass(slots=True)
class HoldingOpportunitySummary:
    """
    Opportunity assessment for a single holding.
    """

    symbol: str

    score: float

    expected_return: float

    confidence: float

    upside: float

    quality: float


# ==========================================================
# Confidence Summary
# ==========================================================


@dataclass(slots=True)
class ConfidenceSummary:
    """
    Aggregated confidence statistics for the portfolio.
    """

    average: float

    minimum: float

    maximum: float

    high_confidence_count: int

    low_confidence_count: int


# ==========================================================
# Finding Context
# ==========================================================


@dataclass(slots=True)
class FindingContext:
    """
    Shared context supplied to the finding generator.
    """

    overall_score: float

    portfolio_health: float

    diversification_score: float

    average_expected_return: float

    confidence: float

    health_status: HealthStatus

    recommendation: RecommendationType


# ==========================================================
# Opportunity Evaluation
# ==========================================================


@dataclass(slots=True)
class OpportunityEvaluation:
    """
    Final opportunity evaluation returned by the
    OpportunityEvaluator.
    """

    overall_score: float

    health_status: HealthStatus

    diversification_score: float

    expected_return: float

    confidence: float

    recommendation: RecommendationType

    holding_summary: list[HoldingOpportunitySummary] = field(default_factory=list)

    findings: list[AdvisorFinding] = field(default_factory=list)


# ==========================================================
# Opportunity Candidate
# ==========================================================


@dataclass(slots=True)
class OpportunityCandidate:
    """
    Represents a detected investment opportunity.
    """

    symbol: str

    title: str

    description: str

    score: float

    expected_return: float

    confidence: float

    priority: Priority
