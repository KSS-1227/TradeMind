"""
probability_service.py

Goal achievement probability estimation.

Version 1
---------
• Rule-based probability scoring
• Historical risk adjustment
• Confidence estimation
• Required SIP estimation

Future Versions
---------------
• Monte Carlo Simulation
• Historical Rolling CAGR
• ML Probability Model
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


# ==========================================================
# MODELS
# ==========================================================


class GoalProbability(BaseModel):

    probability: float

    confidence: str

    required_sip: Optional[float] = None

    projected_shortfall: float = 0

    projected_surplus: float = 0

    recommendation: str


# ==========================================================
# SERVICE
# ==========================================================


class ProbabilityService:

    """
    Estimates probability of reaching a financial goal.

    Current implementation:
        Rule Based

    Future:
        Monte Carlo
        Historical Analysis
        ML Prediction
    """

    @staticmethod
    def estimate(

        goal_amount: Optional[float],

        projected_value: float,

        monthly_sip: float,

        years: int,

        annual_return: float,

        volatility: float = 15.0,

    ) -> GoalProbability:

        # ----------------------------------------------

        if goal_amount is None:

            return GoalProbability(

                probability=0,

                confidence="Not Applicable",

                recommendation="Goal not provided."

            )

        # ----------------------------------------------

        ratio = projected_value / goal_amount

        # ----------------------------------------------
        # Probability Score
        # ----------------------------------------------

        if ratio >= 1.50:

            probability = 99

        elif ratio >= 1.30:

            probability = 96

        elif ratio >= 1.15:

            probability = 90

        elif ratio >= 1:

            probability = 82

        elif ratio >= 0.90:

            probability = 70

        elif ratio >= 0.80:

            probability = 55

        elif ratio >= 0.70:

            probability = 40

        else:

            probability = 20

        # ----------------------------------------------
        # Risk Adjustment
        # ----------------------------------------------

        if volatility > 22:

            probability -= 10

        elif volatility > 18:

            probability -= 5

        probability = max(
            0,
            min(99, probability),
        )

        # ----------------------------------------------
        # Confidence
        # ----------------------------------------------

        if probability >= 90:

            confidence = "Very High"

        elif probability >= 75:

            confidence = "High"

        elif probability >= 60:

            confidence = "Medium"

        elif probability >= 40:

            confidence = "Low"

        else:

            confidence = "Very Low"

        # ----------------------------------------------
        # Gap Analysis
        # ----------------------------------------------

        surplus = max(

            0,

            projected_value - goal_amount,

        )

        shortfall = max(

            0,

            goal_amount - projected_value,

        )

        # ----------------------------------------------
        # SIP Recommendation
        # ----------------------------------------------

        recommended_sip = None

        if shortfall > 0:

            remaining_months = years * 12

            if remaining_months > 0:

                recommended_sip = round(

                    monthly_sip +

                    (shortfall / remaining_months),

                    2,

                )

        # ----------------------------------------------
        # Recommendation
        # ----------------------------------------------

        if probability >= 90:

            recommendation = (

                "Current investment strategy is on track."

            )

        elif probability >= 70:

            recommendation = (

                "Small increase in SIP can improve success probability."

            )

        elif probability >= 50:

            recommendation = (

                "Increase monthly investment or extend investment horizon."

            )

        else:

            recommendation = (

                "Current plan is unlikely to achieve the goal."

            )

        return GoalProbability(

            probability=probability,

            confidence=confidence,

            required_sip=recommended_sip,

            projected_shortfall=round(shortfall, 2),

            projected_surplus=round(surplus, 2),

            recommendation=recommendation,

        )