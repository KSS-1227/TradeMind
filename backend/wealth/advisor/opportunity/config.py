"""
backend/wealth/advisor/opportunity/config.py

Configuration values for the Opportunity Analysis engine.

This module centralizes all thresholds, weights and constants
used when evaluating portfolio opportunities.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True, frozen=True)
class OpportunityConfig:
    """
    Configuration for portfolio opportunity evaluation.
    """

    # ==========================================================
    # Score Thresholds
    # ==========================================================

    excellent_score: float = 85.0
    good_score: float = 70.0
    average_score: float = 55.0
    weak_score: float = 40.0

    # ==========================================================
    # AI Confidence
    # ==========================================================

    high_confidence: float = 0.85
    medium_confidence: float = 0.70
    minimum_confidence: float = 0.55

    # ==========================================================
    # Diversification Opportunities
    # ==========================================================

    diversification_target: float = 80.0
    concentration_warning: float = 35.0

    # ==========================================================
    # Portfolio Growth
    # ==========================================================

    minimum_expected_return: float = 8.0
    strong_expected_return: float = 15.0

    # ==========================================================
    # Holding Quality
    # ==========================================================

    minimum_holding_score: float = 60.0
    excellent_holding_score: float = 85.0

    # ==========================================================
    # Component Weights
    # ==========================================================

    component_weights: dict[str, float] = field(
        default_factory=lambda: {
            "growth": 0.35,
            "quality": 0.25,
            "diversification": 0.20,
            "confidence": 0.20,
        }
    )

    # ==========================================================
    # Limits
    # ==========================================================

    max_findings: int = 10

    minimum_score: float = 0.0
    maximum_score: float = 100.0

    # ==========================================================
    # Validation
    # ==========================================================

    def __post_init__(self) -> None:
        """
        Validate configuration consistency.
        """

        total = sum(self.component_weights.values())

        if abs(total - 1.0) > 1e-6:
            raise ValueError(
                "Opportunity component weights must sum to 1.0."
            )

        if self.minimum_score >= self.maximum_score:
            raise ValueError(
                "Invalid opportunity score range."
            )