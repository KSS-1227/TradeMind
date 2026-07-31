"""
backend/wealth/advisor/risk

Portfolio risk evaluation sub-package.

Public API
----------
RiskEvaluator
    Orchestrates the full risk evaluation workflow.
RiskEvaluation
    DTO returned by RiskEvaluator; consumed by AdvisorEngine.
PortfolioRiskSummary
    Aggregated portfolio-wide risk statistics.
HoldingRiskSummary
    Per-holding risk breakdown for a single holding.
"""

from .evaluator import RiskEvaluator
from .models import (
    HoldingRiskSummary,
    PortfolioRiskSummary,
    RiskEvaluation,
)

__all__ = [
    "HoldingRiskSummary",
    "PortfolioRiskSummary",
    "RiskEvaluation",
    "RiskEvaluator",
]
