"""
backend/wealth/advisor/summary/config.py

Configuration for the Summary engine.

The Summary engine does not perform analysis. Instead,
it aggregates outputs from the Risk, Opportunity,
Recommendation, and Alert engines into a single
executive summary.

This module defines configurable thresholds and limits
used while constructing that summary.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True, frozen=True)
class SummaryThresholds:
    """
    Score thresholds used to classify the
    overall portfolio health.
    """

    excellent_score: float = 90.0
    good_score: float = 75.0
    fair_score: float = 60.0
    poor_score: float = 40.0


@dataclass(slots=True, frozen=True)
class SummaryLimits:
    """
    Limits used while constructing
    executive summaries.
    """

    max_headline_length: int = 120

    max_overview_length: int = 500

    max_strengths: int = 5

    max_risks: int = 5

    max_opportunities: int = 5

    max_next_actions: int = 5

    max_findings: int = 20


@dataclass(slots=True, frozen=True)
class SummaryValidation:
    """
    Validation rules for summary generation.
    """

    min_confidence: float = 0.0

    max_confidence: float = 1.0

    min_score: float = 0.0

    max_score: float = 100.0


@dataclass(slots=True, frozen=True)
class SummaryConfig:
    """
    Top-level configuration for the
    Summary engine.
    """

    thresholds: SummaryThresholds = field(
        default_factory=SummaryThresholds
    )

    limits: SummaryLimits = field(
        default_factory=SummaryLimits
    )

    validation: SummaryValidation = field(
        default_factory=SummaryValidation
    )