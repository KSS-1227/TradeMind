"""
backend/wealth/advisor/opportunity

Public exports for the Opportunity package.
"""

from .analyzer import OpportunityAnalyzer
from .config import OpportunityConfig
from .evaluator import OpportunityEvaluator
from .findings import OpportunityFindingGenerator
from .models import (
    ConfidenceSummary,
    FindingContext,
    HoldingOpportunitySummary,
    OpportunityComponents,
    OpportunityEvaluation,
)

__all__ = [
    "ConfidenceSummary",
    "FindingContext",
    "HoldingOpportunitySummary",
    "OpportunityAnalyzer",
    "OpportunityComponents",
    "OpportunityConfig",
    "OpportunityEvaluation",
    "OpportunityEvaluator",
    "OpportunityFindingGenerator",
]
