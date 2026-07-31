"""
backend/wealth/advisor/recommendations/config.py

TradeMind Recommendation Configuration

Central configuration for the recommendation engine.

Responsibilities
----------------
✓ Recommendation thresholds
✓ Portfolio allocation targets
✓ Risk tolerance mappings
✓ Confidence thresholds
✓ Recommendation limits
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class RecommendationConfig:
    """
    Configuration for the recommendation engine.
    """

    # ==========================================================
    # Recommendation Limits
    # ==========================================================

    max_recommendations: int = 10
    max_buy_recommendations: int = 3
    max_sell_recommendations: int = 3
    max_hold_recommendations: int = 4

    # ==========================================================
    # Opportunity Thresholds
    # ==========================================================

    strong_buy_threshold: float = 85.0
    buy_threshold: float = 70.0
    hold_threshold: float = 55.0
    reduce_threshold: float = 40.0
    sell_threshold: float = 25.0

    # ==========================================================
    # Portfolio Health
    # ==========================================================

    excellent_portfolio: float = 85.0
    good_portfolio: float = 70.0
    average_portfolio: float = 55.0

    # ==========================================================
    # Risk Thresholds
    # ==========================================================

    low_risk_threshold: float = 30.0
    moderate_risk_threshold: float = 60.0
    high_risk_threshold: float = 80.0

    # ==========================================================
    # Diversification
    # ==========================================================

    diversification_target: float = 80.0
    sector_concentration_limit: float = 30.0
    single_holding_limit: float = 20.0

    # ==========================================================
    # Confidence
    # ==========================================================

    minimum_confidence: float = 60.0
    high_confidence: float = 80.0
    excellent_confidence: float = 90.0

    # ==========================================================
    # Cash Allocation
    # ==========================================================

    minimum_cash_percentage: float = 5.0
    preferred_cash_percentage: float = 10.0
    maximum_cash_percentage: float = 25.0

    # ==========================================================
    # Rebalancing
    # ==========================================================

    rebalance_deviation: float = 5.0
    rebalance_weight_difference: float = 10.0

    # ==========================================================
    # Holding Action
    # ==========================================================

    holding_buy_priority_risk_boundary: float = 50.0
    """Risk score below which a BUY action receives HIGH priority.

    When a holding's risk score is below this boundary its BUY
    recommendation is considered lower-risk and is escalated to
    HIGH priority; at or above it the priority stays MEDIUM.
    """

    # ==========================================================
    # Recommendation Weights
    # ==========================================================

    weights: dict[str, float] = field(
        default_factory=lambda: {
            "risk": 0.35,
            "opportunity": 0.45,
            "confidence": 0.20,
        }
    )

    # ==========================================================
    # Risk Tolerance Mapping
    # ==========================================================

    risk_profile_limits: dict[str, float] = field(
        default_factory=lambda: {
            "conservative": 35.0,
            "moderate": 60.0,
            "aggressive": 85.0,
        }
    )

    # ==========================================================
    # Validation
    # ==========================================================

    def __post_init__(self) -> None:
        """
        Validate configuration values.
        """

        if self.max_recommendations <= 0:
            raise ValueError(
                "max_recommendations must be positive."
            )

        if (
            self.max_buy_recommendations
            + self.max_sell_recommendations
            + self.max_hold_recommendations
            < self.max_recommendations
        ):
            raise ValueError(
                "Recommendation category limits are "
                "less than max_recommendations."
            )

        for name, value in self.weights.items():
            if not 0.0 <= value <= 1.0:
                raise ValueError(
                    f"Invalid weight '{name}': {value}"
                )

        total_weight = sum(self.weights.values())

        if abs(total_weight - 1.0) > 1e-6:
            raise ValueError(
                "Recommendation weights must sum to 1.0."
            )

        percentage_fields = (
            self.strong_buy_threshold,
            self.buy_threshold,
            self.hold_threshold,
            self.reduce_threshold,
            self.sell_threshold,
            self.low_risk_threshold,
            self.moderate_risk_threshold,
            self.high_risk_threshold,
            self.diversification_target,
            self.minimum_confidence,
            self.high_confidence,
            self.excellent_confidence,
            self.minimum_cash_percentage,
            self.preferred_cash_percentage,
            self.maximum_cash_percentage,
            self.rebalance_deviation,
            self.rebalance_weight_difference,
            self.sector_concentration_limit,
            self.single_holding_limit,
            self.holding_buy_priority_risk_boundary,
        )

        for value in percentage_fields:
            if not 0.0 <= value <= 100.0:
                raise ValueError(
                    "Percentage thresholds must be between "
                    "0 and 100."
                )