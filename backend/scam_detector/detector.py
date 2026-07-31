"""
detector.py

TradeMind Scam Detection Orchestrator

This module coordinates the complete scam detection pipeline.

Pipeline
--------
Input
 ↓
Text Cleaning
 ↓
Rule Engine
 ↓
FinBERT Sentiment
 ↓
Pump Detector
 ↓
URL Checker
 ↓
Risk Engine
 ↓
LLM Explanation
 ↓
ScamResponse

IMPORTANT
---------
No business logic should live here.

Every detector is responsible for its own analysis.

This module simply orchestrates them.
"""

from __future__ import annotations

import logging

from ml.sentiment import analyze_sentiment

from .llm_explainer import generate_explanation
from .models import ScamEvidence, ScamResponse
from .pump_detector import detect_pump_patterns
from .red_flags import detect_red_flags
from .risk_engine import calculate_risk
from .url_checker import analyze_urls
from .utils import clean_text

logger = logging.getLogger(__name__)


def analyze_message(message: str) -> ScamResponse:
    """
    Analyze a message for potential investment scams.

    Parameters
    ----------
    message : str

    Returns
    -------
    ScamResponse
    """

    logger.info("Starting TradeMind scam analysis.")

    # -------------------------------------------------
    # Normalize Input
    # -------------------------------------------------

    message = clean_text(message)

    # -------------------------------------------------
    # Rule Engine
    # -------------------------------------------------

    rule_result = detect_red_flags(message)

    # -------------------------------------------------
    # FinBERT Sentiment
    # -------------------------------------------------

    sentiment_result = analyze_sentiment(
        [
            {
                "headline": message
            }
        ]
    )

    # -------------------------------------------------
    # Pump Detection
    # -------------------------------------------------

    pump_result = detect_pump_patterns(message)

    # -------------------------------------------------
    # URL Analysis
    # -------------------------------------------------

    url_result = analyze_urls(message)

    # -------------------------------------------------
    # Risk Fusion
    # -------------------------------------------------

    risk = calculate_risk(
        rule_result=rule_result,
        pump_result=pump_result,
        url_result=url_result,
        sentiment_result=sentiment_result,
    )

    # -------------------------------------------------
    # AI Explanation
    # -------------------------------------------------

    # Normalize deterministic output through the same evidence model exposed
    # by the endpoint before it reaches the LLM explainer.
    evidence = ScamEvidence(**risk["evidence"])

    explanation = generate_explanation(
        risk_score=risk["risk_score"],
        classification=risk["classification"],
        confidence=risk["confidence"],
        recommendation_text=risk["recommendation"],
        evidence=evidence,
        available_models=risk["available_models"],
    )

    logger.info(
        "TradeMind analysis completed.",
        extra={
            "risk_score": risk["risk_score"],
            "classification": risk["classification"],
        },
    )

    # -------------------------------------------------
    # Final Response
    # -------------------------------------------------

    return ScamResponse(
        risk_score=risk["risk_score"],
        classification=risk["classification"],
        confidence=risk["confidence"],
        recommendation=risk["recommendation"],
        explanation=explanation,
        evidence=evidence,
        available_models=risk["available_models"],
        models_unavailable=risk.get("models_unavailable", []),
    )
