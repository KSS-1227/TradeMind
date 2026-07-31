"""
backend/wealth/advisor/risk/evaluator.py

TradeMind Risk Evaluation Orchestrator

This module coordinates the complete portfolio risk evaluation
workflow.

Responsibilities
----------------
✓ Validate PortfolioAnalysis
✓ Compute portfolio risk scores
✓ Determine portfolio health
✓ Generate explainable findings
✓ Produce RiskEvaluation DTO

This module intentionally contains NO mathematical scoring
algorithms. All calculations are delegated to RiskScoringEngine.
"""

from __future__ import annotations

import logging

from backend.wealth.portfolio_analyzer import PortfolioAnalysis

from ..enums import RecommendationType, RiskLevel
from ..models import AdvisorFinding
from .config import RiskConfig
from .findings import RiskFindingGenerator
from .models import (
    FindingContext,
    HoldingRiskSummary,
    PortfolioRiskSummary,
    RiskComponents,
    RiskEvaluation,
)
from .scoring import RiskScoringEngine

logger = logging.getLogger(__name__)


class RiskEvaluator:
    """
    High-level orchestration layer for portfolio
    risk evaluation.

    Coordinates multiple domain services while keeping
    business logic isolated inside dedicated components.

    Workflow

        PortfolioAnalysis
                │
                ▼
        Validation
                │
                ▼
        RiskScoringEngine
                │
                ▼
        RiskFindingGenerator
                │
                ▼
        RiskEvaluation
    """

    def __init__(
        self,
        config: RiskConfig | None = None,
    ) -> None:

        self._config = config or RiskConfig()

        self._scoring = RiskScoringEngine(
            self._config,
        )

        self._finding_generator = (
            RiskFindingGenerator(
                self._config,
            )
        )

    # ==========================================================
    # Public API
    # ==========================================================

    def evaluate(
        self,
        analysis: PortfolioAnalysis,
    ) -> RiskEvaluation:
        """
        Evaluate the overall portfolio risk.

        Parameters
        ----------
        analysis
            PortfolioAnalysis produced by
            PortfolioAnalyzer.

        Returns
        -------
        RiskEvaluation
        """

        logger.info(
            "Starting portfolio risk evaluation.",
            extra={
                "portfolio_id": analysis.portfolio_id,
            },
        )

        self._scoring.validate_analysis(
            analysis,
        )

        components = (
            self._scoring.calculate_overall_score(
                analysis,
            )
        )

        risk_level = (
            self._scoring.determine_risk_level(
                components.total_score,
            )
        )

        health_status = (
            self._scoring.determine_health_status(
                analysis.portfolio_health,
            )
        )

        confidence = (
            self._scoring.calculate_confidence_summary(
                analysis.holdings,
            )
        )

        portfolio_summary = (
            self._scoring.calculate_holding_summary(
                analysis.holdings,
            )
        )

        holding_summary = (
            self._scoring.calculate_per_holding_summaries(
                analysis.holdings,
            )
        )

        recommendation = (
            self._determine_recommendation(
                risk_level,
            )
        )

        context = FindingContext(
            overall_score=components.total_score,
            portfolio_health=analysis.portfolio_health,
            diversification_score=(
                analysis.diversification.diversification_score
            ),
            concentration_score=(
                analysis.diversification.concentration_score
            ),
            ai_confidence=confidence.average,
            risk_level=risk_level,
            health_status=health_status,
            recommendation=recommendation,
        )

        findings = (
            self._finding_generator.generate(
                analysis=analysis,
                context=context,
            )
        )

        result = self._build_result(
            components=components,
            context=context,
            portfolio_summary=portfolio_summary,
            holding_summary=holding_summary,
            findings=findings,
        )

        logger.info(
            "Portfolio risk evaluation completed.",
            extra={
                "portfolio_id": analysis.portfolio_id,
                "risk_score": result.overall_score,
                "risk_level": result.risk_level.value,
                "finding_count": len(result.findings),
            },
        )

        return result

    # ==========================================================
    # Internal Builders
    # ==========================================================

    def _build_result(
        self,
        *,
        components: RiskComponents,
        context: FindingContext,
        portfolio_summary: PortfolioRiskSummary,
        holding_summary: list[HoldingRiskSummary],
        findings: list[AdvisorFinding],
    ) -> RiskEvaluation:
        """Construct the :class:`RiskEvaluation` DTO."""

        return RiskEvaluation(
            overall_score=round(components.total_score, 2),
            risk_level=context.risk_level,
            health_status=context.health_status,
            diversification_score=context.diversification_score,
            concentration_score=context.concentration_score,
            ai_confidence=round(context.ai_confidence, 2),
            recommendation=context.recommendation,
            portfolio_summary=portfolio_summary,
            holding_summary=holding_summary,
            findings=findings,
        )

    def _determine_recommendation(
        self,
        risk_level: RiskLevel,
    ) -> RecommendationType:
        """
        Determine recommendation based
        on portfolio risk level.
        """

        recommendation_map = {
            RiskLevel.LOW: RecommendationType.HOLD,
            RiskLevel.MEDIUM: RecommendationType.MONITOR,
            RiskLevel.HIGH: RecommendationType.REBALANCE,
            RiskLevel.VERY_HIGH: RecommendationType.REDUCE_RISK,
        }

        return recommendation_map.get(
            risk_level,
            RecommendationType.HOLD,
        )
