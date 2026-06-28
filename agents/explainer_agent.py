# agents/explainer_agent.py
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.explain import explain_signal

def explain(signal_data: dict, research_data: dict) -> dict:
    """
    Agent 3 — Explainer Agent
    Converts SHAP values + sentiment into plain English
    """
    print(f"[Explainer Agent] Building explanation for {signal_data['symbol']}...")

    symbol    = signal_data["symbol"]
    signal    = signal_data["signal"]
    sentiment = signal_data["sentiment"]
    risk      = signal_data["risk_metrics"]

    # Get SHAP reasons
    shap_result = explain_signal(symbol, signal)
    reasons     = shap_result["reasons"]

    # Add sentiment reason
    reasons.append(f"📰 News sentiment: {sentiment['summary']}")

    # Build full explanation card
    explanation = {
        "symbol":       symbol,
        "signal":       signal,
        "confidence":   f"{int(signal_data['confidence'] * 100)}%",
        "price":        f"₹{signal_data['latest_price']}",
        "reasons":      reasons,
        "risk": {
            "sharpe":   risk["sharpe_ratio"],
            "drawdown": risk["max_drawdown"],
            "var":      risk["var_95"],
            "note":     shap_result["risk_note"],
        },
        "sentiment": {
            "dominant":   sentiment["dominant"],
            "confidence": sentiment["confidence"],
            "scores":     sentiment["scores"],
        }
    }

    print(f"[Explainer Agent] Done — {len(reasons)} reasons generated")
    return explanation