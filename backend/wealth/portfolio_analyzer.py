"""
portfolio_analyzer.py

TradeMind AI Portfolio Analyzer

This module is the heart of the Wealth Intelligence layer.

Responsibilities
----------------
✓ Aggregate holdings
✓ Retrieve live market prices
✓ Invoke HistoricalService
✓ Calculate portfolio analytics
✓ Evaluate diversification
✓ Compute portfolio health
✓ Generate AI recommendations

NOTE:
This module NEVER performs:

- ML inference
- Feature engineering
- Model training
- Technical indicator calculations

Those belong to the ML layer.
"""

from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from backend.wealth.historical_service import (
    HistoricalAnalysis,
    HistoricalService,
)

logger = logging.getLogger(__name__)


# ==========================================================
# Repository Interfaces
# ==========================================================

class PortfolioRepository(ABC):
    """
    Repository responsible for loading
    portfolio level information.
    """

    @abstractmethod
    async def get_portfolio(
        self,
        portfolio_id: str,
    ) -> dict[str, Any]:
        ...


class HoldingRepository(ABC):
    """
    Repository responsible for holdings.
    """

    @abstractmethod
    async def get_holdings(
        self,
        portfolio_id: str,
    ) -> list[dict[str, Any]]:
        ...


class TransactionRepository(ABC):
    """
    Optional repository for historical trades.
    """

    @abstractmethod
    async def get_transactions(
        self,
        portfolio_id: str,
    ) -> list[dict[str, Any]]:
        ...


class MarketDataProvider(ABC):
    """
    Live market provider.

    Can wrap

    Yahoo Finance

    Polygon

    AlphaVantage

    NSE

    etc.
    """

    @abstractmethod
    async def get_quote(
        self,
        symbol: str,
    ) -> dict[str, Any]:
        ...


# ==========================================================
# Internal Models
# ==========================================================

@dataclass(slots=True)
class HoldingSnapshot:
    """
    Runtime holding object.

    Not persisted.
    """

    symbol: str

    company_name: str

    sector: str

    quantity: float

    avg_buy_price: float

    invested_amount: float

    current_price: float = 0.0

    market_value: float = 0.0

    pnl: float = 0.0

    pnl_percent: float = 0.0

    weight: float = 0.0

    ai_analysis: HistoricalAnalysis | None = None


# ==========================================================
# Response Models
# ==========================================================

class HoldingAnalysis(BaseModel):

    model_config = ConfigDict(frozen=True)

    symbol: str

    company_name: str

    sector: str

    quantity: float

    invested_amount: float

    current_value: float

    pnl: float

    pnl_percent: float

    portfolio_weight: float

    ai_score: float

    expected_return: float = 0.0

    current_price: float = 0.0

    target_price: float = 0.0

    recommendation: str

    confidence: float

    risk: str


class DiversificationSummary(BaseModel):

    model_config = ConfigDict(frozen=True)

    diversification_score: float

    concentration_score: float

    hhi_index: float

    sectors: dict[str, float]


class PortfolioMetrics(BaseModel):

    model_config = ConfigDict(frozen=True)

    total_value: float

    invested_amount: float

    total_profit: float

    total_return_percent: float

    cash_allocation: float = 0.0


class PortfolioAnalysis(BaseModel):

    model_config = ConfigDict(frozen=True)

    portfolio_id: str

    metrics: PortfolioMetrics

    diversification: DiversificationSummary

    holdings: list[HoldingAnalysis]

    overall_ai_score: float

    overall_risk: str

    portfolio_health: float

    recommendations: list[str] = Field(default_factory=list)


# ==========================================================
# Portfolio Analyzer
# ==========================================================

