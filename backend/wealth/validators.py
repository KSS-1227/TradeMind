"""
validators.py

Central validation layer for TradeMind Wealth Planner.

Responsibilities
----------------
✓ Validate request payload
✓ Detect unrealistic financial assumptions
✓ Generate warnings
✓ Generate advisor flags
✓ Produce a clean ValidationResult object

No FastAPI
No Database
No AI
"""

from __future__ import annotations

from typing import List

from pydantic import BaseModel

from .schemas import WealthProjectionRequest


# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------

MAX_RETURN = 35.0
MIN_RETURN = 1.0

MAX_YEARS = 50
MIN_YEARS = 1

MAX_MONTHLY_SIP = 10_000_000
MAX_LUMP_SUM = 1_000_000_000

MAX_INFLATION = 20


# ---------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------


class ValidationResult(BaseModel):
    valid: bool = True

    warnings: List[str] = []

    errors: List[str] = []

    advisor_flags: List[str] = []


# ---------------------------------------------------------------------
# Validator
# ---------------------------------------------------------------------


class WealthValidator:

    @staticmethod
    def validate(
        request: WealthProjectionRequest,
    ) -> ValidationResult:

        result = ValidationResult()

        WealthValidator._validate_amounts(
            request,
            result,
        )

        WealthValidator._validate_horizon(
            request,
            result,
        )

        WealthValidator._validate_return(
            request,
            result,
        )

        WealthValidator._validate_inflation(
            request,
            result,
        )

        WealthValidator._validate_goal(
            request,
            result,
        )

        WealthValidator._financial_health(
            request,
            result,
        )

        result.valid = len(result.errors) == 0

        return result

    # --------------------------------------------------------------

    @staticmethod
    def _validate_amounts(
        request,
        result,
    ):

        if request.monthly_sip < 0:
            result.errors.append(
                "Monthly SIP cannot be negative."
            )

        if request.lump_sum < 0:
            result.errors.append(
                "Lump Sum cannot be negative."
            )

        if (
            request.monthly_sip == 0
            and request.lump_sum == 0
        ):
            result.errors.append(
                "Provide either Lump Sum or SIP."
            )

        if request.monthly_sip > MAX_MONTHLY_SIP:
            result.warnings.append(
                "Very high SIP amount detected."
            )

        if request.lump_sum > MAX_LUMP_SUM:
            result.warnings.append(
                "Very high Lump Sum detected."
            )

    # --------------------------------------------------------------

    @staticmethod
    def _validate_horizon(
        request,
        result,
    ):

        if request.years < MIN_YEARS:
            result.errors.append(
                "Investment duration too small."
            )

        if request.years > MAX_YEARS:
            result.errors.append(
                "Investment duration too large."
            )

        if request.years < 5:
            result.advisor_flags.append(
                "SHORT_TERM_INVESTOR"
            )

        if request.years >= 20:
            result.advisor_flags.append(
                "LONG_TERM_INVESTOR"
            )

    # --------------------------------------------------------------

    @staticmethod
    def _validate_return(
        request,
        result,
    ):

        r = request.annual_return

        if r < MIN_RETURN:
            result.errors.append(
                "Expected return too low."
            )

        if r > MAX_RETURN:
            result.errors.append(
                "Expected return unrealistic."
            )

        if r > 18:
            result.warnings.append(
                "Aggressive expected return."
            )

        if r < 8:
            result.warnings.append(
                "Conservative return assumption."
            )

    # --------------------------------------------------------------

    @staticmethod
    def _validate_inflation(
        request,
        result,
    ):

        inflation = request.inflation

        if inflation < 0:
            result.errors.append(
                "Inflation cannot be negative."
            )

        if inflation > MAX_INFLATION:
            result.warnings.append(
                "Inflation assumption unusually high."
            )

        if inflation >= request.annual_return:
            result.warnings.append(
                "Inflation exceeds expected return."
            )

    # --------------------------------------------------------------

    @staticmethod
    def _validate_goal(
        request,
        result,
    ):

        if request.goal_amount is None:
            return

        if request.goal_amount <= 0:
            result.errors.append(
                "Goal amount must be positive."
            )

        if request.goal_amount >= 100_000_000:
            result.warnings.append(
                "Extremely ambitious financial goal."
            )

    # --------------------------------------------------------------

    @staticmethod
    def _financial_health(
        request,
        result,
    ):

        monthly = request.monthly_sip

        years = request.years

        if monthly < 1000:
            result.advisor_flags.append(
                "LOW_MONTHLY_DISCIPLINE"
            )

        if monthly >= 25000:
            result.advisor_flags.append(
                "HIGH_SAVINGS_CAPACITY"
            )

        if years >= 15:
            result.advisor_flags.append(
                "COMPOUNDING_ADVANTAGE"
            )

        if (
            request.lump_sum > 0
            and monthly == 0
        ):
            result.advisor_flags.append(
                "LUMP_SUM_STRATEGY"
            )

        if (
            monthly > 0
            and request.lump_sum == 0
        ):
            result.advisor_flags.append(
                "SIP_STRATEGY"
            )

        if (
            monthly > 0
            and request.lump_sum > 0
        ):
            result.advisor_flags.append(
                "HYBRID_STRATEGY"
            )