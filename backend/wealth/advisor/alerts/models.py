"""
backend/wealth/advisor/alerts/models.py

TradeMind Alert Models

Domain models shared by the Alert Engine.

Responsibilities
----------------
✓ Alert DTOs
✓ Alert Context
✓ Alert Summary
✓ Alert Evaluation

No business logic belongs in this module.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from ..enums import (
    HealthStatus,
    Priority,
)
from ..models import AdviceItem, AdvisorFinding

# ==========================================================
# Alert Severity
# ==========================================================


class AlertSeverity(str, Enum):
    """
    Severity of an alert.

    Independent from Priority.

    Severity describes portfolio impact,
    while Priority describes urgency.
    """

    INFO = "INFO"

    WARNING = "WARNING"

    HIGH = "HIGH"

    CRITICAL = "CRITICAL"


# ==========================================================
# Alert Context
# ==========================================================


@dataclass(slots=True)
class AlertContext:
    """
    Shared context passed to every alert rule.
    """

    overall_score: float

    risk_score: float

    opportunity_score: float

    confidence_score: float

    health_status: HealthStatus

    portfolio_value: float

    cash_allocation: float

    diversification_score: float

    concentration_score: float


# ==========================================================
# Portfolio Alert
# ==========================================================


@dataclass(slots=True)
class PortfolioAlert:
    """
    Internal structured alert generated
    by the Alert Engine.
    """

    title: str

    description: str

    severity: AlertSeverity

    priority: Priority

    confidence: float

    category: str

    supporting_findings: list[
        AdvisorFinding
    ] = field(
        default_factory=list,
    )


# ==========================================================
# Alert Summary
# ==========================================================


@dataclass(slots=True)
class AlertSummary:
    """
    Aggregate statistics describing
    generated alerts.
    """

    total: int

    critical: int

    high: int

    warning: int

    info: int


# ==========================================================
# Alert Evaluation
# ==========================================================


@dataclass(slots=True)
class AlertEvaluation:
    """
    Final output produced by the
    Alert Engine.
    """

    overall_score: float

    health_status: HealthStatus

    summary: AlertSummary

    alerts: list[AdviceItem]

    portfolio_alerts: list[
        PortfolioAlert
    ]

    findings: list[
        AdvisorFinding
    ]

    confidence: float

    generated_at: str | None = None