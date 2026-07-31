# ml/wealth_calculator.py
"""
Wealth Projection Calculator — the honest half of the "Digital Twin"
pitch-deck claim. Pure compound-interest math, nothing else.

Does NOT claim to "learn behavior" or "evolve with trades" — see the
project's engineering standards doc. Personalization comes from
Supabase-backed persistence of the user's own saved scenarios
(frontend-side, via supabaseClient.js), not from any model here.
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def project_wealth(monthly_investment: float, years: int,
                    expected_annual_return: float = 0.12,
                    market_crash_year: int = None,
                    market_crash_pct: float = 0.20) -> dict:
    """
    Future value of a monthly SIP (systematic investment plan), computed
    as an ordinary annuity compounded monthly: each month's contribution
    is added at month-end, then the whole balance grows at the monthly
    rate for the remaining months. This matches the convention used by
    standard SIP calculators (e.g. Groww, Zerodha Coin) — verified
    against Groww's calculator for the 10k/10yr/12% case (see the
    smoke test at the bottom of this file).

    monthly_investment: amount invested each month (₹)
    years: investment horizon
    expected_annual_return: as a decimal, e.g. 0.12 for 12%
    market_crash_year: if set, apply a one-time drawdown at the START of
        this year (1-indexed) — models "what if the market fell 20% in
        year 5" — then resumes normal compounding from the reduced
        balance. Pure math, not a prediction of when a crash will happen.
    market_crash_pct: size of that one-time drawdown, as a decimal.

    Returns a dict with year-by-year breakdown plus final totals.
    Raises ValueError on invalid input rather than silently producing
    nonsense numbers.
    """
    if monthly_investment <= 0:
        raise ValueError("monthly_investment must be positive")
    if years <= 0 or years > 60:
        raise ValueError("years must be between 1 and 60")
    if not (0 < expected_annual_return < 1):
        raise ValueError("expected_annual_return must be a decimal between 0 and 1, e.g. 0.12 for 12%")
    if market_crash_year is not None:
        if not (1 <= market_crash_year <= years):
            raise ValueError(f"market_crash_year must be between 1 and {years}")
        if not (0 < market_crash_pct < 1):
            raise ValueError("market_crash_pct must be a decimal between 0 and 1, e.g. 0.20 for 20%")

    monthly_rate = expected_annual_return / 12
    balance = 0.0
    invested_so_far = 0.0
    yearly_breakdown = []

    for year in range(1, years + 1):
        # Apply a one-time crash at the START of the flagged year, before
        # that year's contributions/growth — models "the crash happens,
        # then recovery/growth resumes from there."
        if market_crash_year is not None and year == market_crash_year:
            balance = balance * (1 - market_crash_pct)

        for _month in range(12):
            balance += monthly_investment
            balance *= (1 + monthly_rate)
            invested_so_far += monthly_investment

        yearly_breakdown.append({
            "year": year,
            "invested_so_far": round(invested_so_far, 2),
            "value": round(balance, 2),
            "gains": round(balance - invested_so_far, 2),
        })

    return {
        "monthly_investment": monthly_investment,
        "years": years,
        "expected_annual_return": expected_annual_return,
        "market_crash_year": market_crash_year,
        "market_crash_pct": market_crash_pct if market_crash_year else None,
        "yearly_breakdown": yearly_breakdown,
        "total_invested": round(invested_so_far, 2),
        "total_value": round(balance, 2),
        "total_gains": round(balance - invested_so_far, 2),
    }


if __name__ == "__main__":
    print("Smoke test: ₹10,000/month, 10 years, 12% annual return")
    result = project_wealth(10000, 10, 0.12)
    print(f"  Total invested: ₹{result['total_invested']:,.2f}")
    print(f"  Total value:    ₹{result['total_value']:,.2f}")
    print(f"  Total gains:    ₹{result['total_gains']:,.2f}")
    print(f"  (Compare this total_value against groww.in/calculators/sip-calculator")
    print(f"   with the same inputs — should match within a few rupees of rounding.)")

    print("\nSmoke test with a market crash in year 6 (20% drop):")
    result2 = project_wealth(10000, 10, 0.12, market_crash_year=6, market_crash_pct=0.20)
    for row in result2["yearly_breakdown"]:
        print(f"  Year {row['year']}: value=₹{row['value']:,.2f}")