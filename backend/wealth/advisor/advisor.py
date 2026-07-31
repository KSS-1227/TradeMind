"""
backend/wealth/advisor/advisor.py

TradeMind Advisor Engine — single authoritative implementation.

Pipeline
--------
PortfolioAnalysis
        │
        ▼
 RiskEvaluator
        │
        ▼
 OpportunityEvaluator
        │
        ▼
 RecommendationEvaluator
        │
        ▼
 AlertEvaluator
        │
        ▼
 SummaryEvaluator
        │
        ▼
 AdvisorResponse

Responsibilities
----------------
✓ Implement AdviceGenerator interface
✓ Coordinate evaluators in order
✓ Map domain objects to API models
✓ Assemble AdvisorResponse

This class MUST NOT perform scoring, analysis, or data loading.
"""

from __future__ import annotations

import logging

from backend.wealth.portfolio_analyzer import PortfolioAnalysis

from .alerts.config import AlertConfig
from .alerts.evaluator import AlertEvaluator
from .alerts.models import AlertEvaluation
from .enums import AdviceCategory, Priority
from .interfaces import AdviceGenerator
from .models import AdviceItem, AdvisorFinding, AdvisorResponse, ExecutiveSummary
from .opportunity.config import OpportunityConfig
from .opportunity.evaluator import OpportunityEvaluator
from .opportunity.models import OpportunityEvaluation
from .recommendations.config import RecommendationConfig
from .recommendations.evaluator import RecommendationEvaluator
from .recommendations.models import RecommendationEvaluation
from .risk.config import RiskConfig
from .risk.evaluator import RiskEvaluator
from .risk.models import RiskEvaluation
from .summary.config import SummaryConfig
from .summary.evaluator import SummaryEvaluator
from .summary.models import SummaryEvaluation

logger = logging.getLogger(__name__)


