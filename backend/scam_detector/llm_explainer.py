"""
llm_explainer.py

TradeMind AI Explanation Engine

Converts deterministic scam detection results into clear,
human-readable explanations using the Google Gemini API
with structured JSON output.

IMPORTANT — Architecture Contract
----------------------------------
The LLM NEVER decides whether something is a scam.

  Risk Score        ┐
  Classification    │  All produced by deterministic
  Confidence        │  modules in risk_engine.py
  Recommendation    ┘

The LLM only explains those pre-computed findings.

Public API
----------
generate_explanation(...)   — main entry point
llm_available()             — health-check
_fallback_explanation(...)  — deterministic fallback (also used externally)
_parse_json_response(...)   — JSON → AIExplanation validator
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

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

from .models import AIExplanation, ScamEvidence
from .prompts import build_explanation_prompt
from backend.utils.logging import redact_sensitive_data

# ---------------------------------------------------------
# Logging
# ---------------------------------------------------------

logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

MODEL_NAME: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")

MAX_TOKENS: int = 512

# ---------------------------------------------------------
# Client Initialisation (module-level, eager)
# ---------------------------------------------------------

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
            "llm_explainer.initialized",
            extra={"model": MODEL_NAME},
        )
    except Exception:
        logger.exception("llm_explainer.init_failed")
        client = None
else:
    logger.warning(
        "llm_explainer.no_api_key — using deterministic fallback."
    )


# ---------------------------------------------------------
# Public: Availability
# ---------------------------------------------------------


def llm_available() -> bool:
    """Return True when the Gemini client is ready."""
    return client is not None


# ---------------------------------------------------------
# Public: Main Entry Point
# ---------------------------------------------------------


def generate_explanation(
    risk_score: int,
    classification: str,
    confidence: int,
    recommendation_text: str,
    evidence: ScamEvidence,
    available_models: List[str],
) -> AIExplanation:
    """Generate a plain-English explanation of pre-computed scam findings.

    Uses the Gemini API with response_mime_type="application/json" so the
    model is constrained to emit valid JSON. temperature=0 for deterministic,
    reproducible output.

    On any failure (missing key, timeout, rate limit, invalid JSON,
    network error) returns a deterministic fallback. The API never
    fails because of LLM unavailability.

    Parameters
    ----------
    risk_score:
        Final score 0–100 from the fusion engine.
    classification:
        Human label (e.g. "High Risk Scam").
    confidence:
        Confidence percentage from the fusion engine.
    recommendation_text:
        Pre-computed recommendation text.
    evidence:
        Structured dict with keys: red_flags, pump_patterns,
        url_findings, sentiment, sentiment_summary.
    available_models:
        Names of detectors that ran (e.g. ["Rule Engine", "FinBERT"]).

    Returns
    -------
    AIExplanation
    """

    if not llm_available():
        logger.debug("llm_explainer.unavailable — using fallback.")
        return _fallback_explanation(recommendation_text, evidence)

    prompt = build_explanation_prompt(
        risk_score=risk_score,
        classification=classification,
        confidence=confidence,
        recommendation_text=recommendation_text,
        evidence=_evidence_payload(evidence),
        available_models=available_models,
    )

    try:
        raw_text = _call_gemini_api(prompt)
        explanation = _parse_json_response(raw_text)
        logger.info(
            "llm_explainer.success",
            extra={"model": MODEL_NAME, "risk_score": risk_score},
        )
        return explanation

    except ResourceExhausted:
        logger.warning("llm_explainer.rate_limit — falling back.", extra={"model": MODEL_NAME})

    except DeadlineExceeded:
        logger.warning("llm_explainer.timeout — falling back.", extra={"model": MODEL_NAME})

    except ServiceUnavailable:
        logger.warning("llm_explainer.service_unavailable — falling back.", extra={"model": MODEL_NAME})

    except ValueError as exc:
        logger.warning(
            "llm_explainer.parse_error",
            extra={"error": redact_sensitive_data(str(exc)), "model": MODEL_NAME},
        )

    except Exception:
        logger.exception("llm_explainer.unexpected_error — falling back.", extra={"model": MODEL_NAME})

    return _fallback_explanation(recommendation_text, evidence)


# ---------------------------------------------------------
# Private: Gemini API Call
# ---------------------------------------------------------


def _call_gemini_api(prompt: str) -> str:
    """Invoke the Gemini API and return the text response.

    response_mime_type="application/json" is set at client construction
    so the model is constrained to emit valid JSON.

    Raises
    ------
    google.api_core.exceptions.ResourceExhausted — rate limit
    google.api_core.exceptions.DeadlineExceeded  — timeout
    google.api_core.exceptions.ServiceUnavailable — service down
    ValueError — if no text output is found in the response.
    """

    assert client is not None  # guarded by llm_available() before call

    response = client.generate_content(prompt)

    text = getattr(response, "text", None)
    if text:
        return text.strip()

    # Walk candidates as a fallback
    for candidate in getattr(response, "candidates", []):
        for part in getattr(candidate.content, "parts", []):
            if getattr(part, "text", None):
                return part.text.strip()

    raise ValueError("Gemini API returned no text output.")


# ---------------------------------------------------------
# Private: JSON → AIExplanation
# ---------------------------------------------------------


def _parse_json_response(content: str) -> AIExplanation:
    """Parse the model's JSON output into an AIExplanation.

    response_mime_type="application/json" should prevent malformed JSON.
    Fence-stripping and schema validation are retained as a defensive layer.

    Raises
    ------
    ValueError — invalid JSON or schema mismatch.
    """

    text = content.strip()

    # Defensive: strip accidental fences
    if text.startswith("```"):
        lines = [
            line for line in text.splitlines()
            if not line.strip().startswith("```")
        ]
        text = "\n".join(lines).strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Model returned invalid JSON: {exc}") from exc

    try:
        return AIExplanation(**data)
    except Exception as exc:
        raise ValueError(
            f"JSON does not match AIExplanation schema: {exc}"
        ) from exc


# ---------------------------------------------------------
# Private: Deterministic Fallback
# ---------------------------------------------------------


def _fallback_explanation(
    recommendation: str,
    evidence: ScamEvidence,
) -> AIExplanation:
    """Deterministic fallback used whenever the LLM cannot be reached.

    Draws only from pre-computed evidence — no invented content.
    Guarantees the API never fails due to Gemini unavailability.
    """

    reasoning: List[str] = []

    evidence_payload = _evidence_payload(evidence)

    for item in evidence_payload.get("red_flags", []):
        reasoning.append(f"Rule engine flagged: {item}")

    for item in evidence_payload.get("pump_patterns", []):
        reasoning.append(f"Behavioral pattern detected: {item}")

    for item in evidence_payload.get("url_findings", []):
        reasoning.append(f"URL analysis: {item}")

    sentiment_summary = evidence_payload.get("sentiment_summary", "")
    if sentiment_summary:
        reasoning.append(sentiment_summary)

    if not reasoning:
        reasoning.append(
            "No major scam indicators were detected by the available detectors."
        )

    return AIExplanation(
        summary=(
            "This explanation was generated locally — "
            "the AI explanation service was temporarily unavailable."
        ),
        reasoning=reasoning[:5],
        recommendation=recommendation,
    )


def _evidence_payload(evidence: ScamEvidence) -> Dict[str, Any]:
    """Serialize the endpoint's shared evidence model for internal use."""

    dump_method = getattr(evidence, "model_dump", None)
    if dump_method is not None:
        return dump_method()
    return evidence.dict()
