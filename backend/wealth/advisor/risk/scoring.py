"""
backend/wealth/advisor/risk/scoring.py

TradeMind Risk Scoring Engine

Responsible for all quantitative portfolio risk calculations.

Responsibilities
----------------
✓ Portfolio Risk Score
✓ Diversification Score
✓ Concentration Score
✓ Holding Risk Aggregation
✓ AI Confidence Aggregation
✓ Explainable Component Breakdown

This module contains NO business recommendations.

It performs deterministic numerical calculations only.

Author: TradeMind AI
"""

from __future__ import annotations

import logging

from backend.wealth.portfolio_analyzer import (
    HoldingAnalysis,
    PortfolioAnalysis,
)

from ..enums import (
    HealthStatus,
    RiskLevel,
)
from .config import RiskConfig
from .helpers import (
    clamp,
    invert_score,
    round_score,
    safe_mean,
    weighted_score,
)
from .models import (
    ConfidenceSummary,
    HoldingRiskSummary,
    PortfolioRiskSummary,
    RiskComponents,
)

logger = logging.getLogger(__name__)


# ==========================================================
# Risk Scoring Engine
# ==========================================================


class RiskScoringEngine:
    """
    Performs all quantitative portfolio
    risk calculations.

    This class intentionally contains NO
    recommendation logic.

    Every calculation is deterministic.

    Same PortfolioAnalysis
            ↓
    Same Risk Score
    """

    def __init__(
        self,
        config: RiskConfig | None = None,
    ) -> None:
        self._config = config or RiskConfig()

    # ======================================================
    # Public API
    # ======================================================

    def calculate_overall_score(
        self,
        analysis: PortfolioAnalysis,
    ) -> RiskComponents:
        """
        Calculate the overall portfolio risk.

        Returns
        -------
        RiskComponents

        Contains every weighted component
        contributing to the final score.
        """

        logger.debug(
            "Calculating portfolio risk score.",
            extra={
                "portfolio_id": analysis.portfolio_id,
            },
        )

        health_component = self._health_component(
            analysis.portfolio_health,
        )

        diversification_component = (
            self._diversification_component(
                analysis.diversification.diversification_score,
            )
        )

        concentration_component = (
            self._concentration_component(
                analysis.diversification.concentration_score,
            )
        )

        holding_component = (
            self._holding_component(
                analysis.holdings,
            )
        )

        total_score = clamp(
            health_component
            + diversification_component
            + concentration_component
            + holding_component,
            self._config.MIN_SCORE,
            self._config.MAX_SCORE,
        )

        logger.info(
            "Portfolio risk score calculated.",
            extra={
                "portfolio_id": analysis.portfolio_id,
                "risk_score": round_score(total_score),
            },
        )

        return RiskComponents(
            health_component=round_score(
                health_component,
            ),
            diversification_component=round_score(
                diversification_component,
            ),
            concentration_component=round_score(
                concentration_component,
            ),
            holding_component=round_score(
                holding_component,
            ),
            total_score=round_score(
                total_score,
            ),
        )

    # ======================================================
    # Component Calculations
    # ======================================================

    def _health_component(
        self,
        portfolio_health: float,
    ) -> float:
        """
        Higher portfolio health
        means lower risk.

        Formula

        Risk = (100-health) × weight
        """

        return weighted_score(
            invert_score(portfolio_health),
            self._config.HEALTH_WEIGHT,
        )

    def _diversification_component(
        self,
        diversification_score: float,
    ) -> float:
        """
        Better diversification
        lowers portfolio risk.
        """

        return weighted_score(
            invert_score(
                diversification_score,
            ),
            self._config.DIVERSIFICATION_WEIGHT,
        )

    def _concentration_component(
        self,
        concentration_score: float,
    ) -> float:
        """
        Higher concentration
        increases portfolio risk.
        """

        return weighted_score(
            clamp(concentration_score),
            self._config.CONCENTRATION_WEIGHT,
        )

    def _holding_component(
        self,
        holdings: list[HoldingAnalysis],
    ) -> float:
        """
        Aggregate risk contributed
        by every holding.
        """

        summary = self.calculate_holding_summary(
            holdings,
        )

        return weighted_score(
            summary.average_score,
            self._config.HOLDING_WEIGHT,
        )
        # ======================================================
    # Holding Risk Analysis
    # ======================================================

    def calculate_holding_summary(
        self,
        holdings: list[HoldingAnalysis],
    ) -> PortfolioRiskSummary:
        """Calculate portfolio-wide aggregate risk statistics.

        Produces a single :class:`PortfolioRiskSummary` that
        describes the distribution of individual holding risk
        scores across the entire portfolio.

        Parameters
        ----------
        holdings:
            All holdings in the portfolio.

        Returns
        -------
        PortfolioRiskSummary
            Average, minimum, maximum risk score and holding
            count for the portfolio as a whole.
        """

        if not holdings:
            logger.warning("Portfolio contains no holdings.")
            return PortfolioRiskSummary(
                average_score=0.0,
                highest_score=0.0,
                lowest_score=0.0,
                holding_count=0,
            )

        scores = [
            self._holding_risk_score(holding)
            for holding in holdings
        ]

        summary = PortfolioRiskSummary(
            average_score=safe_mean(scores),
            highest_score=max(scores),
            lowest_score=min(scores),
            holding_count=len(scores),
        )

        logger.debug(
            "Portfolio holding summary calculated.",
            extra={
                "average": summary.average_score,
                "highest": summary.highest_score,
                "lowest": summary.lowest_score,
                "count": summary.holding_count,
            },
        )

        return summary

    def calculate_per_holding_summaries(
        self,
        holdings: list[HoldingAnalysis],
    ) -> list[HoldingRiskSummary]:
        """Produce a per-holding risk breakdown for every holding.

        Each entry in the returned list corresponds to exactly
        one holding.  All values are sourced from the existing
        :class:`~backend.wealth.portfolio_analyzer.HoldingAnalysis`
        fields — no calculations are duplicated.

        Parameters
        ----------
        holdings:
            All holdings in the portfolio.

        Returns
        -------
        list[HoldingRiskSummary]
            One :class:`HoldingRiskSummary` per holding,
            in the same order as *holdings*.
        """

        summaries: list[HoldingRiskSummary] = []

        for holding in holdings:
            score = self._holding_risk_score(holding)
            summaries.append(
                HoldingRiskSummary(
                    symbol=holding.symbol,
                    score=round_score(score),
                    confidence=round_score(
                        clamp(holding.confidence),
                    ),
                    concentration=round_score(
                        clamp(holding.portfolio_weight),
                    ),
                    volatility=holding.risk,
                )
            )

        logger.debug(
            "Per-holding summaries calculated.",
            extra={"count": len(summaries)},
        )

        return summaries

    # ======================================================
    # AI Confidence
    # ======================================================

    def calculate_confidence_summary(
        self,
        holdings: list[HoldingAnalysis],
    ) -> ConfidenceSummary:
        """
        Aggregate AI confidence across all holdings.
        """

        if not holdings:

            return ConfidenceSummary(
                average=0.0,
                minimum=0.0,
                maximum=0.0,
            )

        confidence_scores = [
            clamp(holding.confidence)
            for holding in holdings
        ]

        summary = ConfidenceSummary(
            average=safe_mean(confidence_scores),
            minimum=min(confidence_scores),
            maximum=max(confidence_scores),
        )

        logger.debug(
            "Confidence summary calculated.",
            extra={
                "average": summary.average,
                "minimum": summary.minimum,
                "maximum": summary.maximum,
            },
        )

        return summary

    # ======================================================
    # Risk Classification
    # ======================================================

    def determine_risk_level(
        self,
        score: float,
    ) -> RiskLevel:
        """
        Convert numerical portfolio risk
        into a RiskLevel.
        """

        score = clamp(score)

        for threshold, level in self._config.RISK_THRESHOLDS:

            if score >= threshold:
                return level

        return RiskLevel.LOW

    def determine_health_status(
        self,
        portfolio_health: float,
    ) -> HealthStatus:
        """
        Convert portfolio health into
        a human-readable classification.
        """

        portfolio_health = clamp(
            portfolio_health,
        )

        cfg = self._config

        if portfolio_health >= cfg.EXCELLENT_HEALTH:
            return HealthStatus.EXCELLENT

        if portfolio_health >= cfg.GOOD_HEALTH:
            return HealthStatus.GOOD

        if portfolio_health >= cfg.FAIR_HEALTH:
            return HealthStatus.FAIR

        if portfolio_health >= cfg.POOR_HEALTH:
            return HealthStatus.POOR

        return HealthStatus.CRITICAL

    # ======================================================
    # Private Helpers
    # ======================================================

    def _holding_risk_score(
        self,
        holding: HoldingAnalysis,
    ) -> float:
        """
        Convert a qualitative holding
        risk into a numeric score.
        """

        try:
            risk_level = RiskLevel(
                holding.risk,
            )

        except ValueError:

            logger.warning(
                "Unknown risk level encountered.",
                extra={
                    "symbol": holding.symbol,
                    "risk_level": holding.risk,
                },
            )

            return float(
                self._config.DEFAULT_RISK_SCORE,
            )

        return float(
            self._config.RISK_SCORE_MAPPING.get(
                risk_level,
                self._config.DEFAULT_RISK_SCORE,
            )
        )

    def validate_analysis(
        self,
        analysis: PortfolioAnalysis,
    ) -> None:
        """
        Validate incoming PortfolioAnalysis.

        Raises
        ------
        ValueError
            If required portfolio metrics
            are outside valid bounds.
        """

        if not 0 <= analysis.portfolio_health <= 100:
            raise ValueError(
                "Portfolio health must be between 0 and 100."
            )

        diversification = analysis.diversification

        if not (
            0
            <= diversification.diversification_score
            <= 100
        ):
            raise ValueError(
                "Invalid diversification score."
            )

        if not (
            0
            <= diversification.concentration_score
            <= 100
        ):
            raise ValueError(
                "Invalid concentration score."
            )

    # ======================================================
    # Explainability
    # ======================================================

    def explain_score(
        self,
        components: RiskComponents,
    ) -> dict[str, float]:
        """
        Return a structured explanation
        of the portfolio risk calculation.

        Useful for dashboards,
        APIs and future LLM agents.
        """

        return {
            "health_component": round_score(
                components.health_component,
            ),
            "diversification_component": round_score(
                components.diversification_component,
            ),
            "concentration_component": round_score(
                components.concentration_component,
            ),
            "holding_component": round_score(
                components.holding_component,
            ),
            "overall_score": round_score(
                components.total_score,
            ),
        }