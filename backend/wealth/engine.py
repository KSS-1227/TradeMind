"""
backend/wealth/engine.py

TradeMind AI Wealth Planner Engine

Responsibilities
----------------
1. Deterministic financial calculations
2. Projection orchestration
3. Inflation adjustment
4. Advisor Context Generation
5. Historical Analysis Hook
6. Goal Probability Hook
7. GPT Context Hook

NO OpenAI calls here.
NO database access here.
NO FastAPI code here.
"""

from __future__ import annotations

from datetime import datetime
from dataclasses import dataclass
from typing import Dict, List, Optional

from .schemas import (
    WealthProjectionRequest,
    WealthProjectionResponse,
    ProjectionSummary,
    ProjectionMetadata,
    YearProjection,
)

#################################################################################
# CONFIG
#################################################################################

MAX_INVESTMENT_YEARS = 50
MIN_INVESTMENT_YEARS = 1

MAX_EXPECTED_RETURN = 35
MIN_EXPECTED_RETURN = 1

MONTHS = 12

#################################################################################
# RESULT OBJECTS
#################################################################################


@dataclass
class HistoricalInsights:

    expected_return_low: float = 0

    expected_return_high: float = 0

    volatility: float = 0

    drawdown: float = 0

    sharpe: float = 0

    confidence: float = 0

    regime: str = "Unknown"


@dataclass
class GoalProbability:

    probability: float

    required_sip: Optional[float]

    confidence: str


#################################################################################
# ENGINE
#################################################################################


class WealthEngine:

    """
    Main Wealth Planner Orchestrator
    """

    ###########################################################################

    def project(
        self,
        request: WealthProjectionRequest,
    ) -> WealthProjectionResponse:

        self.validate_inputs(request)

        yearly_breakdown = self.generate_yearly_breakdown(request)

        summary = self.build_summary(
            yearly_breakdown,
            request,
        )

        historical = self.historical_analysis(request)

        probability = self.goal_probability(
            request,
            summary,
            historical,
        )

        advisor_context = self.build_advisor_context(
            request,
            summary,
            historical,
            probability,
        )

        return WealthProjectionResponse(

            summary=summary,

            yearly_breakdown=yearly_breakdown,

            metadata=ProjectionMetadata(

                annual_return=request.annual_return,

                inflation=request.inflation,

                years=request.years,

                generated_at=datetime.utcnow(),

            ),

            historical_analysis=historical.__dict__,

            goal_probability=probability.__dict__,

            advisor_context=advisor_context,

        )

#################################################################################
# VALIDATION
#################################################################################

    def validate_inputs(
        self,
        request: WealthProjectionRequest,
    ):

        if request.monthly_sip < 0:
            raise ValueError("Monthly SIP cannot be negative.")

        if request.lump_sum < 0:
            raise ValueError("Lump Sum cannot be negative.")

        if request.monthly_sip == 0 and request.lump_sum == 0:
            raise ValueError(
                "Either Monthly SIP or Lump Sum is required."
            )

        if request.years < MIN_INVESTMENT_YEARS:
            raise ValueError(
                f"Minimum investment period is {MIN_INVESTMENT_YEARS} year."
            )

        if request.years > MAX_INVESTMENT_YEARS:
            raise ValueError(
                f"Maximum investment period is {MAX_INVESTMENT_YEARS} years."
            )

        if request.annual_return < MIN_EXPECTED_RETURN:
            raise ValueError("Expected return is too low.")

        if request.annual_return > MAX_EXPECTED_RETURN:
            raise ValueError(
                "Expected annual return looks unrealistic."
            )

        if request.inflation < 0:
            raise ValueError("Inflation cannot be negative.")

#################################################################################
# CORE CALCULATIONS
#################################################################################

    def monthly_rate(
        self,
        annual_return: float,
    ):

        return annual_return / 12 / 100


    def yearly_rate(
        self,
        annual_return: float,
    ):

        return annual_return / 100


    def inflation_factor(
        self,
        inflation,
        years,
    ):

        return (1 + inflation / 100) ** years
    ####################################################################################
