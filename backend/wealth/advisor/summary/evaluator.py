"""
backend/wealth/advisor/summary/evaluator.py

Summary Evaluator.

Thin orchestration layer responsible for generating
the final executive summary from the outputs of the
advisor engines.

This class intentionally contains no business logic.
All summary generation is delegated to SummaryGenerator.
"""

from __future__ import annotations

from ..alerts.models import AlertEvaluation
from ..opportunity.models import OpportunityEvaluation
from ..recommendations.models import RecommendationEvaluation
from ..risk.models import RiskEvaluation
from .config import SummaryConfig
from .generator import SummaryGenerator
from .models import SummaryEvaluation


class SummaryEvaluator:
    """
    Public entry point for the Summary engine.

    This evaluator coordinates the SummaryGenerator
    and exposes a stable interface for the Advisor
    engine.
    """

    def __init__(
        self,
        config: SummaryConfig | None = None,
    ) -> None:
        self._generator = SummaryGenerator(config)

    def evaluate(
        self,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
        recommendations: RecommendationEvaluation,
        alerts: AlertEvaluation,
    ) -> SummaryEvaluation:
        """
        Generate the executive portfolio summary.

        Parameters
        ----------
        risk:
            Output of the Risk engine.

        opportunity:
            Output of the Opportunity engine.

        recommendations:
            Output of the Recommendation engine.

        alerts:
            Output of the Alert engine.

        Returns
        -------
        SummaryEvaluation
            Structured executive summary of the portfolio.
        """

        return self._generator.generate(
            risk=risk,
            opportunity=opportunity,
            recommendations=recommendations,
            alerts=alerts,
        )