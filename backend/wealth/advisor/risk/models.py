"""
backend/wealth/advisor/risk/models.py

Domain models used by the Risk Evaluation Engine.

These models are internal to the Advisor Risk package and are
never exposed directly through the API layer.

The AdvisorEngine is responsible for transforming these models
into API response models (AdviceItem, AdvisorResponse, etc.).

Model hierarchy
---------------
PortfolioRiskSummary
    Aggregated statistics across *all* holdings
    (average score, highest score, lowest score,
    holding count).  Replaces the former
    ``HoldingRiskSummary`` which described the same
    portfolio-wide aggregate despite its name.

HoldingRiskSummary
    Per-holding risk breakdown for a *single* holding
    (symbol, score, confidence, concentration,
    volatility).  This is the correct level of
    granularity for holding-level detail views.

RiskEvaluation
    Final DTO returned by RiskEvaluator.  Exposes
    both ``portfolio_summary: PortfolioRiskSummary``
    and ``holding_summary: list[HoldingRiskSummary]``.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..enums import HealthStatus, RecommendationType, RiskLevel
from ..models import AdvisorFinding

# ==========================================================
# Portfolio-level Risk Summary
# ==========================================================


@dataclass(frozen=True, slots=True)
class PortfolioRiskSummary:
    """Portfolio-wide aggregate risk statistics."""

    average_score: float
    highest_score: float
    lowest_score: float
    holding_count: int


# ==========================================================
# Holding-level Risk Summary
# ==========================================================


@dataclass(frozen=True, slots=True)
class HoldingRiskSummary:
    """Risk breakdown for a single portfolio holding."""

    symbol: str
    score: float
    confidence: float
    concentration: float
    volatility: str


# ==========================================================
# Risk Evaluation DTO
# ==========================================================


@dataclass(slots=True)
class RiskEvaluation:
    """Complete outcome of a portfolio risk evaluation."""

    overall_score: float
    risk_level: RiskLevel
    health_status: HealthStatus
    diversification_score: float
    concentration_score: float
    ai_confidence: float
    recommendation: RecommendationType

    portfolio_summary: PortfolioRiskSummary = field(
        default_factory=lambda: PortfolioRiskSummary(
            average_score=0.0,
            highest_score=0.0,
            lowest_score=0.0,
            holding_count=0,
        )
    )
    holding_summary: list[HoldingRiskSummary] = field(default_factory=list)
    findings: list[AdvisorFinding] = field(default_factory=list)


# ==========================================================
# Component Scores
# ==========================================================


@dataclass(frozen=True, slots=True)
class RiskComponents:
    """Individual weighted components contributing to the
    final portfolio risk score."""

    health_component: float
    diversification_component: float
    concentration_component: float
    holding_component: float
    total_score: float


# ==========================================================
# AI Confidence Summary
# ==========================================================


@dataclass(frozen=True, slots=True)
class ConfidenceSummary:
    """Aggregated AI confidence statistics."""

    average: float
    minimum: float
    maximum: float


# ==========================================================
# Finding Context
# ==========================================================


@dataclass(frozen=True, slots=True)
class FindingContext:
    """Immutable context bundle passed to RiskFindingGenerator."""

    overall_score: float
    portfolio_health: float
    diversification_score: float
    concentration_score: float
    ai_confidence: float
    risk_level: RiskLevel
    health_status: HealthStatus
    recommendation: RecommendationType
