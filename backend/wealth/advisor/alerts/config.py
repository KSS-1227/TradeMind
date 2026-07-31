"""
backend/wealth/advisor/alerts/config.py

TradeMind Alert Configuration

Centralised configuration for the Alert Engine.

Responsibilities
----------------
✓ Alert thresholds
✓ Portfolio limits
✓ Confidence limits
✓ Alert severity mapping
✓ Validation
✓ Engine limits

No business logic belongs in this module.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .models import AlertSeverity

# ==========================================================
# Threshold Configuration
# ==========================================================


@dataclass(frozen=True, slots=True)
class AlertThresholds:
    """
    Numeric thresholds used by alert rules.
    """

    critical_risk_score: float = 85.0

    high_risk_score: float = 70.0

    low_opportunity_score: float = 35.0

    critical_concentration_score: float = 80.0

    high_concentration_score: float = 65.0

    low_diversification_score: float = 50.0

    low_confidence_score: float = 55.0


# ==========================================================
# Portfolio Limits
# ==========================================================


@dataclass(frozen=True, slots=True)
class PortfolioLimits:
    """
    Portfolio allocation limits.
    """

    minimum_cash_allocation: float = 5.0

    preferred_cash_allocation: float = 10.0

    maximum_cash_allocation: float = 25.0

    single_holding_limit: float = 25.0

    sector_concentration_limit: float = 40.0


# ==========================================================
# Alert Limits
# ==========================================================


@dataclass(frozen=True, slots=True)
class AlertLimits:
    """
    Engine output limits.
    """

    maximum_alerts: int = 20

    maximum_critical_alerts: int = 5

    maximum_high_alerts: int = 8

    deduplicate_alerts: bool = True


# ==========================================================
# Severity Configuration
# ==========================================================


@dataclass(frozen=True, slots=True)
class SeverityConfig:
    """
    Maps numeric scores to alert severity.
    """

    critical: AlertSeverity = AlertSeverity.CRITICAL

    high: AlertSeverity = AlertSeverity.HIGH

    warning: AlertSeverity = AlertSeverity.WARNING

    info: AlertSeverity = AlertSeverity.INFO


# ==========================================================
# Validation
# ==========================================================


@dataclass(frozen=True, slots=True)
class ValidationConfig:
    """
    Validation settings for alert generation.
    """

    minimum_confidence: float = 0.0

    maximum_confidence: float = 100.0

    minimum_score: float = 0.0

    maximum_score: float = 100.0


# ==========================================================
# Root Configuration
# ==========================================================


@dataclass(frozen=True, slots=True)
class AlertConfig:
    """
    Root configuration object consumed by AlertGenerator.

    All configuration for the Alert Engine is centralised here.
    """

    thresholds: AlertThresholds = field(
        default_factory=AlertThresholds,
    )

    limits: PortfolioLimits = field(
        default_factory=PortfolioLimits,
    )

    alerts: AlertLimits = field(
        default_factory=AlertLimits,
    )

    severity: SeverityConfig = field(
        default_factory=SeverityConfig,
    )

    validation: ValidationConfig = field(
        default_factory=ValidationConfig,
    )