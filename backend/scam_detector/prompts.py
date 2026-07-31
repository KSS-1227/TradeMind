"""
prompts.py

LLM Prompt Builder for the Scam Detector.

The LLM is an EXPLANATION ENGINE only.

The risk score, classification, confidence, and recommendation have
already been produced by deterministic AI models (Rule Engine, Pump
Detector, URL Analyzer, FinBERT). The LLM must NEVER:
  - Reassess or re-score the message independently
  - Invent evidence not present in the structured evidence object
  - Change or override the classification
  - Speculate beyond the provided findings
  - Recommend buying or selling any security

The LLM's only job is to translate the structured evidence into clear,
plain-English reasoning for a non-technical retail investor.
"""

import json
from typing import Dict


# ---------------------------------------------------------
# JSON Schema Contract (shown to the LLM)
# ---------------------------------------------------------

RESPONSE_SCHEMA = {
    "summary": "<one sentence describing what the deterministic models found>",
    "reasoning": [
        "<plain-English explanation of one piece of evidence>",
        "<plain-English explanation of another piece of evidence>",
    ],
    "recommendation": "<one sentence restatement of the deterministic recommendation>",
}


# ---------------------------------------------------------
# Prompt Builder
# ---------------------------------------------------------

def build_explanation_prompt(
    risk_score: int,
    classification: str,
    confidence: int,
    recommendation_text: str,
    evidence: Dict,
    available_models: list,
) -> str:
    """
    Build the LLM prompt that instructs the model to explain
    — not reassess — the deterministic findings.

    Parameters
    ----------
    risk_score:
        Final score (0–100) produced by the fusion engine.
    classification:
        Human-readable label (e.g. "High Risk Scam").
    confidence:
        Confidence percentage of the deterministic pipeline.
    recommendation_text:
        Pre-computed recommendation from the fusion engine.
    evidence:
        Structured evidence dict with keys:
          red_flags, pump_patterns, url_findings,
          sentiment, sentiment_summary
    available_models:
        List of detectors that ran (e.g. ["Rule Engine", "FinBERT"]).

    Returns
    -------
    str — The complete prompt string to send to the LLM.
    """

    red_flags     = evidence.get("red_flags", [])
    pump_patterns = evidence.get("pump_patterns", [])
    url_findings  = evidence.get("url_findings", [])
    sentiment     = evidence.get("sentiment", "unavailable")
    sent_summary  = evidence.get("sentiment_summary", "")

    has_evidence = any([red_flags, pump_patterns, url_findings])

    evidence_block = _format_evidence_block(
        red_flags, pump_patterns, url_findings, sent_summary, has_evidence
    )

    schema_str = json.dumps(RESPONSE_SCHEMA, indent=2)

    prompt = f"""You are TradeMind AI, an explanation engine for a deterministic financial scam detection system..

IMPORTANT RULES — READ CAREFULLY:
1. The message has already been analyzed by deterministic AI models: {', '.join(available_models) or 'none'}.
2. The risk assessment is FINAL. Do NOT re-analyze or re-score the message.
3. Do NOT invent, assume, or add evidence that is not listed below.
4. Do NOT change the classification or risk score.
5. Do NOT speculate about the message or the sender.
6. Do NOT recommend buying or selling any security.
7. If evidence is limited or absent, state that explicitly — do not fill gaps with assumptions.
8. Your only job is to explain the provided evidence in plain English for a retail investor.

DETERMINISTIC ANALYSIS RESULTS:
- Risk Score:      {risk_score} / 100
- Classification:  {classification}
- Confidence:      {confidence}%
- Recommendation:  {recommendation_text}

EVIDENCE COLLECTED BY THE DETECTORS:
{evidence_block}

OUTPUT INSTRUCTIONS:
Respond with ONLY valid JSON. No markdown, no code fences, no extra text.
Use exactly this schema:
{schema_str}

Field rules:
- "summary":        One sentence describing what the detectors found (not your own opinion).
- "reasoning":      A list of 2–5 plain-English sentences, one per piece of evidence above.
                    If evidence is limited, include a sentence stating that.
                    Each sentence must reference only the evidence listed above.
- "recommendation": One sentence restating the deterministic recommendation above.
                    Do NOT add qualifiers, caveats, or financial advice beyond what is stated.

Respond with JSON only:"""

    return prompt


# ---------------------------------------------------------
# Evidence Formatter
# ---------------------------------------------------------

def _format_evidence_block(
    red_flags: list,
    pump_patterns: list,
    url_findings: list,
    sentiment_summary: str,
    has_evidence: bool,
) -> str:
    """Format the evidence dict into a readable block for the prompt."""

    if not has_evidence and not sentiment_summary:
        return "  No evidence was collected by any detector."

    lines = []

    if red_flags:
        lines.append("Rule-based red flags detected:")
        for flag in red_flags:
            lines.append(f"  - {flag}")
    else:
        lines.append("Rule-based red flags: none detected.")

    if pump_patterns:
        lines.append("Pump-and-dump behavioral patterns detected:")
        for pattern in pump_patterns:
            lines.append(f"  - {pattern}")
    else:
        lines.append("Pump-and-dump patterns: none detected.")

    if url_findings:
        lines.append("URL analysis findings:")
        for finding in url_findings:
            lines.append(f"  - {finding}")
    else:
        lines.append("URL analysis: no URLs found or no issues detected.")

    if sentiment_summary:
        lines.append(f"Sentiment: {sentiment_summary}")
    else:
        lines.append("Sentiment: FinBERT was not available.")

    return "\n".join(lines)
