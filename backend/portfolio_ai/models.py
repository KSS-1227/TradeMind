"""
models.py

Pydantic models for the Portfolio AI Explanation Engine.

Purpose
-------
The Portfolio AI module NEVER performs predictions.

Random Forest, LSTM, FinBERT and Fusion Engine already produce the
portfolio analysis.

This module defines the structured schema used by the LLM to translate
those deterministic outputs into a professional investment report.

No business logic belongs here.
"""

from typing import List

from pydantic import BaseModel, Field


# ---------------------------------------------------------
# AI Report
# ---------------------------------------------------------


class PortfolioAIReport(BaseModel):
    """
    Natural-language explanation generated from deterministic outputs.

    IMPORTANT

    The LLM never changes predictions.

    It only explains the existing analysis.
    """

    summary: str = Field(
        default="",
        description="High-level overview of the portfolio."
    )

    strengths: List[str] = Field(
        default_factory=list,
        description="Positive characteristics identified from deterministic analysis."
    )

    risks: List[str] = Field(
        default_factory=list,
        description="Potential weaknesses or risk factors."
    )

    recommendations: List[str] = Field(
        default_factory=list,
        description="Suggested actions based on deterministic recommendations."
    )

    outlook: str = Field(
        default="",
        description="Plain-English market outlook."
    )

    confidence_note: str = Field(
        default="",
        description="Explanation of confidence and model agreement."
    )