"""
backend/wealth/advisor/opportunity/findings.py

TradeMind Opportunity Finding Generator

Generates explainable opportunity findings from the
results produced by the OpportunityAnalyzer.

Responsibilities
----------------
✓ Growth opportunity findings
✓ Diversification opportunity findings
✓ Confidence findings
✓ Holding opportunity findings

This module intentionally performs NO calculations.
"""

from __future__ import annotations

import logging

from backend.wealth.portfolio_analyzer import PortfolioAnalysis

from ..enums import Priority
from ..models import AdvisorFinding
from .config import OpportunityConfig
from .models import (
    FindingContext,
    HoldingOpportunitySummary,
)

logger = logging.getLogger(__name__)


class OpportunityFindingGenerator:
    """
    Generates explainable opportunity findings.

    Uses the analysis results already computed by the
    OpportunityAnalyzer without performing any scoring.
    """

    def __init__(
        self,
        config: OpportunityConfig | None = None,
    ) -> None:
        self._config = config or OpportunityConfig()

    # ==========================================================
    # Public API
    # ==========================================================

    def generate(
        self,
        *,
        analysis: PortfolioAnalysis,
        context: FindingContext,
        holding_summary: list[HoldingOpportunitySummary],
    ) -> list[AdvisorFinding]:
        """
        Generate all opportunity findings.
        """

        findings: list[AdvisorFinding] = []

        findings.extend(
            self._growth_findings(
                context,
            )
        )

        findings.extend(
            self._diversification_findings(
                context,
            )
        )

        findings.extend(
            self._confidence_findings(
                context,
            )
        )

        findings.extend(
            self._holding_findings(
                holding_summary,
            )
        )

        findings.sort(
            key=lambda finding: finding.priority.value,
            reverse=True,
        )

        logger.info(
            "Generated %d opportunity findings.",
            len(findings),
        )

        return findings[: self._config.max_findings]

    # ==========================================================
    # Growth Findings
    # ==========================================================

    def _growth_findings(
        self,
        context: FindingContext,
    ) -> list[AdvisorFinding]:

        findings: list[AdvisorFinding] = []

        if context.average_expected_return >= 15:

            findings.append(
                AdvisorFinding(
                    title="Strong Portfolio Growth Potential",
                    description=(
                        "The portfolio exhibits strong projected "
                        "long-term growth potential."
                    ),
                    priority=Priority.LOW,
                )
            )

        elif context.average_expected_return < 8:

            findings.append(
                AdvisorFinding(
                    title="Limited Growth Opportunity",
                    description=(
                        "Expected portfolio growth is below the "
                        "desired long-term target."
                    ),
                    priority=Priority.MEDIUM,
                )
            )

        return findings

    # ==========================================================
    # Diversification Findings
    # ==========================================================

    def _diversification_findings(
        self,
        context: FindingContext,
    ) -> list[AdvisorFinding]:

        findings: list[AdvisorFinding] = []

        if (
            context.diversification_score
            < self._config.diversification_target
        ):

            findings.append(
                AdvisorFinding(
                    title="Diversification Opportunity",
                    description=(
                        "Increasing sector or asset diversification "
                        "may improve future performance."
                    ),
                    priority=Priority.MEDIUM,
                )
            )

        return findings

    # ==========================================================
    # Confidence Findings
    # ==========================================================

    def _confidence_findings(
        self,
        context: FindingContext,
    ) -> list[AdvisorFinding]:

        findings: list[AdvisorFinding] = []

        if context.confidence >= 90:

            findings.append(
                AdvisorFinding(
                    title="High AI Confidence",
                    description=(
                        "AI models have high confidence in the "
                        "current opportunity assessment."
                    ),
                    priority=Priority.LOW,
                )
            )

        elif context.confidence < 60:

            findings.append(
                AdvisorFinding(
                    title="Low Prediction Confidence",
                    description=(
                        "Opportunity estimates should be interpreted "
                        "carefully due to limited confidence."
                    ),
                    priority=Priority.HIGH,
                )
            )

        return findings

    # ==========================================================
    # Holding Findings
    # ==========================================================

    def _holding_findings(
        self,
        holdings: list[HoldingOpportunitySummary],
    ) -> list[AdvisorFinding]:

        findings: list[AdvisorFinding] = []

        top_holdings = sorted(
            holdings,
            key=lambda holding: holding.score,
            reverse=True,
        )[:3]

        for holding in top_holdings:

            if holding.score < 70:
                continue

            findings.append(
                AdvisorFinding(
                    title=f"{holding.symbol} Opportunity",
                    description=(
                        f"{holding.symbol} shows strong upside "
                        f"potential with an expected return of "
                        f"{holding.expected_return:.1f}%."
                    ),
                    priority=Priority.LOW,
                )
            )

        return findings
