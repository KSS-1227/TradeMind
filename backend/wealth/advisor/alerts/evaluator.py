"""
backend/wealth/advisor/alerts/evaluator.py

TradeMind Alert Evaluator

Thin orchestration layer responsible for invoking the
AlertGenerator and returning an AlertEvaluation.

Responsibilities
----------------
✓ Validate orchestration inputs
✓ Delegate alert generation
✓ Keep business logic out of callers

This module intentionally contains NO alert-generation logic.
"""

from __future__ import annotations

from backend.wealth.portfolio_analyzer import PortfolioAnalysis

from ..opportunity.models import OpportunityEvaluation
from ..recommendations.models import RecommendationEvaluation
from ..risk.models import RiskEvaluation
from .config import AlertConfig
from .generator import AlertGenerator
from .models import AlertEvaluation


class AlertEvaluator:
    """
    Orchestrates portfolio alert generation.

    This class is intentionally lightweight and delegates all
    business logic to AlertGenerator.
    """

    def __init__(
        self,
        config: AlertConfig | None = None,
    ) -> None:
        self._generator = AlertGenerator(config)

    def evaluate(
        self,
        *,
        analysis: PortfolioAnalysis,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
        recommendations: RecommendationEvaluation,
    ) -> AlertEvaluation:
        """
        Generate the final alert evaluation.

        Parameters
        ----------
        analysis
            Portfolio analysis.

        risk
            Risk evaluation.

        opportunity
            Opportunity evaluation.

        recommendations
            Recommendation evaluation.

        Returns
        -------
        AlertEvaluation
            Final portfolio alert evaluation.
        """

        return self._generator.generate(
            analysis=analysis,
            risk=risk,
            opportunity=opportunity,
            recommendations=recommendations,
        )