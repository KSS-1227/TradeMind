"""
risk_engine.py

Evidence Fusion Engine

Combines evidence from:

✔ Rule-Based Detector
✔ Pump Detector
✔ URL Analyzer
✔ FinBERT Sentiment

into one explainable risk score.

This module contains NO regex or detection logic and NO LLM logic.
It only fuses evidence from the individual detectors into a final
deterministic decision. The LLM layer is a downstream explanation
consumer — it never influences these outputs.
"""

from typing import Dict, List


# ---------------------------------------------------------
# Risk Contributions
# ---------------------------------------------------------

# Detector scores are evidence, not competing opinions. A weighted average
# lets a neutral detector dilute decisive scam indicators, so each detector
# contributes capped points and high-severity combinations receive escalation
# bonuses below.
RULE_SCORE_FACTOR = 0.50
PUMP_SCORE_FACTOR = 0.40
URL_SCORE_FACTOR = 0.50


# ---------------------------------------------------------
# Sentiment Adjustment
# ---------------------------------------------------------

def sentiment_risk(sentiment: Dict) -> int:
    """
    Convert FinBERT sentiment into a risk contribution.

    Sentiment is supporting context only: legitimate bad news must not look
    like a scam merely because FinBERT is negative.
    """

    dominant = sentiment.get("dominant", "neutral")
    confidence = sentiment.get("confidence", 0)

    if dominant == "negative":
        return round(8 * confidence)

    if dominant == "neutral":
        return round(2 * confidence)

    return 0


# ---------------------------------------------------------
# Classification
# ---------------------------------------------------------

def classify(score: int) -> str:

    if score >= 81:
        return "Very High Risk Scam"

    if score >= 61:
        return "High Risk"

    if score >= 41:
        return "Suspicious"

    if score >= 21:
        return "Likely Safe"

    return "Safe"


# ---------------------------------------------------------
# Recommendation
# ---------------------------------------------------------

def recommendation(score: int) -> str:

    if score >= 81:
        return (
            "Avoid acting on this message. "
            "Do not invest or share personal information."
        )

    if score >= 61:
        return (
            "Verify independently before making any investment decision."
        )

    if score >= 41:
        return (
            "Cross-check the information using trusted financial sources."
        )

    return (
        "No major scam indicators detected, but always perform due diligence."
    )


# ---------------------------------------------------------
# Confidence Calculation
# ---------------------------------------------------------

def confidence_score(active_detectors: int) -> int:
    """
    Confidence depends on how much evidence
    was actually available.
    """

    mapping = {
        1: 60,
        2: 75,
        3: 88,
        4: 95,
    }

    return mapping.get(active_detectors, 60)


def _flag_names(rule_result: Dict) -> set[str]:
    """Extract normalized red-flag names from Pydantic or dict inputs."""

    names = set()
    for flag in rule_result.get("flags", []):
        name = flag.get("name", "") if isinstance(flag, dict) else flag.name
        names.add(name.lower())
    return names


def _escalation_bonus(
    flag_names: set[str],
    pump_result: Dict,
    url_result: Dict,
) -> int:
    """Add risk when independent scam signals reinforce each other."""

    metrics = pump_result.get("metrics", {}) if pump_result else {}
    percentages = metrics.get("percentage_claims", []) or []
    largest_claim = max(percentages, default=0)

    guaranteed = "guaranteed returns" in flag_names
    urgency = "urgency" in flag_names
    upper_circuit = "upper circuit claim" in flag_names
    insider_tip = "insider tip" in flag_names
    no_risk = "no risk" in flag_names
    unrealistic_return = largest_claim >= 50

    bonus = 0
    critical_indicators = 0

    if guaranteed:
        bonus += 12
        critical_indicators += 1
    if unrealistic_return:
        bonus += 18 if largest_claim >= 300 else 12
        critical_indicators += 1
    if urgency:
        bonus += 6
        critical_indicators += 1
    if upper_circuit:
        bonus += 6
        critical_indicators += 1
    if insider_tip:
        bonus += 12
        critical_indicators += 1
    if no_risk:
        bonus += 8

    pump_score = pump_result.get("score", 0) if pump_result else 0
    if pump_score >= 75:
        bonus += 20
    elif pump_score >= 50:
        bonus += 14
    elif pump_score >= 25:
        bonus += 8

    url_score = url_result.get("score", 0) if url_result else 0
    if url_score >= 50:
        bonus += 12
    elif url_score >= 20:
        bonus += 6

    # Multiple independent signals are materially stronger than one phrase.
    if critical_indicators >= 3:
        bonus += 10
    elif critical_indicators >= 2:
        bonus += 6

    # A promotion plus pump-style writing is a common coordinated pattern.
    if pump_score >= 25 and critical_indicators >= 1:
        bonus += 7

    return bonus


