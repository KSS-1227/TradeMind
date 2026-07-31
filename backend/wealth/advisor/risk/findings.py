"""
backend/wealth/advisor/risk/findings.py

TradeMind Risk Finding Generator

Generates explainable risk findings from the
results produced by the Risk Scoring Engine.

Responsibilities
----------------
✓ Portfolio Risk Findings
✓ Diversification Findings
✓ Concentration Findings
✓ AI Confidence Findings

This module contains NO scoring logic.

It only converts calculated metrics into
human-readable domain findings.
"""

from __future__ import annotations

import logging

from backend.wealth.portfolio_analyzer import PortfolioAnalysis

from ..enums import (
    Priority,
    RiskLevel,
)
from ..models import AdvisorFinding
from .config import RiskConfig
from .models import FindingContext

logger = logging.getLogger(__name__)


class RiskFindingGenerator:
    """
    Generates explainable portfolio
    risk findings.

    Every finding is deterministic.

    The same portfolio always
    produces the same findings.
    """

    def __init__(
        self,
        config: RiskConfig | None = None,
    ) -> None:

        self._config = config or RiskConfig()

    # ==========================================================
    # Public API
    # ==========================================================

    def generate(
        self,
        analysis: PortfolioAnalysis,
        context: FindingContext,
    ) -> list[AdvisorFinding]:
        """
        Generate portfolio findings.
        """

        findings: list[AdvisorFinding] = []

        findings.extend(
            self._risk_level_findings(
                context,
            )
        )

        findings.extend(
            self._diversification_findings(
                analysis,
            )
        )

        findings.extend(
            self._concentration_findings(
                analysis,
            )
        )

        findings.extend(
            self._confidence_findings(
                context,
            )
        )

        findings.extend(
            self._holding_findings(
                analysis,
            )
        )

        logger.info(
            "Generated %s risk findings.",
            len(findings),
        )

        return findings

    # ==========================================================
    # Portfolio Risk
    # ==========================================================

    def _risk_level_findings(
        self,
        context: FindingContext,
    ) -> list[AdvisorFinding]:

        findings: list[AdvisorFinding] = []

        if context.risk_level == RiskLevel.VERY_HIGH:

            findings.append(
                AdvisorFinding(
                    title="Very High Portfolio Risk",
                    description=(
                        "Portfolio exhibits a very high overall "
                        "risk profile and should be reviewed "
                        "immediately."
                    ),
                    priority=Priority.CRITICAL,
                )
            )

        elif context.risk_level == RiskLevel.HIGH:

            findings.append(
                AdvisorFinding(
                    title="High Portfolio Risk",
                    description=(
                        "Portfolio risk is above the acceptable "
                        "range and may require rebalancing."
                    ),
                    priority=Priority.HIGH,
                )
            )

        elif context.risk_level == RiskLevel.MEDIUM:

            findings.append(
                AdvisorFinding(
                    title="Moderate Portfolio Risk",
                    description=(
                        "Portfolio risk is moderate. Continue "
                        "monitoring allocations."
                    ),
                    priority=Priority.MEDIUM,
                )
            )

        else:

            findings.append(
                AdvisorFinding(
                    title="Healthy Risk Profile",
                    description=(
                        "Overall portfolio risk is currently "
                        "within an acceptable range."
                    ),
                    priority=Priority.LOW,
                )
            )

        return findings

    # ==========================================================
    # Diversification
    # ==========================================================

    def _diversification_findings(
        self,
        analysis: PortfolioAnalysis,
    ) -> list[AdvisorFinding]:

        score = analysis.diversification.diversification_score

        if score >= self._config.GOOD_DIVERSIFICATION:
            return []

        return [
            AdvisorFinding(
                title="Low Diversification",
                description=(
                    "Portfolio is concentrated across too few "
                    "assets or sectors."
                ),
                priority=Priority.HIGH,
            )
        ]

    # ==========================================================
    # Concentration
    # ==========================================================

    def _concentration_findings(
        self,
        analysis: PortfolioAnalysis,
    ) -> list[AdvisorFinding]:

        concentration = (
            analysis.diversification.concentration_score
        )

        if concentration < self._config.HIGH_CONCENTRATION:
            return []

        return [
            AdvisorFinding(
                title="High Concentration Risk",
                description=(
                    "One or more holdings represent a large "
                    "percentage of the portfolio."
                ),
                priority=Priority.HIGH,
            )
        ]

    # ==========================================================
    # AI Confidence
    # ==========================================================

    def _confidence_findings(
        self,
        context: FindingContext,
    ) -> list[AdvisorFinding]:

        if context.ai_confidence >= self._config.HIGH_AI_CONFIDENCE:
            return []

        if context.ai_confidence >= self._config.MEDIUM_AI_CONFIDENCE:

            return [
                AdvisorFinding(
                    title="Moderate AI Confidence",
                    description=(
                        "Predictions are reasonably reliable, "
                        "but additional validation is recommended."
                    ),
                    priority=Priority.MEDIUM,
                )
            ]

        return [
            AdvisorFinding(
                title="Low AI Confidence",
                description=(
                    "Prediction confidence is low. "
                    "Review portfolio data quality."
                ),
                priority=Priority.HIGH,
            )
        ]

    # ==========================================================
    # Holdings
    # ==========================================================

    def _holding_findings(
        self,
        analysis: PortfolioAnalysis,
    ) -> list[AdvisorFinding]:

        findings: list[AdvisorFinding] = []

        for holding in analysis.holdings:

            if holding.risk in (
                RiskLevel.HIGH.value,
                RiskLevel.VERY_HIGH.value,
            ):

                findings.append(
                    AdvisorFinding(
                        title=f"{holding.symbol} High Risk",
                        description=(
                            f"{holding.symbol} has an elevated "
                            "risk profile and should be reviewed."
                        ),
                        priority=Priority.MEDIUM,
                    )
                )

        return findings
