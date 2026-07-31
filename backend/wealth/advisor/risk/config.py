"""
backend/wealth/advisor/risk/config.py

TradeMind Risk Engine Configuration

Centralized configuration and thresholds used by the
portfolio risk evaluation engine.

Keeping all tunable values here ensures:

- No magic numbers
- Easy experimentation
- Single source of truth
- Cleaner unit testing
- Easier future ML calibration
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Final

from ..enums import RiskLevel


@dataclass(frozen=True, slots=True)
class RiskConfig:
    """
    Configuration object used by the Risk Engine.

    All thresholds, weights, mappings, and default values
    should live here instead of being scattered throughout
    business logic.
    """

    # ==========================================================
    # Portfolio Risk Thresholds
    # ==========================================================

    LOW_RISK: Final[float] = 30.0
    MEDIUM_RISK: Final[float] = 50.0
    HIGH_RISK: Final[float] = 70.0
    VERY_HIGH_RISK: Final[float] = 85.0

    # ==========================================================
    # Portfolio Health Thresholds
    # ==========================================================

    EXCELLENT_HEALTH: Final[float] = 80.0
    GOOD_HEALTH: Final[float] = 60.0
    FAIR_HEALTH: Final[float] = 40.0
    POOR_HEALTH: Final[float] = 20.0

    # ==========================================================
    # Diversification Thresholds
    # ==========================================================

    EXCELLENT_DIVERSIFICATION: Final[float] = 80.0
    GOOD_DIVERSIFICATION: Final[float] = 60.0
    FAIR_DIVERSIFICATION: Final[float] = 40.0

    # ==========================================================
    # Concentration Thresholds
    # ==========================================================

    LOW_CONCENTRATION: Final[float] = 15.0
    MODERATE_CONCENTRATION: Final[float] = 25.0
    HIGH_CONCENTRATION: Final[float] = 40.0

    # ==========================================================
    # AI Confidence Thresholds
    # ==========================================================

    HIGH_AI_CONFIDENCE: Final[float] = 80.0
    MEDIUM_AI_CONFIDENCE: Final[float] = 60.0

    # ==========================================================
    # Risk Score Weights
    # ==========================================================

    HEALTH_WEIGHT: Final[float] = 0.35
    DIVERSIFICATION_WEIGHT: Final[float] = 0.25
    CONCENTRATION_WEIGHT: Final[float] = 0.20
    HOLDING_WEIGHT: Final[float] = 0.20

    # ==========================================================
    # Defaults
    # ==========================================================

    DEFAULT_RISK_SCORE: Final[int] = 50
    MIN_SCORE: Final[float] = 0.0
    MAX_SCORE: Final[float] = 100.0

    # ==========================================================
    # Holding Risk Mapping
    # ==========================================================

    RISK_SCORE_MAPPING: dict[RiskLevel, int] = field(
        init=False
    )

    # ==========================================================
    # Ordered Risk Thresholds
    # ==========================================================

    RISK_THRESHOLDS: tuple[tuple[float, RiskLevel], ...] = field(
        init=False
    )

    def __post_init__(self) -> None:
        """
        Initialize derived configuration.

        Frozen dataclasses require object.__setattr__.
        """

        object.__setattr__(
            self,
            "RISK_SCORE_MAPPING",
            {
                RiskLevel.LOW: 20,
                RiskLevel.MEDIUM: 50,
                RiskLevel.HIGH: 80,
                RiskLevel.VERY_HIGH: 95,
            },
        )

        object.__setattr__(
            self,
            "RISK_THRESHOLDS",
            (
                (self.VERY_HIGH_RISK, RiskLevel.VERY_HIGH),
                (self.HIGH_RISK, RiskLevel.HIGH),
                (self.MEDIUM_RISK, RiskLevel.MEDIUM),
                (0.0, RiskLevel.LOW),
            ),
        )