"""Deterministic commodity unit and INR conversion helpers.

External COMEX quotes are USD per troy ounce.  These helpers convert that
explicit unit into an indicative Indian landed value; they do not claim to be
an MCX settlement or a jeweller's retail quote.
"""

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Union

Number = Union[Decimal, int, float, str]

TROY_OUNCE_GRAMS = Decimal("31.1034768")
GOLD_IMPORT_DUTY_RATE = Decimal("0.06")
GST_RATE = Decimal("0.03")
GRAMS_PER_10_GRAMS = Decimal("10")
GRAMS_PER_KILOGRAM = Decimal("1000")


@dataclass(frozen=True)
class CommodityConversion:
    """Auditable values for a USD/troy-ounce to INR conversion."""

    raw_usd_per_troy_ounce: Decimal
    usd_to_inr: Decimal
    inr_per_gram_before_taxes: Decimal
    inr_per_display_unit: Decimal


def usd_per_troy_ounce_to_indian_landed_price(
    raw_usd_per_troy_ounce: Number,
    usd_to_inr: Number,
    grams_per_display_unit: Number,
    import_duty_rate: Decimal = GOLD_IMPORT_DUTY_RATE,
    gst_rate: Decimal = GST_RATE,
) -> CommodityConversion:
    """Convert USD/troy oz to INR for a declared gram-based display unit.

    Tax is applied once, sequentially: import duty first, then GST.  Decimal
    inputs prevent binary floating-point rounding from leaking into prices.
    """

    raw_price = _decimal(raw_usd_per_troy_ounce)
    exchange_rate = _decimal(usd_to_inr)
    display_grams = _decimal(grams_per_display_unit)

    if raw_price < 0 or exchange_rate <= 0 or display_grams <= 0:
        raise ValueError("Commodity price, FX rate, and display grams must be positive.")

    inr_per_gram = raw_price * exchange_rate / TROY_OUNCE_GRAMS
    tax_multiplier = (Decimal("1") + import_duty_rate) * (Decimal("1") + gst_rate)
    inr_per_display_unit = inr_per_gram * display_grams * tax_multiplier

    return CommodityConversion(
        raw_usd_per_troy_ounce=raw_price,
        usd_to_inr=exchange_rate,
        inr_per_gram_before_taxes=inr_per_gram,
        inr_per_display_unit=inr_per_display_unit,
    )


def rounded_inr(value: Decimal) -> float:
    """Round a Decimal currency value to paise for JSON responses."""

    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _decimal(value: Number) -> Decimal:
    return Decimal(str(value))
