"""
backend/wealth/advisor/summary/generator.py

Summary Generator.

Aggregates the outputs from the Risk, Opportunity,
Recommendation, and Alert engines into a structured
executive summary.
"""

from __future__ import annotations

from ..alerts.models import AlertEvaluation
from ..opportunity.models import OpportunityEvaluation
from ..recommendations.models import RecommendationEvaluation
from ..risk.models import RiskEvaluation
from .config import SummaryConfig
from .helpers import (
    build_headline,
    build_overview,
    calculate_confidence,
    calculate_overall_score,
    clamp_confidence,
    clamp_score,
    current_timestamp,
    determine_priority,
    extract_next_actions,
    extract_opportunities,
    extract_risks,
    extract_strengths,
    merge_findings,
)
from .models import (
    ExecutiveSummary,
    SummaryContext,
    SummaryEvaluation,
)


class SummaryGenerator:
    """
    Generates the final executive summary by
    aggregating outputs from all advisor engines.
    """

    def __init__(
        self,
        config: SummaryConfig | None = None,
    ) -> None:
        self._config = config or SummaryConfig()

    def generate(
        self,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
        recommendations: RecommendationEvaluation,
        alerts: AlertEvaluation,
    ) -> SummaryEvaluation:
        """
        Generate the executive summary.
        """

        context = self._build_context(
            risk,
            opportunity,
            recommendations,
            alerts,
        )

        findings = merge_findings(
            risk.findings,
            opportunity.findings,
            recommendations.findings,
            alerts.findings,
            max_findings=self._config.limits.max_findings,
        )

        summary = ExecutiveSummary(
            headline=build_headline(
                context.overall_score,
                self._config,
            ),
            overview=build_overview(
                context.overall_score,
                context.risk_score,
                context.opportunity_score,
                len(alerts.alerts),
            ),
            priority=determine_priority(
                context.overall_score,
                self._config,
            ),
            strengths=extract_strengths(
                findings,
                limit=self._config.limits.max_strengths,
            ),
            risks=extract_risks(
                findings,
                limit=self._config.limits.max_risks,
            ),
            opportunities=extract_opportunities(
                findings,
                limit=self._config.limits.max_opportunities,
            ),
            next_actions=extract_next_actions(
                findings,
                limit=self._config.limits.max_next_actions,
            ),
        )

        return SummaryEvaluation(
            overall_score=context.overall_score,
            executive_summary=summary,
            findings=findings,
            confidence=context.confidence,
            generated_at=current_timestamp(),
        )

    def _build_context(
        self,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
        recommendations: RecommendationEvaluation,
        alerts: AlertEvaluation,
    ) -> SummaryContext:
        """
        Build the shared summary context.
        """

        overall_score = calculate_overall_score(
            risk.overall_score,
            opportunity.overall_score,
            recommendations.overall_score,
        )

        confidence = calculate_confidence(
            (
                risk.ai_confidence,
                opportunity.confidence,
                recommendations.confidence,
                alerts.confidence,
            )
        )

        return SummaryContext(
            overall_score=clamp_score(
                overall_score,
                self._config,
            ),
            portfolio_health=risk.health_status,
            risk_score=risk.overall_score,
            opportunity_score=opportunity.overall_score,
            recommendation_score=recommendations.overall_score,
            alert_score=float(len(alerts.alerts)),
            confidence=clamp_confidence(
                confidence,
                self._config,
            ),
        )