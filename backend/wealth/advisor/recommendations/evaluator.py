"""
backend/wealth/advisor/recommendations/evaluator.py

TradeMind Recommendation Evaluator

Thin orchestration layer that delegates all business logic
to RecommendationGenerator.

Responsibilities
----------------
✓ Accept evaluator outputs
✓ Delegate to RecommendationGenerator
✓ Return RecommendationEvaluation

This module intentionally contains NO recommendation logic.
"""

from __future__ import annotations

from backend.wealth.portfolio_analyzer import PortfolioAnalysis

from ..opportunity.models import OpportunityEvaluation
from ..risk.models import RiskEvaluation
from .config import RecommendationConfig
from .generator import RecommendationGenerator
from .models import RecommendationEvaluation


class RecommendationEvaluator:
    """
    Orchestrates portfolio recommendation generation.

    Delegates all business logic to RecommendationGenerator.
    Callers depend only on this class — the generator is an
    internal implementation detail.
    """

    def __init__(
        self,
        config: RecommendationConfig | None = None,
    ) -> None:
        self._generator = RecommendationGenerator(config)

    def evaluate(
        self,
        *,
        analysis: PortfolioAnalysis,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
    ) -> RecommendationEvaluation:
        """
        Generate the final recommendation evaluation.

        Parameters
        ----------
        analysis
            Portfolio analysis — source of truth for holdings.
        risk
            Output from RiskEvaluator.
        opportunity
            Output from OpportunityEvaluator.

        Returns
        -------
        RecommendationEvaluation
        """

        return self._generator.generate(
            analysis=analysis,
            risk=risk,
            opportunity=opportunity,
        )
