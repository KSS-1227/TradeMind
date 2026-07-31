"""
llm_explainer.py

TradeMind AI Explanation Engine

Converts deterministic scam detection results into clear,
human-readable explanations using the OpenAI Responses API
with structured JSON output.

IMPORTANT — Architecture Contract
----------------------------------
The LLM NEVER decides whether something is a scam.

  Risk Score        ┐
  Classification    │  All produced by deterministic
  Confidence        │  modules in risk_engine.py
  Recommendation    ┘

The LLM only explains those pre-computed findings.

Structured Output
-----------------
The SDK's json_schema output format constrains the model to emit
exactly the AIExplanation schema — no markdown fences, no invalid
JSON, no schema drift. The model is guaranteed to return the
correct shape before the response leaves the API.

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

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    OpenAI,
    RateLimitError,
)

from .models import AIExplanation, ScamEvidence
from .prompts import build_explanation_prompt

# ---------------------------------------------------------
# Logging
# ---------------------------------------------------------

logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

MODEL_NAME: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")

TIMEOUT: int = 20
MAX_TOKENS: int = 512

# ---------------------------------------------------------
# JSON Schema for Structured Output
#
# Mirrors AIExplanation exactly. Passed to the Responses API
# so the model is constrained to emit this shape — no
# post-processing or fence-stripping needed.
# ---------------------------------------------------------


def _model_json_schema() -> Dict[str, Any]:
    """Return the Pydantic schema across supported Pydantic versions."""

    schema_method = getattr(AIExplanation, "model_json_schema", None)
    if schema_method is not None:
        return schema_method()
    return AIExplanation.schema()


_AI_EXPLANATION_SCHEMA: Dict[str, Any] = {
    "name": "ai_explanation",
    "strict": True,
    "schema": _model_json_schema(),
}

# ---------------------------------------------------------
# Client Initialisation (module-level, eager)
# ---------------------------------------------------------

client: Optional[OpenAI] = None

if API_KEY:
    try:
        client = OpenAI(api_key=API_KEY, timeout=TIMEOUT)
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
    """Return True when the OpenAI client is ready."""
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

    Uses the Responses API with a strict JSON schema so the model is
    constrained to emit a valid AIExplanation — no markdown, no fences,
    no schema drift.

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
        raw_text = _call_responses_api(prompt)
        explanation = _parse_json_response(raw_text)
        logger.info(
            "llm_explainer.success",
            extra={"model": MODEL_NAME, "risk_score": risk_score},
        )
        return explanation

    except RateLimitError:
        logger.warning("llm_explainer.rate_limit — falling back.")

    except APITimeoutError:
        logger.warning("llm_explainer.timeout — falling back.")

    except APIConnectionError:
        logger.warning("llm_explainer.connection_error — falling back.")

    except APIStatusError as exc:
        logger.warning(
            "llm_explainer.api_status_error",
            extra={"status_code": exc.status_code, "message": str(exc)},
        )

    except ValueError as exc:
        logger.warning(
            "llm_explainer.parse_error",
            extra={"error": str(exc)},
        )

    except Exception:
        logger.exception("llm_explainer.unexpected_error — falling back.")

    return _fallback_explanation(recommendation_text, evidence)


# ---------------------------------------------------------
# Private: Responses API Call with Structured Output
# ---------------------------------------------------------


def _call_responses_api(prompt: str) -> str:
    """Invoke the Responses API with a strict JSON schema.

    The ``text`` parameter enforces the AIExplanation schema at the
    model level — the SDK rejects any response that doesn't match
    before it reaches this code. temperature=0 for deterministic,
    reproducible output. No streaming.

    Raises
    ------
    openai.APIStatusError, RateLimitError, APITimeoutError,
    APIConnectionError — propagated to generate_explanation().
    ValueError — if no text output is found in the response.
    """

    assert client is not None  # guarded by llm_available() before call

    response = client.responses.create(
        model=MODEL_NAME,
        input=prompt,
        temperature=0,
        max_output_tokens=MAX_TOKENS,
        text={
            "format": {
                "type": "json_schema",
                "json_schema": _AI_EXPLANATION_SCHEMA,
            }
        },
    )

    # Walk the output list for the first output_text block
    for item in response.output:
        for block in getattr(item, "content", []):
            if getattr(block, "type", None) == "output_text":
                return block.text.strip()

    # Convenience accessor (SDK shorthand)
    if hasattr(response, "output_text"):
        return response.output_text.strip()

    raise ValueError("Responses API returned no text output.")


# ---------------------------------------------------------
# Private: JSON → AIExplanation
# ---------------------------------------------------------


def _parse_json_response(content: str) -> AIExplanation:
    """Parse the model's JSON output into an AIExplanation.

    Structured output should prevent malformed JSON entirely.
    Fence-stripping and schema validation are retained as a
    defensive layer so the fallback path is never silently bypassed.

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
    Guarantees the API never fails due to OpenAI unavailability.
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