# YEARLY PROJECTION
####################################################################################

    def generate_yearly_breakdown(
        self,
        request: WealthProjectionRequest,
    ) -> list[YearProjection]:

        corpus = float(request.lump_sum)

        invested = float(request.lump_sum)

        monthly_rate = self.monthly_rate(
            request.annual_return
        )

        yearly_projection: list[YearProjection] = []

        for year in range(1, request.years + 1):

            opening_balance = corpus

            yearly_contribution = 0.0

            yearly_interest = 0.0

            for _ in range(12):

                corpus_before = corpus

                corpus *= (1 + monthly_rate)

                interest = corpus - corpus_before

                yearly_interest += interest

                corpus += request.monthly_sip

                invested += request.monthly_sip

                yearly_contribution += request.monthly_sip

            gain = corpus - invested

            yearly_projection.append(

                YearProjection(

                    year=year,

                    opening_balance=round(opening_balance, 2),

                    yearly_contribution=round(
                        yearly_contribution,
                        2,
                    ),

                    yearly_interest=round(
                        yearly_interest,
                        2,
                    ),

                    invested=round(
                        invested,
                        2,
                    ),

                    corpus=round(
                        corpus,
                        2,
                    ),

                    gain=round(
                        gain,
                        2,
                    ),
                )
            )

        return yearly_projection

####################################################################################
# SUMMARY
####################################################################################

    def build_summary(

        self,

        breakdown,

        request,

    ) -> ProjectionSummary:

        last = breakdown[-1]

        projected = last.corpus

        invested = last.invested

        gain = projected - invested

        inflation_adjusted = projected / self.inflation_factor(

            request.inflation,

            request.years,

        )

        real_return = (

            ((1 + request.annual_return / 100)

             /

             (1 + request.inflation / 100))

            - 1

        ) * 100

        wealth_multiple = projected / invested

        return ProjectionSummary(

            invested_amount=round(invested, 2),

            projected_value=round(projected, 2),

            estimated_gain=round(gain, 2),

            inflation_adjusted_value=round(

                inflation_adjusted,

                2,

            ),

            real_return=round(real_return, 2),

            wealth_multiple=round(

                wealth_multiple,

                2,

            ),

        )

####################################################################################
# HISTORICAL HOOK
####################################################################################

    def historical_analysis(

        self,

        request,

    ):

        """
        Phase 2

        Will call

        historical.py

        For now returns placeholder.
        """

        return HistoricalInsights(

            expected_return_low=max(

                request.annual_return - 2,

                0,

            ),

            expected_return_high=

            request.annual_return + 2,

            volatility=16.2,

            drawdown=-28.5,

            sharpe=1.11,

            confidence=0.82,

            regime="Neutral",

        )

####################################################################################
# GOAL PROBABILITY
####################################################################################

    def goal_probability(

        self,

        request,

        summary,

        historical,

    ):

        if request.goal_amount is None:

            return GoalProbability(

                probability=0,

                confidence="Not Applicable",

                required_sip=None,

            )

        projected = summary.projected_value

        goal = request.goal_amount

        ratio = projected / goal

        if ratio >= 1.25:

            probability = 95

        elif ratio >= 1.10:

            probability = 90

        elif ratio >= 1:

            probability = 80

        elif ratio >= 0.85:

            probability = 65

        else:

            probability = 40

        return GoalProbability(

            probability=probability,

            confidence="Medium",

            required_sip=None,

        )

####################################################################################
# GPT CONTEXT
####################################################################################

    def build_advisor_context(

        self,

        request,

        summary,

        historical,

        probability,

    ) -> dict:

        """
        ONLY structured information.

        Never raw historical data.
        """

        return {

            "projection": {

                "invested": summary.invested_amount,

                "projected": summary.projected_value,

                "gain": summary.estimated_gain,

                "real_value":

                summary.inflation_adjusted_value,

            },

            "historical": {

                "expected_range": [

                    historical.expected_return_low,

                    historical.expected_return_high,

                ],

                "volatility":

                historical.volatility,

                "drawdown":

                historical.drawdown,

                "regime":

                historical.regime,

                "confidence":

                historical.confidence,

            },

            "goal": {

                "goal_amount":

                request.goal_amount,

                "probability":

                probability.probability,

            },

            "investor": {

                "monthly_sip":

                request.monthly_sip,

                "lump_sum":

                request.lump_sum,

                "years":

                request.years,

                "expected_return":

                request.annual_return,

                "inflation":

                request.inflation,

            }

        }


engine = WealthEngine()