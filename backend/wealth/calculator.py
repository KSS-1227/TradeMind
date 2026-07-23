"""
Financial calculation utilities for TradeMind Wealth Planner.

Pure deterministic calculations.
No database.
No AI.
No API logic.
"""

from __future__ import annotations

from math import pow


class WealthCalculator:

    @staticmethod
    def monthly_rate(annual_return: float) -> float:
        return annual_return / 12 / 100

    @staticmethod
    def yearly_rate(annual_return: float) -> float:
        return annual_return / 100

    @staticmethod
    def inflation_factor(
        inflation: float,
        years: int,
    ) -> float:
        return pow(1 + inflation / 100, years)

    @staticmethod
    def future_value_lumpsum(
        principal: float,
        annual_return: float,
        years: int,
    ) -> float:

        return principal * pow(
            1 + annual_return / 100,
            years,
        )

    @staticmethod
    def future_value_sip(
        monthly_sip: float,
        annual_return: float,
        years: int,
    ) -> float:

        r = annual_return / 12 / 100
        n = years * 12

        if r == 0:
            return monthly_sip * n

        return monthly_sip * (
            ((1 + r) ** n - 1) / r
        ) * (1 + r)

    @staticmethod
    def total_invested(
        lump_sum: float,
        monthly_sip: float,
        years: int,
    ) -> float:

        return lump_sum + monthly_sip * years * 12

    @staticmethod
    def total_projection(
        lump_sum: float,
        monthly_sip: float,
        annual_return: float,
        years: int,
    ) -> float:

        return (
            WealthCalculator.future_value_lumpsum(
                lump_sum,
                annual_return,
                years,
            )
            +
            WealthCalculator.future_value_sip(
                monthly_sip,
                annual_return,
                years,
            )
        )

    @staticmethod
    def inflation_adjusted_value(
        future_value: float,
        inflation: float,
        years: int,
    ) -> float:

        factor = WealthCalculator.inflation_factor(
            inflation,
            years,
        )

        return future_value / factor

    @staticmethod
    def real_return(
        annual_return: float,
        inflation: float,
    ) -> float:

        return (
            (
                (1 + annual_return / 100)
                /
                (1 + inflation / 100)
            )
            - 1
        ) * 100

    @staticmethod
    def wealth_multiple(
        projected: float,
        invested: float,
    ) -> float:

        if invested == 0:
            return 0

        return projected / invested

    @staticmethod
    def cagr(
        initial: float,
        final: float,
        years: int,
    ) -> float:

        if initial <= 0:
            return 0

        return (
            pow(final / initial, 1 / years) - 1
        ) * 100

    @staticmethod
    def absolute_gain(
        invested: float,
        projected: float,
    ) -> float:

        return projected - invested

    @staticmethod
    def roi(
        invested: float,
        projected: float,
    ) -> float:

        if invested == 0:
            return 0

        return (
            (projected - invested)
            /
            invested
        ) * 100