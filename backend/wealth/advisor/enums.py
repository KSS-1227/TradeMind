"""
advisor/enums.py

Shared enumerations used throughout the Advisor module.

All enums inherit from (str, Enum) so values are directly
JSON-serialisable without a custom encoder.

Organisation
------------
1. Signal & recommendation  — RecommendationType, MarketSentiment
2. Risk & portfolio health  — RiskLevel, HealthStatus
3. Advice metadata          — AdviceCategory, Priority

Rules
-----
* This file contains ONLY enumerations.
* Business logic belongs in the service layer.
* Do not import domain models here (would create circular imports).
"""

from __future__ import annotations

from enum import Enum

# ──────────────────────────────────────────────────────────────
# 1. Signal & Recommendation
#    Enums that represent the direction or tone of an AI signal.
# ──────────────────────────────────────────────────────────────


class RecommendationType(str, Enum):
    """Ordered action signal returned by the AI advisor.

    Values progress from most bullish to most bearish, which makes
    range comparisons (e.g. ``signal <= RecommendationType.HOLD``)
    meaningful when the enum is sorted by declaration order.
    """

    STRONG_BUY   = "STRONG_BUY"
    BUY          = "BUY"
    HOLD         = "HOLD"
    MONITOR      = "MONITOR"
    REBALANCE    = "REBALANCE"
    REDUCE_RISK  = "REDUCE_RISK"
    REVIEW       = "REVIEW"
    SELL         = "SELL"
    STRONG_SELL  = "STRONG_SELL"


class MarketSentiment(str, Enum):
    """Broad market-sentiment reading derived from news and technical indicators."""

    BULLISH = "BULLISH"
    NEUTRAL = "NEUTRAL"
    BEARISH = "BEARISH"


# ──────────────────────────────────────────────────────────────
# 2. Risk & Portfolio Health
#    Enums that quantify exposure or overall portfolio condition.
# ──────────────────────────────────────────────────────────────


class RiskLevel(str, Enum):
    """Exposure classification for a position, sector, or full portfolio.

    Ordered from lowest to highest risk to support threshold comparisons.
    """

    LOW       = "LOW"
    MEDIUM    = "MEDIUM"
    HIGH      = "HIGH"
    VERY_HIGH = "VERY_HIGH"


class HealthStatus(str, Enum):
    """Overall portfolio health score bucket.

    Ordered from best to worst so that ``status > HealthStatus.FAIR``
    can be used as a quick deterioration check.
    """

    EXCELLENT = "EXCELLENT"
    GOOD      = "GOOD"
    FAIR      = "FAIR"
    POOR      = "POOR"
    CRITICAL  = "CRITICAL"


# ──────────────────────────────────────────────────────────────
# 3. Advice Metadata
#    Enums that tag and prioritise individual advice items.
# ──────────────────────────────────────────────────────────────


class AdviceCategory(str, Enum):
    """Functional area that an advice item addresses.

    Used to group, filter, and route advice in the UI and downstream
    notification systems.
    """

    RISK            = "RISK"
    DIVERSIFICATION = "DIVERSIFICATION"
    OPPORTUNITY     = "OPPORTUNITY"
    ALLOCATION      = "ALLOCATION"
    PERFORMANCE     = "PERFORMANCE"
    REBALANCING     = "REBALANCING"
    TAX             = "TAX"
    AI              = "AI"


class Priority(str, Enum):
    """Urgency level attached to an advice item.

    Ordered from lowest to highest so that ``priority >= Priority.HIGH``
    can trigger escalation paths without hard-coded string comparisons.
    """

    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"