class PortfolioAnalyzer:
    """
    Core Wealth Intelligence Service.

    Flow

    Portfolio
          ↓
    Holdings
          ↓
    Live Prices
          ↓
    HistoricalService
          ↓
    Analytics
          ↓
    AI Recommendations
    """

    def __init__(
        self,
        portfolio_repository: PortfolioRepository,
        holding_repository: HoldingRepository,
        market_provider: MarketDataProvider,
        historical_service: HistoricalService,
        transaction_repository: TransactionRepository | None = None,
    ) -> None:

        self.portfolio_repository = portfolio_repository

        self.holding_repository = holding_repository

        self.transaction_repository = transaction_repository

        self.market_provider = market_provider

        self.historical_service = historical_service

    # ======================================================
    # Public API
    # ======================================================

    async def analyze_portfolio(
        self,
        portfolio_id: str,
    ) -> PortfolioAnalysis:
        """
        Main orchestration entry point.

        This method intentionally contains
        no business calculations.

        It only coordinates the workflow.
        """

        logger.info(
            "portfolio_analysis_started",
            extra={
                "portfolio_id": portfolio_id,
            },
        )

        await self._load_portfolio(
            portfolio_id,
        )

        holdings = await self._load_holdings(
            portfolio_id,
        )

        if not holdings:

            raise ValueError(
                "Portfolio contains no holdings."
            )

        holdings = await self._prepare_holdings(
            holdings,
        )


        metrics = self._calculate_portfolio_metrics(
            holdings,
        )

        diversification = self._calculate_diversification(
            holdings,
        )

        overall_ai = self._overall_ai_score(
            holdings,
        )

        overall_risk = self._overall_risk(
            holdings,
        )

        health = self._portfolio_health_score(
            metrics,
            diversification,
            overall_ai,
        )

        response = self._build_response(

            portfolio_id=portfolio_id,

            holdings=holdings,

            metrics=metrics,

            diversification=diversification,

            overall_ai=overall_ai,

            overall_risk=overall_risk,

            health=health,

        )

        logger.info(

            "portfolio_analysis_completed",

            extra={

                "portfolio_id": portfolio_id,

                "portfolio_value": metrics.total_value,

                "health": health,

            },

        )

        return response

    # ======================================================
    # Loaders
    # ======================================================

    async def _load_portfolio(
        self,
        portfolio_id: str,
    ) -> dict[str, Any]:

        portfolio = await self.portfolio_repository.get_portfolio(
            portfolio_id,
        )

        if not portfolio:

            raise ValueError(
                f"Portfolio '{portfolio_id}' not found."
            )

        return portfolio

    async def _load_holdings(
        self,
        portfolio_id: str,
    ) -> list[HoldingSnapshot]:

        rows = await self.holding_repository.get_holdings(
            portfolio_id,
        )

        holdings: list[HoldingSnapshot] = []

        for row in rows:

            holdings.append(
                HoldingSnapshot(
                    symbol=row["symbol"],
                    company_name=row["company_name"],
                    sector=row["sector"],
                    quantity=float(row["quantity"]),
                    avg_buy_price=float(row["avg_buy_price"]),
                    invested_amount=float(row["invested_amount"]),
                )
            )

            # ======================================================
    # Live Market Data
    # ======================================================

    async def _enrich_market_data(
        self,
        holdings: list[HoldingSnapshot],
    ) -> None:
        """
        Fetch live quotes concurrently and enrich all holdings.

        This method mutates the HoldingSnapshot instances in-place.
        """

        logger.info(
            "market_data_enrichment_started",
            extra={
                "holdings": len(holdings),
            },
        )

        tasks = [
            self._update_market_snapshot(holding)
            for holding in holdings
        ]

        await asyncio.gather(*tasks)

        logger.info("market_data_enrichment_completed")

    async def _update_market_snapshot(
        self,
        holding: HoldingSnapshot,
    ) -> None:

        try:

            quote = await self.market_provider.get_quote(
                holding.symbol,
            )

            current_price = float(
                quote.get("price", 0.0)
            )

            if current_price <= 0:

                logger.warning(
                    "invalid_market_price",
                    extra={
                        "symbol": holding.symbol,
                    },
                )

                return

            holding.current_price = current_price

            holding.market_value = (
                holding.quantity
                * current_price
            )

            holding.pnl = (
                holding.market_value
                - holding.invested_amount
            )

            if holding.invested_amount > 0:

                holding.pnl_percent = (
                    holding.pnl
                    / holding.invested_amount
                ) * 100

        except Exception:

            logger.exception(
                "market_quote_failed",
                extra={
                    "symbol": holding.symbol,
                },
            )

    # ======================================================
    # AI Intelligence Layer
    # ======================================================

    async def _run_ai_analysis(
        self,
        holdings: list[HoldingSnapshot],
    ) -> None:
        """
        Execute HistoricalService for every holding concurrently.

        HistoricalService itself performs:

        Research

        ↓

        RF

        XGB

        LSTM

        FinBERT

        ↓

        Fusion Engine
        """

        logger.info(
            "ai_analysis_started",
            extra={
                "holdings": len(holdings),
            },
        )

        tasks = [

            self._analyze_single_holding(
                holding,
            )

            for holding in holdings

        ]

        await asyncio.gather(*tasks)

        logger.info(
            "ai_analysis_completed",
        )

    async def _analyze_single_holding(
        self,
        holding: HoldingSnapshot,
    ) -> None:

        try:

            #
            # HistoricalService is synchronous.
            #
            # Run it inside a worker thread so
            # multiple holdings can be analysed
            # simultaneously.
            #

            analysis = await asyncio.to_thread(

                self.historical_service.analyze,

                holding.symbol,

            )

            holding.ai_analysis = analysis

        except Exception:

            logger.exception(

                "holding_ai_failed",

                extra={

                    "symbol": holding.symbol,

                },

            )

    # ======================================================
    # Utility
    # ======================================================

    @staticmethod
    def _total_market_value(
        holdings: list[HoldingSnapshot],
    ) -> float:

        return sum(

            h.market_value

            for h in holdings

        )

    @staticmethod
    def _total_invested_amount(
        holdings: list[HoldingSnapshot],
    ) -> float:

        return sum(

            h.invested_amount

            for h in holdings

        )

    @staticmethod
    def _calculate_weights(
        holdings: list[HoldingSnapshot],
    ) -> None:
        """
        Calculates portfolio weight of every holding.
        """

        total = sum(

            h.market_value

            for h in holdings

        )

        if total <= 0:

            return

        for holding in holdings:

            holding.weight = (

                holding.market_value

                / total

            )

    # ======================================================
    # Orchestration
    # ======================================================

    async def _prepare_holdings(
        self,
        holdings: list[HoldingSnapshot],
    ) -> list[HoldingSnapshot]:
        """
        Complete enrichment pipeline.

        1. Live Quotes
        2. AI Analysis
        3. Portfolio Weights
        """

        await asyncio.gather(

            self._enrich_market_data(
                holdings,
            ),

            self._run_ai_analysis(
                holdings,
            ),

        )

        self._calculate_weights(
            holdings,
        )

        return holdings

    # ======================================================
    # Portfolio Analytics
    # ======================================================

    def _calculate_portfolio_metrics(
        self,
        holdings: list[HoldingSnapshot],
    ) -> PortfolioMetrics:
        """
        Calculate core portfolio metrics.
        """

        invested_amount = self._total_invested_amount(
            holdings,
        )

        market_value = self._total_market_value(
            holdings,
        )

        profit = market_value - invested_amount

        return_percent = (
            (profit / invested_amount) * 100
            if invested_amount > 0
            else 0.0
        )

        return PortfolioMetrics(

            total_value=round(market_value, 2),

            invested_amount=round(invested_amount, 2),

            total_profit=round(profit, 2),

            total_return_percent=round(return_percent, 2),

        )

    # ======================================================
    # Diversification
    # ======================================================

    def _calculate_diversification(
        self,
        holdings: list[HoldingSnapshot],
    ) -> DiversificationSummary:

        total_value = self._total_market_value(
            holdings,
        )

        if total_value <= 0:

            return DiversificationSummary(

                diversification_score=0,

                concentration_score=100,

                hhi_index=10000,

                sectors={},

            )

        sector_totals: dict[str, float] = defaultdict(float)

        for holding in holdings:

            sector_totals[
                holding.sector
            ] += holding.market_value

        sectors = {

            sector: round(
                value / total_value * 100,
                2,
            )

            for sector, value in sector_totals.items()

        }

        #
        # Herfindahl-Hirschman Index
        #

        hhi = sum(

            (value / total_value) ** 2

            for value in sector_totals.values()

        )

        diversification_score = max(

            0.0,

            100 - (hhi * 100),

        )

        concentration_score = min(

            100.0,

            hhi * 100,

        )

        return DiversificationSummary(

            diversification_score=round(

                diversification_score,

                2,

            ),

            concentration_score=round(

                concentration_score,

                2,

            ),

            hhi_index=round(

                hhi * 10000,

                2,

            ),

            sectors=sectors,

        )

    # ======================================================
    # Portfolio AI Score
    # ======================================================

    @staticmethod
    def _overall_ai_score(
        holdings: list[HoldingSnapshot],
    ) -> float:

        scores = [
            h.ai_analysis.overall_score
            for h in holdings
            if h.ai_analysis
        ]

        if not scores:

            return 0.0

        return round(

            sum(scores) / len(scores),

            2,

        )

    @staticmethod
    def _overall_risk(
        holdings: list[HoldingSnapshot],
    ) -> str:

        ranking = {

            "Low": 1,

            "Medium": 2,

            "High": 3,

        }

        risks = [
            ranking.get(h.ai_analysis.overall_risk, 2)
            for h in holdings
            if h.ai_analysis
        ]

        if not risks:

            return "Unknown"

        highest = max(risks)

        reverse = {

            1: "Low",

            2: "Medium",

            3: "High",

        }

        return reverse[highest]

    # ======================================================
    # Portfolio Health
    # ======================================================

    def _portfolio_health_score(
        self,
        metrics: PortfolioMetrics,
        diversification: DiversificationSummary,
        ai_score: float,
    ) -> float:
        """
        Weighted portfolio health score.

        Profitability      -> 40%

        Diversification    -> 30%

        AI Confidence      -> 30%
        """

        profitability = max(

            0,

            min(

                metrics.total_return_percent,

                100,

            ),

        )

        score = (

            profitability * 0.40 +

            diversification.diversification_score * 0.30 +

            ai_score * 0.30

        )

        return round(

            score,

            2,

        )

    # ======================================================
    # Holding Response Builder
    # ======================================================

    def _build_holding_analysis(
        self,
        holdings: list[HoldingSnapshot],
    ) -> list[HoldingAnalysis]:

        response: list[HoldingAnalysis] = []

        for holding in holdings:

            ai = holding.ai_analysis

            response.append(

                HoldingAnalysis(

                    symbol=holding.symbol,

                    company_name=holding.company_name,

                    sector=holding.sector,

                    quantity=holding.quantity,

                    invested_amount=round(

                        holding.invested_amount,

                        2,

                    ),

                    current_value=round(

                        holding.market_value,

                        2,

                    ),

                    pnl=round(

                        holding.pnl,

                        2,

                    ),

                    pnl_percent=round(

                        holding.pnl_percent,

                        2,

                    ),

                    portfolio_weight=round(

                        holding.weight * 100,

                        2,

                    ),

                    ai_score=0.0 if ai is None else ai.overall_score,

                    expected_return=(
                        0.0
                        if ai is None or ai.expected_return is None
                        else ai.expected_return
                    ),

                    current_price=round(
                        holding.current_price,

                        2,

                    ),

                    target_price=round(
                        holding.current_price
                        if ai is None or ai.predicted_price is None
                        else ai.predicted_price,

                        2,

                    ),

                    recommendation="UNKNOWN"

                    if ai is None

                    else ai.recommendation,

                    confidence=0.0

                    if ai is None

                    else ai.confidence,

                    risk="Unknown" if ai is None else ai.overall_risk,

                )

            )

        return response

    # ======================================================
    # Recommendation Engine
    # ======================================================

    def _generate_recommendations(
        self,
        holdings: list[HoldingSnapshot],
        diversification: DiversificationSummary,
        metrics: PortfolioMetrics,
    ) -> list[str]:
        """
        Generate portfolio-level recommendations.
        """

        recommendations: list[str] = []

        # ----------------------------------------------
        # Diversification
        # ----------------------------------------------

        if diversification.diversification_score < 50:

            recommendations.append(
                "Portfolio is highly concentrated. Diversify across additional sectors."
            )

        # ----------------------------------------------
        # Concentrated Holdings
        # ----------------------------------------------

        concentrated = [

            h

            for h in holdings

            if h.weight >= 0.30

        ]

        for holding in concentrated:

            recommendations.append(

                f"{holding.symbol} accounts for "

                f"{holding.weight*100:.1f}% of the portfolio. "

                "Consider reducing concentration risk."

            )

        # ----------------------------------------------
        # AI Recommendations
        # ----------------------------------------------

        for holding in holdings:

            if holding.ai_analysis is None:

                continue

            ai = holding.ai_analysis

            rec = ai.recommendation.upper()

            if rec == "SELL":

                recommendations.append(

                    f"AI recommends reviewing {holding.symbol} "

                    "due to bearish outlook."

                )

            elif rec == "STRONG SELL":

                recommendations.append(

                    f"AI strongly recommends reducing exposure "

                    f"to {holding.symbol}."

                )

            elif rec == "STRONG BUY":

                recommendations.append(

                    f"{holding.symbol} is one of the strongest "

                    "AI-rated opportunities."

                )

        # ----------------------------------------------
        # Portfolio Performance
        # ----------------------------------------------

        if metrics.total_return_percent < -10:

            recommendations.append(

                "Portfolio has experienced significant losses. "

                "Review allocation strategy."

            )

        elif metrics.total_return_percent > 25:

            recommendations.append(

                "Portfolio has generated strong returns. "

                "Consider periodic profit booking."

            )

        # ----------------------------------------------
        # Empty Case
        # ----------------------------------------------

        if not recommendations:

            recommendations.append(

                "Portfolio appears healthy. Continue monitoring."

            )

        return recommendations

    # ======================================================
    # Final Response Builder
    # ======================================================

    def _build_response(
        self,
        portfolio_id: str,
        holdings: list[HoldingSnapshot],
        metrics: PortfolioMetrics,
        diversification: DiversificationSummary,
        overall_ai: float,
        overall_risk: str,
        health: float,
    ) -> PortfolioAnalysis:

        return PortfolioAnalysis(

            portfolio_id=portfolio_id,

            metrics=metrics,

            diversification=diversification,

            holdings=self._build_holding_analysis(

                holdings,

            ),

            overall_ai_score=overall_ai,

            overall_risk=overall_risk,

            portfolio_health=health,

            recommendations=self._generate_recommendations(

                holdings,

                diversification,

                metrics,

            ),

        )
