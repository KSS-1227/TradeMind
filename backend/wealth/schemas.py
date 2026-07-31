"""
backend/wealth/schemas.py

Pydantic request/response models for the AI Wealth Planner.
"""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class WealthProjectionRequest(BaseModel):
    monthly_sip: float = Field(..., ge=0)
    lump_sum: float = Field(default=0, ge=0)

    annual_return: float = Field(
        ...,
        gt=0,
        le=40,
        description="Expected annual return (%)"
    )

    inflation: float = Field(
        default=6,
        ge=0,
        le=20
    )

    years: int = Field(
        ...,
        ge=1,
        le=50
    )

    goal_amount: float | None = Field(default=None, ge=0)

    scenario_name: str | None = None

    @field_validator("scenario_name")
    @classmethod
    def clean_name(cls, value):
        if value:
            value = value.strip()
        return value


class YearProjection(BaseModel):
    year: int
    opening_balance: float = 0.0
    yearly_contribution: float = 0.0
    yearly_interest: float = 0.0
    invested: float
    corpus: float
    gain: float


class ProjectionSummary(BaseModel):
    invested_amount: float
    projected_value: float
    estimated_gain: float
    inflation_adjusted_value: float
    real_return: float
    wealth_multiple: float = 0.0


class ProjectionMetadata(BaseModel):
    annual_return: float

    inflation: float

    years: int

    generated_at: datetime


class WealthProjectionResponse(BaseModel):
    summary: ProjectionSummary
    yearly_breakdown: list[YearProjection]
    metadata: ProjectionMetadata
    historical_analysis: dict = Field(default_factory=dict)
    goal_probability: dict = Field(default_factory=dict)
    advisor_context: dict = Field(default_factory=dict)