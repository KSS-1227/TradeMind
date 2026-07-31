"""
backend/wealth/advisor/alerts/generator.py

TradeMind Alert Generator

Synthesizes actionable portfolio alerts from
RiskEvaluation, OpportunityEvaluation and
RecommendationEvaluation.

Responsibilities
----------------
✓ Validate inputs
✓ Build AlertContext
✓ Generate holding alerts
✓ Generate portfolio alerts
✓ Generate AlertEvaluation

This module NEVER computes risk or opportunity
scores. It only consumes outputs produced by
other advisor engines.
"""

from __future__ import annotations

import logging

from backend.wealth.portfolio_analyzer import PortfolioAnalysis

from ..models import AdviceItem
from ..opportunity.models import OpportunityEvaluation
from ..recommendations.models import RecommendationEvaluation
from ..risk.models import RiskEvaluation
from .config import AlertConfig
from .helpers import (
    average_confidence,
    build_summary,
    current_timestamp,
    deduplicate_alerts,
    sort_alerts,
)
from .models import (
    AlertContext,
    AlertEvaluation,
)

logger = logging.getLogger(__name__)


class AlertGenerator:
    """
    Stateless Alert Engine.

    Consumes existing advisor evaluations and
    generates actionable portfolio alerts.
    """

    def __init__(
        self,
        config: AlertConfig | None = None,
    ) -> None:

        self._config = config or AlertConfig()

    # ==========================================================
    # Public API
    # ==========================================================

    def generate(
        self,
        *,
        analysis: PortfolioAnalysis,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
        recommendations: RecommendationEvaluation,
    ) -> AlertEvaluation:
        """
        Generate portfolio alerts.

        Parameters
        ----------
        analysis
            PortfolioAnalysis.

        risk
            RiskEvaluation.

        opportunity
            OpportunityEvaluation.

        recommendations
            RecommendationEvaluation.

        Returns
        -------
        AlertEvaluation
        """

        logger.info(
            "alert_generation_started",
            extra={
                "portfolio_id": analysis.portfolio_id,
                "holding_count": len(
                    analysis.holdings,
                ),
            },
        )

        self._validate_inputs(
            analysis=analysis,
            risk=risk,
            opportunity=opportunity,
            recommendations=recommendations,
        )

        context = self._build_context(
            analysis=analysis,
            risk=risk,
            opportunity=opportunity,
        )

        holding_alerts = (
            self._generate_holding_alerts(
                analysis=analysis,
                context=context,
                risk=risk,
                opportunity=opportunity,
            )
        )

        portfolio_alerts = (
            self._generate_portfolio_alerts(
                context=context,
                risk=risk,
                opportunity=opportunity,
                recommendations=recommendations,
            )
        )

        return self._build_result(
            context=context,
            holding_alerts=holding_alerts,
            portfolio_alerts=portfolio_alerts,
            risk=risk,
            opportunity=opportunity,
        )

    # ==========================================================
    # Validation
    # ==========================================================

    @staticmethod
    def _validate_inputs(
        *,
        analysis: PortfolioAnalysis,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
        recommendations: RecommendationEvaluation,
    ) -> None:
        """
        Validate required inputs.
        """

        if not analysis.holdings:
            raise ValueError(
                "PortfolioAnalysis contains no holdings."
            )

        if risk is None:
            raise ValueError(
                "RiskEvaluation cannot be None."
            )

        if opportunity is None:
            raise ValueError(
                "OpportunityEvaluation cannot be None."
            )

        if recommendations is None:
            raise ValueError(
                "RecommendationEvaluation cannot be None."
            )

    # ==========================================================
    # Context
    # ==========================================================

    def _build_context(
        self,
        *,
        analysis: PortfolioAnalysis,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
    ) -> AlertContext:
        """
        Build shared alert context.
        """

        overall_score = (
            risk.overall_score
            + opportunity.overall_score
        ) / 2

        confidence = (
            risk.ai_confidence
            + opportunity.confidence
        ) / 2

        return AlertContext(
            overall_score=round(
                overall_score,
                2,
            ),
            risk_score=risk.overall_score,
            opportunity_score=(
                opportunity.overall_score
            ),
            confidence_score=round(
                confidence,
                2,
            ),
            health_status=(
                opportunity.health_status
            ),
            portfolio_value=(
                analysis.metrics.total_value
            ),
            cash_allocation=(
                analysis.metrics.cash_allocation
            ),
            diversification_score=(
                opportunity.diversification_score
            ),
            concentration_score=(
                risk.concentration_score
            ),
        )

    # ==========================================================
    # Alert Generation
    # ==========================================================

    def _generate_holding_alerts(
        self,
        *,
        analysis: PortfolioAnalysis,
        context: AlertContext,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
    ) -> list[AdviceItem]:
        """
        Implemented in Part 2.
        """
        return []

    def _generate_portfolio_alerts(
        self,
        *,
        context: AlertContext,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
        recommendations: RecommendationEvaluation,
    ) -> list[AdviceItem]:
        """
        Implemented in Part 2.
        """
        return []

    def _build_result(
        self,
        *,
        context: AlertContext,
        holding_alerts: list[AdviceItem],
        portfolio_alerts: list[AdviceItem],
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
    ) -> AlertEvaluation:
        """
        Build the final AlertEvaluation response.

        Steps
        -----
        1. Merge holding and portfolio alerts
        2. Remove duplicates
        3. Sort by priority
        4. Generate summary
        5. Aggregate findings
        6. Compute confidence
        """

        alerts = holding_alerts + portfolio_alerts

        if self._config.alerts.deduplicate_alerts:
            alerts = deduplicate_alerts(alerts)

        alerts = sort_alerts(alerts)

        if len(alerts) > self._config.alerts.maximum_alerts:
            alerts = alerts[: self._config.alerts.maximum_alerts]

        findings = [
            *risk.findings,
            *opportunity.findings,
        ]

        summary = build_summary(alerts)
        confidence = average_confidence(alerts)

        logger.info(
            "alert_generation_completed",
            extra={
                "alerts": len(alerts),
                "critical": summary.critical,
                "high": summary.high,
            },
        )

        return AlertEvaluation(
            overall_score=context.overall_score,
            health_status=context.health_status,
            summary=summary,
            alerts=alerts,
            portfolio_alerts=[],
            findings=findings,
            confidence=confidence,
            generated_at=current_timestamp(),
        )