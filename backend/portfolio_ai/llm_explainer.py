"""
llm_explainer.py

TradeMind Portfolio AI Explanation Engine

The LLM NEVER predicts.

Random Forest
LSTM
FinBERT
Fusion Engine

already produced the portfolio analysis.

The LLM only converts deterministic outputs into
a professional investment report.

Public API
----------

generate_portfolio_report()

This function NEVER raises exceptions.

If the LLM is unavailable, a deterministic fallback
report is returned.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, Optional

try:
    import google.generativeai as genai
    from google.api_core.exceptions import (
        DeadlineExceeded,
        ResourceExhausted,
        ServiceUnavailable,
    )
    _GENAI_AVAILABLE = True
except ImportError:  # pragma: no cover - exercised when the package is absent
    genai = None  # type: ignore[assignment]
    _GENAI_AVAILABLE = False

    class DeadlineExceeded(Exception):
        pass

    class ResourceExhausted(Exception):
        pass

    class ServiceUnavailable(Exception):
        pass

from .models import PortfolioAIReport
from .prompts import build_portfolio_prompt
from backend.utils.logging import redact_sensitive_data

logger = logging.getLogger(__name__)

MODEL_NAME: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")

MAX_TOKENS: int = 600

client: Optional[Any] = None  # google.generativeai.GenerativeModel

if _GENAI_AVAILABLE and API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        client = genai.GenerativeModel(
            model_name=MODEL_NAME,
            generation_config=genai.GenerationConfig(
                temperature=0,
                max_output_tokens=MAX_TOKENS,
                response_mime_type="application/json",
            ),
        )
        logger.info(
            "portfolio_ai.llm_explainer.initialized",
            extra={"model": MODEL_NAME},
        )
    except Exception:
        logger.exception("Portfolio AI initialization failed.")
        client = None
else:
    logger.warning(
        "portfolio_ai.llm_explainer.no_api_key — using deterministic fallback."
    )


# ---------------------------------------------------------
# Availability
# ---------------------------------------------------------

def llm_available() -> bool:
    return client is not None


# ---------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------

def generate_portfolio_report(
    analysis: Dict,
) -> PortfolioAIReport:
    """
    Generate an AI explanation from deterministic analysis.

    Parameters
    ----------
    analysis

        HistoricalAnalysis converted to dictionary.

    Returns
    -------
    PortfolioAIReport
    """

    if not llm_available():
        return _fallback_report(analysis)

    prompt = build_portfolio_prompt(analysis)

    try:
        response = client.generate_content(prompt)

        text = getattr(response, "text", None)
        if not text:
            # Walk candidates as a fallback
            for candidate in getattr(response, "candidates", []):
                for part in getattr(candidate.content, "parts", []):
                    if getattr(part, "text", None):
                        text = part.text
                        break
                if text:
                    break

        if not text:
            raise ValueError("Gemini API returned no text output.")

        text = text.strip()
        logger.info(
            "portfolio_ai.explanation_generated",
            extra={"model": MODEL_NAME, "output_length": len(text)},
        )
        return _parse_response(text)

    except (
        DeadlineExceeded,
        ResourceExhausted,
        ServiceUnavailable,
        ValueError,
        Exception,
    ):
        logger.exception(
            "Portfolio AI explanation failed.",
            extra={"model": MODEL_NAME, "prompt_length": len(prompt)},
        )
        return _fallback_report(analysis)


# ---------------------------------------------------------
# JSON Parser
# ---------------------------------------------------------

def _parse_response(
    content: str,
) -> PortfolioAIReport:

    text = content.strip()

    if text.startswith("```"):
        lines = [
            line
            for line in text.splitlines()
            if not line.startswith("```")
        ]
        text = "\n".join(lines)

    data = json.loads(text)

    return PortfolioAIReport(**data)


# ---------------------------------------------------------
# Deterministic Fallback
# ---------------------------------------------------------

def _fallback_report(
    analysis: Dict,
) -> PortfolioAIReport:
    """
    Used whenever the LLM cannot be reached.

    Uses only deterministic outputs.

    Never invents information.
    """

    recommendation = analysis.get(
        "recommendation",
        "No recommendation available."
    )

    confidence = analysis.get(
        "confidence",
        0,
    )

    trend = analysis.get(
        "trend",
        "Unknown",
    )

    sentiment = analysis.get(
        "sentiment",
        "Unknown",
    )

    return PortfolioAIReport(

        summary=(
            "Portfolio analysis completed using deterministic AI models."
        ),

        strengths=[
            f"Detected market trend: {trend}.",
            f"Overall sentiment: {sentiment}.",
        ],

        risks=[
            "AI explanation service unavailable.",
            "Only deterministic analysis is shown.",
        ],

        recommendations=[
            recommendation,
        ],

        outlook=(
            "Future outlook follows the deterministic prediction generated by TradeMind."
        ),

        confidence_note=(
            f"Model confidence is {confidence}%."
        ),
    )
