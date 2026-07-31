"""
backend/wealth/advisor/summary/helpers.py

Utility helpers for the Summary engine.

The Summary engine is intentionally lightweight and
contains no investment decision logic. These helpers
aggregate outputs from the advisor engines into a
structured executive summary.
"""

from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime

from ..enums import Priority
from ..models import AdvisorFinding
from .config import SummaryConfig


def clamp_score(
    score: float,
    config: SummaryConfig,
) -> float:
    """
    Clamp a score to the configured range.
    """
    return max(
        config.validation.min_score,
        min(score, config.validation.max_score),
    )


def clamp_confidence(
    confidence: float,
    config: SummaryConfig,
) -> float:
    """
    Clamp confidence to the configured range.
    """
    return max(
        config.validation.min_confidence,
        min(confidence, config.validation.max_confidence),
    )


def calculate_overall_score(
    *scores: float,
) -> float:
    """
    Calculate the arithmetic mean of the supplied scores.
    """

    valid_scores = [score for score in scores if score >= 0.0]

    if not valid_scores:
        return 0.0

    return sum(valid_scores) / len(valid_scores)


def calculate_confidence(
    confidences: Iterable[float],
) -> float:
    """
    Calculate average confidence.
    """

    values = list(confidences)

    if not values:
        return 0.0

    return sum(values) / len(values)


def determine_priority(
    overall_score: float,
    config: SummaryConfig,
) -> Priority:
    """
    Determine overall portfolio priority.
    """

    thresholds = config.thresholds

    if overall_score >= thresholds.excellent_score:
        return Priority.LOW

    if overall_score >= thresholds.good_score:
        return Priority.MEDIUM

    if overall_score >= thresholds.fair_score:
        return Priority.HIGH

    return Priority.CRITICAL


def merge_findings(
    *finding_lists: Iterable[AdvisorFinding],
    max_findings: int,
) -> list[AdvisorFinding]:
    """
    Merge findings while removing duplicates.
    """

    merged: list[AdvisorFinding] = []
    seen: set[tuple[str, str]] = set()

    for findings in finding_lists:
        for finding in findings:
            key = (
                finding.title.strip().lower(),
                finding.description.strip().lower(),
            )

            if key in seen:
                continue

            seen.add(key)
            merged.append(finding)

    priority_order = {
        Priority.CRITICAL: 0,
        Priority.HIGH: 1,
        Priority.MEDIUM: 2,
        Priority.LOW: 3,
    }

    merged.sort(
        key=lambda finding: priority_order.get(
            finding.priority,
            99,
        )
    )

    return merged[:max_findings]


def build_headline(
    overall_score: float,
    config: SummaryConfig,
) -> str:
    """
    Build the executive headline.
    """

    thresholds = config.thresholds

    if overall_score >= thresholds.excellent_score:
        return "Portfolio is performing exceptionally well."

    if overall_score >= thresholds.good_score:
        return "Portfolio is healthy with minor improvements available."

    if overall_score >= thresholds.fair_score:
        return "Portfolio requires attention to improve performance."

    return "Portfolio requires immediate strategic review."


def build_overview(
    overall_score: float,
    risk_score: float,
    opportunity_score: float,
    alert_count: int,
) -> str:
    """
    Build a concise portfolio overview.
    """

    return (
        f"Portfolio health score is {overall_score:.1f}/100. "
        f"Risk score: {risk_score:.1f}. "
        f"Opportunity score: {opportunity_score:.1f}. "
        f"{alert_count} active alert(s) require attention."
    )


def extract_strengths(
    findings: Iterable[AdvisorFinding],
    *,
    limit: int,
) -> list[str]:
    """
    Extract positive findings.
    """

    strengths = [
        finding.title
        for finding in findings
        if finding.priority == Priority.LOW
    ]

    return strengths[:limit]


def extract_risks(
    findings: Iterable[AdvisorFinding],
    *,
    limit: int,
) -> list[str]:
    """
    Extract important risks.
    """

    risks = [
        finding.title
        for finding in findings
        if finding.priority in (
            Priority.CRITICAL,
            Priority.HIGH,
        )
    ]

    return risks[:limit]


def extract_opportunities(
    findings: Iterable[AdvisorFinding],
    *,
    limit: int,
) -> list[str]:
    """
    Extract opportunity-related findings.
    """

    opportunities = [
        finding.title
        for finding in findings
        if "opportun" in finding.title.lower()
    ]

    return opportunities[:limit]


def extract_next_actions(
    findings: Iterable[AdvisorFinding],
    *,
    limit: int,
) -> list[str]:
    """
    Convert findings into recommended actions.
    """

    actions = [
        finding.description
        for finding in findings
    ]

    return actions[:limit]


def current_timestamp() -> str:
    """
    Return an ISO-8601 UTC timestamp.
    """

    return (
        datetime.now(UTC)
        .replace(microsecond=0)
        .isoformat()
    )