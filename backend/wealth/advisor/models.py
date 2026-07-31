"""
advisor/models.py

Pydantic API response models and internal domain objects
used by the Advisor module.

No business logic should exist here.

Layer separation
----------------
Domain objects  — plain dataclasses, never serialised directly.
API models      — Pydantic BaseModel, frozen, used in responses.
"""

from __future__ import annotations

from dataclasses import dataclass

from pydantic import BaseModel, ConfigDict, Field

from .enums import (
    AdviceCategory,
    HealthStatus,
    Priority,
)

# ==========================================================
# Domain Objects
# ==========================================================


@dataclass(slots=True)
class AdvisorFinding:
    """
    Internal domain object produced by an Advisor engine.

    Represents a single finding identified during
    portfolio evaluation.

    This is NOT an API response model.

    AdvisorEngine transforms AdvisorFinding into AdviceItem
    before including it in an AdvisorResponse.
    """

    title: str

    description: str

    priority: Priority


# ==========================================================
# API Response Models
# ==========================================================

class AdviceItem(BaseModel):

    model_config = ConfigDict(
        frozen=True,
    )

    title: str

    description: str

    category: AdviceCategory

    priority: Priority

    confidence: float = Field(
        ge=0,
        le=100,
    )


class ExecutiveSummary(BaseModel):

    model_config = ConfigDict(
        frozen=True,
    )

    headline: str

    overview: str

    portfolio_health: float

    health_status: HealthStatus

    priority: Priority


class AdvisorResponse(BaseModel):

    model_config = ConfigDict(
        frozen=True,
    )

    summary: ExecutiveSummary

    strengths: list[AdviceItem] = Field(
        default_factory=list,
    )

    risks: list[AdviceItem] = Field(
        default_factory=list,
    )

    opportunities: list[AdviceItem] = Field(
        default_factory=list,
    )

    alerts: list[AdviceItem] = Field(
        default_factory=list,
    )

    recommendations: list[AdviceItem] = Field(
        default_factory=list,
    )
