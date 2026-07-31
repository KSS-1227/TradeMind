"""
backend/wealth/advisor/alerts/__init__.py

TradeMind Alert Engine

Public exports for the Alert package.

The Alert package is responsible for synthesizing actionable
portfolio alerts from the outputs of the Risk, Opportunity,
and Recommendation engines.

Public API
----------
AlertEvaluator
    Main entry point for generating alerts.

AlertGenerator
    Core rule engine responsible for alert generation.

AlertConfig
    Configuration for alert thresholds and limits.

AlertEvaluation
    Final alert evaluation DTO.

AlertContext
    Shared context used during alert generation.

PortfolioAlert
    Internal portfolio-level alert model.

AlertSummary
    Aggregated alert statistics.

AlertSeverity
    Alert severity enumeration.
"""

from .config import AlertConfig
from .evaluator import AlertEvaluator
from .generator import AlertGenerator
from .models import (
    AlertContext,
    AlertEvaluation,
    AlertSeverity,
    AlertSummary,
    PortfolioAlert,
)

__all__ = [
    "AlertConfig",
    "AlertContext",
    "AlertEvaluation",
    "AlertEvaluator",
    "AlertGenerator",
    "AlertSeverity",
    "AlertSummary",
    "PortfolioAlert",
]