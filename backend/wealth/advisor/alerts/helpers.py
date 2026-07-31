"""
backend/wealth/advisor/alerts/helpers.py

TradeMind Alert Helpers

Shared helper functions for the Alert Engine.

Responsibilities
----------------
✓ Alert validation
✓ Alert deduplication
✓ Alert sorting
✓ Severity mapping
✓ Summary generation
✓ Confidence normalization
✓ Timestamp generation

Contains no alert generation logic.
"""

from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime

from ..enums import Priority
from ..models import AdviceItem
from .models import (
    AlertSeverity,
    AlertSummary,
)

# ==========================================================
# Validation
# ==========================================================


def validate_confidence(confidence: float) -> float:
    """
    Clamp confidence into the valid range [0, 100].
    """

    return max(0.0, min(100.0, confidence))


# ==========================================================
# Deduplication
# ==========================================================


def deduplicate_alerts(
    alerts: list[AdviceItem],
) -> list[AdviceItem]:
    """
    Remove duplicate alerts while preserving order.

    Alerts are uniquely identified by:
    - category
    - priority
    - title
    """

    seen: set[
        tuple[str, Priority, str]
    ] = set()

    unique: list[AdviceItem] = []

    for alert in alerts:

        key = (
            alert.category.value,
            alert.priority,
            alert.title,
        )

        if key in seen:
            continue

        seen.add(key)
        unique.append(alert)

    return unique


# ==========================================================
# Sorting
# ==========================================================


_PRIORITY_ORDER = {
    Priority.CRITICAL: 4,
    Priority.HIGH: 3,
    Priority.MEDIUM: 2,
    Priority.LOW: 1,
}


def sort_alerts(
    alerts: list[AdviceItem],
) -> list[AdviceItem]:
    """
    Sort alerts by descending priority.
    """

    return sorted(
        alerts,
        key=lambda alert: _PRIORITY_ORDER.get(
            alert.priority,
            0,
        ),
        reverse=True,
    )


# ==========================================================
# Severity Mapping
# ==========================================================


def priority_to_severity(
    priority: Priority,
) -> AlertSeverity:
    """
    Convert Priority into AlertSeverity.
    """

    match priority:

        case Priority.CRITICAL:
            return AlertSeverity.CRITICAL

        case Priority.HIGH:
            return AlertSeverity.HIGH

        case Priority.MEDIUM:
            return AlertSeverity.WARNING

        case _:
            return AlertSeverity.INFO


# ==========================================================
# Summary Builder
# ==========================================================


def build_summary(
    alerts: list[AdviceItem],
) -> AlertSummary:
    """
    Build aggregate alert statistics.
    """

    counter = Counter(
        priority_to_severity(
            alert.priority,
        )
        for alert in alerts
    )

    return AlertSummary(
        total=len(alerts),
        critical=counter.get(
            AlertSeverity.CRITICAL,
            0,
        ),
        high=counter.get(
            AlertSeverity.HIGH,
            0,
        ),
        warning=counter.get(
            AlertSeverity.WARNING,
            0,
        ),
        info=counter.get(
            AlertSeverity.INFO,
            0,
        ),
    )


# ==========================================================
# Confidence
# ==========================================================


def average_confidence(
    alerts: list[AdviceItem],
) -> float:
    """
    Calculate average alert confidence.

    Returns 0 when the collection is empty.
    """

    if not alerts:
        return 0.0

    total = sum(
        alert.confidence
        for alert in alerts
    )

    return round(
        total / len(alerts),
        2,
    )


# ==========================================================
# Timestamp
# ==========================================================


def current_timestamp() -> str:
    """
    Generate an ISO-8601 UTC timestamp.
    """

    return datetime.now(
        tz=UTC,
    ).isoformat()