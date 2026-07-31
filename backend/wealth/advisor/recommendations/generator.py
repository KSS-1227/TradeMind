"""
backend/wealth/advisor/recommendations/generator.py

TradeMind Recommendation Generator

Synthesizes actionable investment recommendations from
RiskEvaluation and OpportunityEvaluation.

Responsibilities
----------------
✓ Validate inputs
✓ Build RecommendationContext
✓ Build per-holding recommendations via policy chain
✓ Build portfolio-level recommendations
✓ Deduplicate and sort by priority
✓ Build RecommendationSummary and RecommendationEvaluation

Design Rules
------------
This module MUST NOT:
  - Calculate AI scores, risk scores, or opportunity scores
  - Calculate confidence
  - Duplicate analyzer logic

It only synthesises existing DTOs from RiskEvaluator and
OpportunityEvaluator.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import UTC, datetime

from backend.wealth.portfolio_analyzer import (
    HoldingAnalysis,
    PortfolioAnalysis,
)

from ..enums import AdviceCategory, Priority, RecommendationType
from ..models import AdviceItem
from ..opportunity.models import (
    HoldingOpportunitySummary,
    OpportunityEvaluation,
)
from ..risk.models import HoldingRiskSummary, RiskEvaluation
from .config import RecommendationConfig
from .models import (
    AllocationRecommendation,
    HoldingRecommendation,
    RecommendationContext,
    RecommendationEvaluation,
    RecommendationSummary,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Internal type aliases
# ---------------------------------------------------------------------------
_RiskIndex = dict[str, HoldingRiskSummary]
_OpportunityIndex = dict[str, HoldingOpportunitySummary]
_CopyBuilder = Callable[
    [str, float, float, float],
    tuple[str, str, AdviceCategory],
]
_DedupeKey = tuple[AdviceCategory, Priority, str]

# ---------------------------------------------------------------------------
# Module-level constants — defined once, never recomputed
# ---------------------------------------------------------------------------
_PRIORITY_ORDER: dict[Priority, int] = {
    Priority.CRITICAL: 4,
    Priority.HIGH: 3,
    Priority.MEDIUM: 2,
    Priority.LOW: 1,
}
_BUY_CATEGORIES: frozenset[AdviceCategory] = frozenset({AdviceCategory.OPPORTUNITY})
_SELL_CATEGORIES: frozenset[AdviceCategory] = frozenset({AdviceCategory.RISK})
_HOLD_CATEGORIES: frozenset[AdviceCategory] = frozenset({AdviceCategory.PERFORMANCE})
_REBALANCE_CATEGORIES: frozenset[AdviceCategory] = frozenset({AdviceCategory.REBALANCING})
_DIVERSIFY_CATEGORIES: frozenset[AdviceCategory] = frozenset(
    {AdviceCategory.DIVERSIFICATION, AdviceCategory.ALLOCATION}
)


class RecommendationGenerator:
    """Synthesise investment recommendations from pre-computed evaluations.

    Stateless: every ``generate()`` call is fully self-contained.
    Safe to share across threads and trivial to unit-test.
    """

    def __init__(self, config: RecommendationConfig | None = None) -> None:
        self._config = config or RecommendationConfig()
        self._copy_builders: dict[RecommendationType, _CopyBuilder] = {
            RecommendationType.STRONG_BUY:  self._strong_buy_copy,
            RecommendationType.BUY:         self._buy_copy,
            RecommendationType.REBALANCE:   self._rebalance_copy,
            RecommendationType.REDUCE_RISK: self._reduce_risk_copy,
            RecommendationType.SELL:        self._sell_copy,
            RecommendationType.STRONG_SELL: self._strong_sell_copy,
            RecommendationType.MONITOR:     self._monitor_copy,
        }

    # ==========================================================
    # Public API
    # ==========================================================

    def generate(
        self,
        *,
        analysis: PortfolioAnalysis,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
    ) -> RecommendationEvaluation:
        """Generate a complete ``RecommendationEvaluation`` from evaluator outputs."""

        logger.info(
            "recommendation.generation.started",
            extra={
                "portfolio_id": analysis.portfolio_id,
                "holding_count": len(analysis.holdings),
            },
        )

        self._validate_inputs(analysis, risk, opportunity)

        context = self._build_context(analysis, risk, opportunity)
        confidence = round(context.confidence_score, 2)

        risk_index: _RiskIndex = {h.symbol: h for h in risk.holding_summary}
        opp_index: _OpportunityIndex = {h.symbol: h for h in opportunity.holding_summary}

        holding_items, holding_recs = self._generate_holding_recommendations(
            analysis=analysis,
            risk_index=risk_index,
            opp_index=opp_index,
        )
        portfolio_items = self._generate_portfolio_recommendations(
            context=context,
            confidence=confidence,
        )

        merged = self._sort_by_priority(
            self._deduplicate(holding_items + portfolio_items)
        )[: self._config.max_recommendations]

        summary = self._build_summary(merged)

        logger.info(
            "recommendation.generation.completed",
            extra={
                "portfolio_id": analysis.portfolio_id,
                "recommendations_generated": len(merged),
            },
        )

        return RecommendationEvaluation(
            overall_score=context.overall_score,
            recommendation=context.recommendation,
            health_status=context.health_status,
            summary=summary,
            recommendations=merged,
            holding_recommendations=holding_recs,
            allocation_recommendations=self._build_allocation_recommendations(context),
            findings=risk.findings + opportunity.findings,
            confidence=confidence,
            generated_at=datetime.now(tz=UTC).isoformat(),
        )

    # ==========================================================
    # Validation
    # ==========================================================

    @staticmethod
    def _validate_inputs(
        analysis: PortfolioAnalysis,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
    ) -> None:
        """Raise ``ValueError`` if any required input is absent or empty."""

        if not analysis.holdings:
            raise ValueError("PortfolioAnalysis contains no holdings.")
        if risk is None:
            raise ValueError("RiskEvaluation cannot be None.")
        if opportunity is None:
            raise ValueError("OpportunityEvaluation cannot be None.")

    # ==========================================================
    # Context
    # ==========================================================

    def _build_context(
        self,
        analysis: PortfolioAnalysis,
        risk: RiskEvaluation,
        opportunity: OpportunityEvaluation,
    ) -> RecommendationContext:
        """Assemble the shared context consumed by all downstream methods."""

        return RecommendationContext(
            overall_score=round((risk.overall_score + opportunity.overall_score) / 2, 2),
            risk_score=risk.overall_score,
            opportunity_score=opportunity.overall_score,
            confidence_score=round((risk.ai_confidence + opportunity.confidence) / 2, 2),
            health_status=opportunity.health_status,
            recommendation=opportunity.recommendation,
            portfolio_value=analysis.metrics.total_value,
            cash_allocation=analysis.metrics.cash_allocation,
            diversification_score=opportunity.diversification_score,
            concentration_score=risk.concentration_score,
        )

    # ==========================================================
    # Holding-level recommendations
    # ==========================================================

    def _generate_holding_recommendations(
        self,
        *,
        analysis: PortfolioAnalysis,
        risk_index: _RiskIndex,
        opp_index: _OpportunityIndex,
    ) -> tuple[list[AdviceItem], list[HoldingRecommendation]]:
        """Iterate holdings once, producing both AdviceItems and HoldingRecommendations.

        Single pass — no duplication of action resolution logic.
        """

        advice_items: list[AdviceItem] = []
        holding_recs: list[HoldingRecommendation] = []

        for holding in analysis.holdings:
            risk_holding = risk_index.get(holding.symbol)
            opp_holding = opp_index.get(holding.symbol)

            action = self._determine_holding_action(
                holding=holding,
                risk_holding=risk_holding,
                opp_holding=opp_holding,
            )
            if action is None:
                continue

            risk_score = self._risk_score(risk_holding)
            weight = holding.portfolio_weight
            conf = (
                opp_holding.confidence if opp_holding is not None else holding.confidence
            )
            expected = (
                opp_holding.expected_return if opp_holding is not None
                else holding.expected_return
            )
            upside = opp_holding.upside if opp_holding is not None else 0.0
            priority = self._holding_priority(action=action, risk_score=risk_score)

            builder = self._copy_builders.get(action, self._monitor_copy)
            title, description, category = builder(
                holding.symbol, expected, upside, weight
            )

            advice_items.append(
                AdviceItem(
                    title=title,
                    description=description,
                    category=category,
                    priority=priority,
                    confidence=round(conf, 2),
                )
            )
            holding_recs.append(
                HoldingRecommendation(
                    symbol=holding.symbol,
                    action=action,
                    priority=priority,
                    confidence=round(conf, 2),
                    current_weight=weight,
                    target_weight=self._target_weight(action, weight),
                    expected_return=round(expected, 2),
                    reason=description,
                )
            )

        logger.debug(
            "recommendation.holdings.processed",
            extra={"count": len(advice_items)},
        )

        return advice_items, holding_recs

    # ==========================================================
    # Policy chain — action resolvers
    # ==========================================================

    def _determine_holding_action(
        self,
        *,
        holding: HoldingAnalysis,
        risk_holding: HoldingRiskSummary | None,
        opp_holding: HoldingOpportunitySummary | None,
    ) -> RecommendationType | None:
        """Resolve an action via an ordered policy chain.

        Each resolver has single responsibility; first non-None result wins.
        """

        for resolver in (
            self._risk_action,
            self._concentration_action,
            self._ai_action,
            self._opportunity_action,
        ):
            result = resolver(
                holding=holding,
                risk_holding=risk_holding,
                opp_holding=opp_holding,
            )
            if result is not None:
                return result
        return None

    def _risk_action(
        self,
        *,
        holding: HoldingAnalysis,
        risk_holding: HoldingRiskSummary | None,
        opp_holding: HoldingOpportunitySummary | None,
    ) -> RecommendationType | None:
        """Trigger REDUCE_RISK when the holding's risk score is critically high."""

        if self._risk_score(risk_holding) >= self._config.high_risk_threshold:
            return RecommendationType.REDUCE_RISK
        return None

    def _concentration_action(
        self,
        *,
        holding: HoldingAnalysis,
        risk_holding: HoldingRiskSummary | None,
        opp_holding: HoldingOpportunitySummary | None,
    ) -> RecommendationType | None:
        """Trigger REBALANCE when a single holding exceeds the concentration limit."""

        if holding.portfolio_weight >= self._config.single_holding_limit:
            return RecommendationType.REBALANCE
        return None

    def _ai_action(
        self,
        *,
        holding: HoldingAnalysis,
        risk_holding: HoldingRiskSummary | None,
        opp_holding: HoldingOpportunitySummary | None,
    ) -> RecommendationType | None:
        """Propagate BUY / SELL signals from the AI recommendation field."""

        try:
            signal = RecommendationType(
                holding.recommendation.replace(" ", "_").upper()
            )
        except ValueError:
            return None

        if signal in {
            RecommendationType.STRONG_BUY,
            RecommendationType.BUY,
            RecommendationType.SELL,
            RecommendationType.STRONG_SELL,
        }:
            return signal
        return None

    def _opportunity_action(
        self,
        *,
        holding: HoldingAnalysis,
        risk_holding: HoldingRiskSummary | None,
        opp_holding: HoldingOpportunitySummary | None,
    ) -> RecommendationType | None:
        """Derive an action from the opportunity score when no stronger signal fired."""

        score = self._opportunity_score(opp_holding)

        if score >= self._config.strong_buy_threshold:
            return RecommendationType.STRONG_BUY
        if score >= self._config.buy_threshold:
            return RecommendationType.BUY
        if score <= self._config.sell_threshold:
            return RecommendationType.SELL
        if score <= self._config.reduce_threshold:
            return RecommendationType.REDUCE_RISK
        return None

    # ==========================================================
    # Priority resolution
    # ==========================================================

    def _holding_priority(
        self,
        *,
        action: RecommendationType,
        risk_score: float,
    ) -> Priority:
        """Map an action to its ``Priority`` using config thresholds only."""

        match action:
            case RecommendationType.STRONG_SELL | RecommendationType.REDUCE_RISK:
                return Priority.CRITICAL
            case RecommendationType.SELL | RecommendationType.REBALANCE:
                return Priority.HIGH
            case RecommendationType.STRONG_BUY | RecommendationType.BUY:
                return (
                    Priority.HIGH
                    if risk_score < self._config.holding_buy_priority_risk_boundary
                    else Priority.MEDIUM
                )
            case _:
                return Priority.LOW

    # ==========================================================
    # Copy builders — strategy dispatch
    # ==========================================================

    def _strong_buy_copy(
        self, symbol: str, expected: float, upside: float, _weight: float
    ) -> tuple[str, str, AdviceCategory]:
        """Copy for STRONG_BUY actions."""

        return (
            f"Strong Buy: {symbol}",
            (
                f"{symbol} shows exceptional opportunity with "
                f"{expected:.1f}% expected return and {upside:.1f}% price upside."
            ),
            AdviceCategory.OPPORTUNITY,
        )

    @staticmethod
    def _buy_copy(
        symbol: str, expected: float, _upside: float, _weight: float
    ) -> tuple[str, str, AdviceCategory]:
        """Copy for BUY actions."""

        return (
            f"Buy Opportunity: {symbol}",
            (
                f"{symbol} presents a favourable risk/reward profile "
                f"with {expected:.1f}% expected return."
            ),
            AdviceCategory.OPPORTUNITY,
        )

    def _rebalance_copy(
        self, symbol: str, _expected: float, _upside: float, weight: float
    ) -> tuple[str, str, AdviceCategory]:
        """Copy for REBALANCE actions."""

        return (
            f"Rebalance: {symbol}",
            (
                f"{symbol} represents {weight:.1f}% of the portfolio, "
                f"exceeding the {self._config.single_holding_limit:.0f}% "
                f"single-holding limit. Consider trimming."
            ),
            AdviceCategory.REBALANCING,
        )

    @staticmethod
    def _reduce_risk_copy(
        symbol: str, _expected: float, _upside: float, _weight: float
    ) -> tuple[str, str, AdviceCategory]:
        """Copy for REDUCE_RISK actions."""

        return (
            f"Reduce Risk: {symbol}",
            (
                f"{symbol} carries an elevated risk score. "
                "Review position sizing and exit conditions."
            ),
            AdviceCategory.RISK,
        )

    @staticmethod
    def _sell_copy(
        symbol: str, _expected: float, _upside: float, _weight: float
    ) -> tuple[str, str, AdviceCategory]:
        """Copy for SELL actions."""

        return (
            f"Review for Exit: {symbol}",
            (
                f"AI signals a bearish outlook for {symbol}. "
                "Consider reducing or exiting the position."
            ),
            AdviceCategory.RISK,
        )

    @staticmethod
    def _strong_sell_copy(
        symbol: str, _expected: float, _upside: float, _weight: float
    ) -> tuple[str, str, AdviceCategory]:
        """Copy for STRONG_SELL actions."""

        return (
            f"Exit Position: {symbol}",
            (
                f"AI strongly recommends exiting {symbol}. "
                "Risk profile and trend are both deteriorating."
            ),
            AdviceCategory.RISK,
        )

    @staticmethod
    def _monitor_copy(
        symbol: str, _expected: float, _upside: float, _weight: float
    ) -> tuple[str, str, AdviceCategory]:
        """Copy for MONITOR and unrecognised actions."""

        return (
            f"Monitor: {symbol}",
            (
                f"{symbol} has limited near-term upside. "
                "Continue monitoring before committing additional capital."
            ),
            AdviceCategory.PERFORMANCE,
        )

    # ==========================================================
    # Portfolio-level recommendations
    # ==========================================================

    def _generate_portfolio_recommendations(
        self,
        *,
        context: RecommendationContext,
        confidence: float,
    ) -> list[AdviceItem]:
        """Produce portfolio-wide structural ``AdviceItem`` entries."""

        items: list[AdviceItem] = []

        for builder in (
            self._diversification_recommendation,
            self._rebalancing_recommendation,
            self._cash_allocation_recommendation,
            self._risk_reduction_recommendation,
        ):
            item = builder(context=context, confidence=confidence)
            if item is not None:
                items.append(item)

        logger.debug(
            "recommendation.portfolio.processed",
            extra={"count": len(items)},
        )
        return items

    def _diversification_recommendation(
        self, *, context: RecommendationContext, confidence: float
    ) -> AdviceItem | None:
        """Recommend diversification when the score is below target."""

        if context.diversification_score >= self._config.diversification_target:
            return None

        gap = round(
            self._config.diversification_target - context.diversification_score, 1
        )
        return self._portfolio_advice(
            title="Improve Portfolio Diversification",
            description=(
                f"Diversification score is {context.diversification_score:.1f}, "
                f"{gap} points below the {self._config.diversification_target:.0f} target. "
                "Consider spreading investments across additional sectors."
            ),
            category=AdviceCategory.DIVERSIFICATION,
            priority=Priority.HIGH,
            confidence=confidence,
        )

    def _rebalancing_recommendation(
        self, *, context: RecommendationContext, confidence: float
    ) -> AdviceItem | None:
        """Recommend rebalancing when concentration exceeds the sector limit."""

        if context.concentration_score < self._config.sector_concentration_limit:
            return None

        return self._portfolio_advice(
            title="Portfolio Rebalancing Required",
            description=(
                f"Concentration score is {context.concentration_score:.1f}, "
                f"exceeding the {self._config.sector_concentration_limit:.0f} limit. "
                "Rebalance to reduce sector concentration risk."
            ),
            category=AdviceCategory.REBALANCING,
            priority=Priority.HIGH,
            confidence=confidence,
        )

    def _cash_allocation_recommendation(
        self, *, context: RecommendationContext, confidence: float
    ) -> AdviceItem | None:
        """Recommend adjusting cash when it falls outside the preferred band."""

        cash = context.cash_allocation
        min_cash = self._config.minimum_cash_percentage
        max_cash = self._config.maximum_cash_percentage

        if min_cash <= cash <= max_cash:
            return None

        if cash < min_cash:
            return self._portfolio_advice(
                title="Increase Cash Reserves",
                description=(
                    f"Cash allocation is {cash:.1f}%, below the minimum of "
                    f"{min_cash:.0f}%. Consider raising cash to improve liquidity."
                ),
                category=AdviceCategory.ALLOCATION,
                priority=Priority.MEDIUM,
                confidence=confidence,
            )

        return self._portfolio_advice(
            title="Deploy Excess Cash",
            description=(
                f"Cash allocation is {cash:.1f}%, above the maximum of "
                f"{max_cash:.0f}%. Consider deploying excess cash into quality opportunities."
            ),
            category=AdviceCategory.ALLOCATION,
            priority=Priority.LOW,
            confidence=confidence,
        )

    def _risk_reduction_recommendation(
        self, *, context: RecommendationContext, confidence: float
    ) -> AdviceItem | None:
        """Recommend risk reduction when the portfolio risk score is high."""

        if context.risk_score < self._config.high_risk_threshold:
            return None

        return self._portfolio_advice(
            title="Reduce Overall Portfolio Risk",
            description=(
                f"Portfolio risk score is {context.risk_score:.1f}, above the "
                f"high-risk threshold of {self._config.high_risk_threshold:.0f}. "
                "Consider reducing exposure to high-risk holdings."
            ),
            category=AdviceCategory.RISK,
            priority=Priority.HIGH,
            confidence=confidence,
        )

    @staticmethod
    def _portfolio_advice(
        *,
        title: str,
        description: str,
        category: AdviceCategory,
        priority: Priority,
        confidence: float,
    ) -> AdviceItem:
        """Construct a single portfolio-level ``AdviceItem``."""

        return AdviceItem(
            title=title,
            description=description,
            category=category,
            priority=priority,
            confidence=confidence,
        )

    # ==========================================================
    # Allocation recommendations
    # ==========================================================

    def _build_allocation_recommendations(
        self,
        context: RecommendationContext,
    ) -> list[AllocationRecommendation]:
        """Build allocation-level recommendations from context data."""

        results: list[AllocationRecommendation] = []
        cash = context.cash_allocation

        if cash < self._config.minimum_cash_percentage:
            results.append(
                AllocationRecommendation(
                    asset_class="Cash",
                    current_allocation=cash,
                    target_allocation=self._config.preferred_cash_percentage,
                    change_percentage=round(
                        self._config.preferred_cash_percentage - cash, 2
                    ),
                    reason=(
                        "Increase cash buffer to maintain liquidity "
                        "and flexibility for market opportunities."
                    ),
                    priority=Priority.MEDIUM,
                )
            )

        if context.concentration_score >= self._config.sector_concentration_limit:
            results.append(
                AllocationRecommendation(
                    asset_class="Equity (Diversified)",
                    current_allocation=round(100.0 - cash, 2),
                    target_allocation=round(
                        100.0 - self._config.preferred_cash_percentage, 2
                    ),
                    change_percentage=round(
                        context.concentration_score
                        - self._config.sector_concentration_limit,
                        2,
                    ),
                    reason=(
                        "Redistribute concentrated sector exposure "
                        "across a broader set of industries."
                    ),
                    priority=Priority.HIGH,
                )
            )

        return results

    # ==========================================================
    # Small accessor helpers
    # ==========================================================

    @staticmethod
    def _risk_score(risk_holding: HoldingRiskSummary | None) -> float:
        """Return the holding's risk score, or 0.0 if unavailable."""

        return risk_holding.score if risk_holding is not None else 0.0

    @staticmethod
    def _opportunity_score(opp_holding: HoldingOpportunitySummary | None) -> float:
        """Return the holding's opportunity score, or 0.0 if unavailable."""

        return opp_holding.score if opp_holding is not None else 0.0

    @staticmethod
    def _target_weight(action: RecommendationType, current: float) -> float:
        """Suggest a target weight based on the recommended action."""

        match action:
            case RecommendationType.STRONG_BUY:
                return min(current * 1.5, 25.0)
            case RecommendationType.BUY:
                return min(current * 1.2, 20.0)
            case RecommendationType.SELL | RecommendationType.STRONG_SELL:
                return 0.0
            case RecommendationType.REDUCE_RISK | RecommendationType.REBALANCE:
                return max(current * 0.7, 5.0)
            case _:
                return current

    # ==========================================================
    # Post-processing
    # ==========================================================

    @staticmethod
    def _deduplicate(items: list[AdviceItem]) -> list[AdviceItem]:
        """Remove duplicates using composite identity (category, priority, title).

        Insertion order is preserved; first occurrence wins.
        """

        seen: set[_DedupeKey] = set()
        unique: list[AdviceItem] = []

        for item in items:
            key: _DedupeKey = (item.category, item.priority, item.title)
            if key in seen:
                continue
            seen.add(key)
            unique.append(item)

        return unique

    @staticmethod
    def _sort_by_priority(items: list[AdviceItem]) -> list[AdviceItem]:
        """Sort items highest-priority first."""

        return sorted(
            items,
            key=lambda item: _PRIORITY_ORDER.get(item.priority, 0),
            reverse=True,
        )

    # ==========================================================
    # Summary
    # ==========================================================

    @staticmethod
    def _build_summary(recommendations: list[AdviceItem]) -> RecommendationSummary:
        """Tally recommendations into a ``RecommendationSummary``."""

        return RecommendationSummary(
            total=len(recommendations),
            buy_count=sum(1 for r in recommendations if r.category in _BUY_CATEGORIES),
            sell_count=sum(1 for r in recommendations if r.category in _SELL_CATEGORIES),
            hold_count=sum(1 for r in recommendations if r.category in _HOLD_CATEGORIES),
            rebalance_count=sum(
                1 for r in recommendations if r.category in _REBALANCE_CATEGORIES
            ),
            diversify_count=sum(
                1 for r in recommendations if r.category in _DIVERSIFY_CATEGORIES
            ),
        )
