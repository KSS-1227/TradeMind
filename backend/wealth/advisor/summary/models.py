"""
backend/wealth/advisor/summary/models.py

Summary models for the Advisor package.

The Summary engine aggregates outputs from the
Risk, Opportunity, Recommendation, and Alert
engines into a single structured executive
summary. It does not perform portfolio analysis;
instead, it consolidates the results generated
by the other advisor engines.

These models are intentionally lightweight and
serve as the bridge between deterministic rule
engines and the LLM explanation layer.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..enums import Priority
from ..models import AdvisorFinding


@dataclass(slots=True)
class SummaryContext:
    """
    Shared context used during summary generation.
    """

    overall_score: float

    portfolio_health: float

    risk_score: float

    opportunity_score: float

    recommendation_score: float

    alert_score: float

    confidence: float


@dataclass(slots=True)
class ExecutiveSummary:
    """
    Structured executive summary of the portfolio.
    """

    headline: str

    overview: str

    priority: Priority

    strengths: list[str] = field(default_factory=list)

    risks: list[str] = field(default_factory=list)

    opportunities: list[str] = field(default_factory=list)

    next_actions: list[str] = field(default_factory=list)


@dataclass(slots=True)
class SummaryEvaluation:
    """
    Final output produced by the Summary engine.
    """

    overall_score: float

    executive_summary: ExecutiveSummary

    findings: list[AdvisorFinding] = field(default_factory=list)

    confidence: float = 0.0

    generated_at: str = ""