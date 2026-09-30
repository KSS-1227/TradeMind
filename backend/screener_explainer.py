"""Plain-English explanations for deterministic screener predictions."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import requests

logger = logging.getLogger(__name__)


def explain_screener_prediction(analysis: dict[str, Any]) -> dict[str, Any]:
    """Explain an existing signal with a dedicated Gemini key, never alter it."""
    api_key = os.getenv("GEMINI_SCREENER_API_KEY")
    if not api_key:
        return _fallback_explanation(analysis, "Dedicated Gemini screener key is not configured.")

    model = os.getenv("GEMINI_SCREENER_MODEL", "gemini-2.5-flash")
    prompt = _build_prompt(analysis)
    try:
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            headers={"x-goog-api-key": api_key},
            json={
                "systemInstruction": {
                    "parts": [{"text": _SYSTEM_PROMPT}],
                },
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 700,
                    "responseMimeType": "application/json",
                },
            },
            timeout=20,
        )
        response.raise_for_status()
        body = response.json()
        text = body["candidates"][0]["content"]["parts"][0]["text"]
        result = _validate_report(json.loads(_strip_code_fence(text)))
        result["recommendations"] = [_fixed_recommendation(analysis)]
        result["is_fallback"] = False
        result["explanation_source"] = "Gemini"
        return result
    except Exception as exc:
        logger.warning(
            "screener.gemini_explanation_failed",
            extra={"symbol": analysis.get("symbol"), "error": str(exc)},
        )
        return _fallback_explanation(analysis, "Gemini explanation is temporarily unavailable.")


_SYSTEM_PROMPT = """You explain an already-computed stock model result for a retail trader.
Do not perform new analysis, change the signal, confidence, target price, or risk
rating, and do not add trade instructions or recommend other securities. Use only
the supplied deterministic data. Explain what the SHAP drivers and indicators
mean, while distinguishing correlation/context from proven causation. If the data
does not support a conclusion, say so. Return JSON only with exactly these fields:
summary (string), strengths (string array), risks (string array), recommendations
(string array), outlook (string), confidence_note (string)."""


def _build_prompt(analysis: dict[str, Any]) -> str:
    sentiment = analysis.get("sentiment")
    if isinstance(sentiment, dict):
        sentiment = sentiment.get("dominant", sentiment.get("label", "unavailable"))
    expected_return = analysis.get("expected_return")
    payload = {
        "symbol": analysis.get("symbol"),
        "current_price_inr": analysis.get("current_price"),
        "predicted_price_inr": analysis.get("predicted_price"),
        "expected_return_percent": (
            round(float(expected_return) * 100, 2)
            if expected_return is not None
            else None
        ),
        "model_signal": analysis.get("recommendation"),
        "confidence_percent": analysis.get("confidence"),
        "risk_rating": analysis.get("overall_risk"),
        "trend": analysis.get("trend"),
        "sentiment": sentiment,
        "sentiment_score": analysis.get("sentiment_score"),
        "model_agreement": analysis.get("model_agreement"),
        "agreement": analysis.get("agreement"),
        "available_models": analysis.get("explainability", {}).get("available_models", []),
        "technical_indicators": analysis.get("technical_indicators", {}),
        "shap_drivers": analysis.get("shap", {}).get("features", []),
        "deterministic_reasoning": analysis.get("reasoning", []),
        "risk_metrics": analysis.get("risk", {}),
    }
    return "Explain this prediction using only the following JSON data:\n" + json.dumps(
        payload, ensure_ascii=True, allow_nan=False
    )


def _validate_report(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict) or not isinstance(data.get("summary"), str):
        raise ValueError("Gemini returned an invalid explanation schema.")

    def clean_list(name: str, limit: int) -> list[str]:
        value = data.get(name, [])
        if not isinstance(value, list):
            return []
        return [item.strip()[:400] for item in value if isinstance(item, str) and item.strip()][:limit]

    return {
        "summary": data["summary"].strip()[:1200],
        "strengths": clean_list("strengths", 4),
        "risks": clean_list("risks", 4),
        "recommendations": clean_list("recommendations", 1),
        "outlook": str(data.get("outlook", "")).strip()[:600],
        "confidence_note": str(data.get("confidence_note", "")).strip()[:600],
    }


def _fixed_recommendation(analysis: dict[str, Any]) -> str:
    symbol = analysis.get("symbol", "This stock")
    recommendation = analysis.get("recommendation", "Unavailable")
    return f"Existing model signal for {symbol}: {recommendation}. Gemini does not change it."


def _fallback_explanation(analysis: dict[str, Any], reason: str) -> dict[str, Any]:
    drivers = [
        str(item).strip()
        for item in analysis.get("reasoning", [])
        if isinstance(item, str) and item.strip()
    ][:3]
    shap_features = analysis.get("shap", {}).get("features", [])
    for feature in shap_features[:3]:
        if isinstance(feature, dict) and feature.get("name"):
            drivers.append(f"SHAP model driver: {feature['name']} (contribution {feature.get('value', 'unavailable')}).")

    recommendation = analysis.get("recommendation", "unavailable")
    confidence = analysis.get("confidence")
    symbol = analysis.get("symbol", "This stock")
    confidence_text = f" at {confidence}% confidence" if confidence is not None else ""
    if not drivers:
        drivers = ["The deterministic model did not return readable feature-level reasoning."]

    return {
        "summary": (
            f"{reason} {symbol} has an existing {recommendation} model signal{confidence_text}. "
            "The points below come from the deterministic model output; they do not change its signal."
        ),
        "strengths": drivers[:4],
        "risks": ["This explanation is a deterministic fallback, not a Gemini-generated interpretation."],
        "recommendations": [_fixed_recommendation(analysis)],
        "outlook": f"The model's existing trend assessment is {analysis.get('trend', 'unavailable')}.",
        "confidence_note": (
            f"Model confidence is {confidence}% and agreement is {analysis.get('agreement', 'unavailable')}."
            if confidence is not None
            else "The model did not provide a confidence value."
        ),
        "is_fallback": True,
        "explanation_source": "Deterministic fallback",
    }


def _strip_code_fence(text: str) -> str:
    value = text.strip()
    if value.startswith("```"):
        value = value.removeprefix("```json").removeprefix("```")
        value = value.removesuffix("```")
    return value.strip()