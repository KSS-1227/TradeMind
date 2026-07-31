"""
backend/wealth/advisor/summary/__init__.py

TradeMind Summary Engine

Public exports for the Summary package.

The Summary package aggregates outputs from the
Risk, Opportunity, Recommendation, and Alert
engines into a single structured executive
summary.

Public API
----------
SummaryEvaluator
    Main entry point for summary generation.

SummaryGenerator
    Core aggregation engine.

SummaryConfig
    Configuration for summary generation.

SummaryEvaluation
    Final summary DTO.

SummaryContext
    Shared context used during summary generation.

ExecutiveSummary
    Structured executive portfolio summary.
"""

from .config import SummaryConfig
from .evaluator import SummaryEvaluator
from .generator import SummaryGenerator
from .models import (
    ExecutiveSummary,
    SummaryContext,
    SummaryEvaluation,
)

__all__ = [
    "ExecutiveSummary",
    "SummaryConfig",
    "SummaryContext",
    "SummaryEvaluation",
    "SummaryEvaluator",
    "SummaryGenerator",
]