class AdvisorEngine(AdviceGenerator):
    """Orchestrate the full advisor pipeline and produce an ``AdvisorResponse``.

    Implements the ``AdviceGenerator`` interface so that callers
    (e.g. ``AdvisorService``) depend only on the abstract contract.

    Parameters
    ----------
    risk_config, opportunity_config, recommendation_config,
    alert_config, summary_config:
        Optional per-engine config overrides.  Defaults are used when omitted.
    """

    def __init__(
        self,
        risk_config: RiskConfig | None = None,
        opportunity_config: OpportunityConfig | None = None,
        recommendation_config: RecommendationConfig | None = None,
        alert_config: AlertConfig | None = None,
        summary_config: SummaryConfig | None = None,
    ) -> None:
        self._risk           = RiskEvaluator(risk_config)
        self._opportunity    = OpportunityEvaluator(opportunity_config)
        self._recommendation = RecommendationEvaluator(recommendation_config)
        self._alerts         = AlertEvaluator(alert_config)
        self._summary        = SummaryEvaluator(summary_config)

    # ==========================================================
    # AdviceGenerator interface
    # ==========================================================

    def generate(self, analysis: PortfolioAnalysis) -> AdvisorResponse:
        """Execute the complete advisor pipeline for *analysis*.

        Raises the original exception after logging if any evaluator fails.
        """

        portfolio_id: str = getattr(analysis, "portfolio_id", "unknown")

        logger.info(
            "advisor.generate.started",
            extra={"portfolio_id": portfolio_id},
        )

        try:
            risk            = self._risk.evaluate(analysis)
            opportunity     = self._opportunity.evaluate(analysis)
            recommendations = self._recommendation.evaluate(
                analysis=analysis,
                risk=risk,
                opportunity=opportunity,
            )
            alerts  = self._alerts.evaluate(
                analysis=analysis,
                risk=risk,
                opportunity=opportunity,
                recommendations=recommendations,
            )
            summary = self._summary.evaluate(
                risk=risk,
                opportunity=opportunity,
                recommendations=recommendations,
                alerts=alerts,
            )
            response = self._build_response(
                risk=risk,
                opportunity=opportunity,
                recommendations=recommendations,
                alerts=alerts,
                summary=summary,
            )

        except Exception:
            logger.exception(
                "advisor.generate.failed",
                extra={"portfolio_id": portfolio_id},
            )
            raise

        logger.info(
            "advisor.generate.completed",
            extra={"portfolio_id": portfolio_id},
        )

        return response

    # ==========================================================
    # Response assembly
    # ==========================================================

    def _build_response(
        self,
        *,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
        recommendations: RecommendationEvaluation,
        alerts: AlertEvaluation,
        summary: SummaryEvaluation,
    ) -> AdvisorResponse:
        """Assemble the final ``AdvisorResponse`` from all engine outputs."""

        return AdvisorResponse(
            summary=self._build_executive_summary(risk, summary),
            strengths=self._build_strengths(summary),
            risks=self._build_risks(risk, summary),
            opportunities=self._build_opportunities(opportunity, summary),
            alerts=alerts.alerts,
            recommendations=recommendations.recommendations,
        )

    @staticmethod
    def _build_executive_summary(
        risk: RiskEvaluation,
        summary: SummaryEvaluation,
    ) -> ExecutiveSummary:
        """Map domain summary fields to the ``ExecutiveSummary`` API model."""

        return ExecutiveSummary(
            headline=summary.executive_summary.headline,
            overview=summary.executive_summary.overview,
            portfolio_health=risk.overall_score,
            health_status=risk.health_status,
            priority=summary.executive_summary.priority,
        )

    def _build_strengths(self, summary: SummaryEvaluation) -> list[AdviceItem]:
        """Convert ``ExecutiveSummary.strengths`` (``list[str]``) to ``list[AdviceItem]``."""

        confidence = round(summary.confidence, 2)

        return [
            AdviceItem(
                title="Portfolio Strength",
                description=text,
                category=AdviceCategory.PERFORMANCE,
                priority=summary.executive_summary.priority,
                confidence=confidence,
            )
            for text in summary.executive_summary.strengths
        ]

    def _build_risks(
        self,
        risk: RiskEvaluation,
        summary: SummaryEvaluation,
    ) -> list[AdviceItem]:
        """Produce risk ``AdviceItem`` objects.

        Strategy: use structured findings when available; fall back to
        plain-text summary strings only when findings are empty.
        """

        confidence = round(risk.ai_confidence, 2)
        items = self._findings_to_items(risk.findings, AdviceCategory.RISK, confidence)

        if not items:
            items = [
                AdviceItem(
                    title="Risk Factor",
                    description=text,
                    category=AdviceCategory.RISK,
                    priority=Priority.MEDIUM,
                    confidence=confidence,
                )
                for text in summary.executive_summary.risks
            ]

        return items

    def _build_opportunities(
        self,
        opportunity: OpportunityEvaluation,
        summary: SummaryEvaluation,
    ) -> list[AdviceItem]:
        """Produce opportunity ``AdviceItem`` objects using the same fallback strategy."""

        confidence = round(opportunity.confidence, 2)
        items = self._findings_to_items(
            opportunity.findings, AdviceCategory.OPPORTUNITY, confidence
        )

        if not items:
            items = [
                AdviceItem(
                    title="Opportunity",
                    description=text,
                    category=AdviceCategory.OPPORTUNITY,
                    priority=Priority.LOW,
                    confidence=confidence,
                )
                for text in summary.executive_summary.opportunities
            ]

        return items

    @staticmethod
    def _findings_to_items(
        findings: list[AdvisorFinding],
        category: AdviceCategory,
        confidence: float,
    ) -> list[AdviceItem]:
        """Convert ``list[AdvisorFinding]`` → ``list[AdviceItem]``."""

        return [
            AdviceItem(
                title=finding.title,
                description=finding.description,
                category=category,
                priority=finding.priority,
                confidence=confidence,
            )
            for finding in findings
        ]