# ---------------------------------------------------------
# Fusion
# ---------------------------------------------------------

def calculate_risk(
    rule_result: Dict,
    pump_result: Dict,
    url_result: Dict,
    sentiment_result: Dict,
) -> Dict:
    """
    Merge detector outputs into one final decision.

    Returns a structured result including an ``evidence`` object
    that organises findings by detector category. The LLM layer
    consumes ``evidence`` to produce a human-readable explanation;
    it never modifies the risk_score, classification, or recommendation.
    """

    score = 0
    active_model_names: List[str] = []

    # Structured evidence — each detector populates its own bucket.
    red_flags: List[str] = []
    pump_patterns: List[str] = []
    url_findings: List[str] = []
    sentiment_label = "unavailable"
    sentiment_summary = "FinBERT sentiment was not available for this message."

    # -----------------------------------------------------
    # Rule Engine
    # -----------------------------------------------------

    if rule_result:

        # Rule hits are direct, explainable evidence. Preserve their impact
        # rather than averaging them down with unrelated neutral detectors.
        score += min(round(rule_result.get("score", 0) * RULE_SCORE_FACTOR), 50)
        active_model_names.append("Rule Engine")

        for flag in rule_result["flags"]:
            red_flags.append(
                flag.get("name", "Unknown rule")
                if isinstance(flag, dict)
                else flag.name
            )

    # -----------------------------------------------------
    # Pump Detector
    # -----------------------------------------------------

    if pump_result:

        score += min(round(pump_result.get("score", 0) * PUMP_SCORE_FACTOR), 40)
        active_model_names.append("Pump Detector")

        pump_patterns.extend(pump_result["patterns"])

    # -----------------------------------------------------
    # URL Analyzer
    # -----------------------------------------------------

    if url_result and url_result["urls"]:

        score += min(round(url_result.get("score", 0) * URL_SCORE_FACTOR), 40)
        active_model_names.append("URL Analyzer")

        url_findings.extend(url_result["findings"])

    # -----------------------------------------------------
    # FinBERT
    # -----------------------------------------------------

    if sentiment_result:

        score += sentiment_risk(sentiment_result)
        # detector.py always calls FinBERT; include it whenever it returned
        # a result, regardless of whether another detector had evidence.
        active_model_names.append("FinBERT")

        dominant = sentiment_result.get("dominant", "neutral")
        conf = sentiment_result.get("confidence", 0)
        sentiment_label = dominant
        sentiment_summary = (
            f"FinBERT classified the message sentiment as "
            f"{dominant} with {round(conf * 100)}% confidence."
        )

    # Escalation only combines detector output already produced upstream; it
    # does not inspect raw text or introduce any LLM-dependent behaviour.
    score += _escalation_bonus(
        _flag_names(rule_result or {}),
        pump_result or {},
        url_result or {},
    )
    final_score = min(max(round(score), 0), 100)

    evidence = {
        "red_flags":        red_flags,
        "pump_patterns":    pump_patterns,
        "url_findings":     url_findings,
        "sentiment":        sentiment_label,
        "sentiment_summary": sentiment_summary,
    }

    active_detectors = len(active_model_names)

    return {
        "risk_score":      final_score,
        "classification":  classify(final_score),
        "confidence":      confidence_score(active_detectors),
        "recommendation":  recommendation(final_score),
        "evidence":        evidence,
        "available_models": active_model_names,
    }
