# ml/explain.py
import shap
import joblib
import numpy as np
import pandas as pd
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.fetch_prices import fetch_prices, STOCKS
from ml.technical import add_technical_indicators
from ml.market_relative import compute_live_relative_features, MARKET_RELATIVE_FEATURES
from ml.rf_model import FEATURES  # single source of truth — see the same
                                   # note in agents/signal_agent.py. This
                                   # file previously had its own stale
                                   # 12-feature copy, causing a feature-count
                                   # mismatch at scaler.transform() time.

MODEL_PATH  = "ml/rf_model.pkl"
SCALER_PATH = "ml/scaler.pkl"

# Plain English templates for each feature
EXPLANATIONS = {
    "RSI": lambda v: (
        f"RSI at {round(v, 1)} — stock is oversold, bounce likely ↑"
        if v < 35 else
        f"RSI at {round(v, 1)} — stock is overbought, pullback likely ↓"
        if v > 65 else
        f"RSI at {round(v, 1)} — momentum is neutral"
    ),
    "MACD": lambda v: (
        f"MACD positive — bullish trend building ↑"
        if v > 0 else
        f"MACD negative — bearish pressure present ↓"
    ),
    "MACD_signal": lambda v: (
        f"MACD signal line suggests upward crossover ↑"
        if v < 0 else
        f"MACD signal line suggests downward crossover ↓"
    ),
    "MACD_hist": lambda v: (
        f"MACD histogram expanding — momentum increasing ↑"
        if v > 0 else
        f"MACD histogram contracting — momentum weakening ↓"
    ),
    "BB_upper": lambda v: f"Upper Bollinger Band at ₹{round(v, 1)} — resistance level to watch",
    "BB_lower": lambda v: f"Lower Bollinger Band at ₹{round(v, 1)} — current support zone",
    "EMA_20":   lambda v: f"20-day EMA at ₹{round(v, 1)} — short-term trend reference",
    "EMA_50":   lambda v: f"50-day EMA at ₹{round(v, 1)} — medium-term trend reference",
    "Volume_MA20": lambda v: f"Average volume {int(v):,} — liquidity reference",
    "Returns":  lambda v: (
        f"Today's return: +{round(v*100, 2)}% — positive momentum"
        if v > 0 else
        f"Today's return: {round(v*100, 2)}% — negative momentum"
    ),
    "Returns_5d": lambda v: (
        f"5-day return: +{round(v*100, 2)}% — short-term uptrend"
        if v > 0 else
        f"5-day return: {round(v*100, 2)}% — short-term downtrend"
    ),
    "Volume": lambda v: f"Current volume: {int(v):,} shares traded",
    # Market-relative / cross-sectional — added alongside the FEATURES fix.
    # Without these, a market-relative feature ranking in the SHAP top-3
    # would silently produce fewer than 3 reasons instead of an error —
    # not a crash, but a quiet quality gap against this project's own
    # "every signal fully explained" standard.
    "Rel_Return": lambda v: (
        f"Outperforming Nifty by {round(v*100, 2)}% today ↑"
        if v > 0 else
        f"Underperforming Nifty by {round(abs(v)*100, 2)}% today ↓"
    ),
    "Rel_Return_5d": lambda v: (
        f"Outperforming Nifty by {round(v*100, 2)}% over 5 days ↑"
        if v > 0 else
        f"Underperforming Nifty by {round(abs(v)*100, 2)}% over 5 days ↓"
    ),
    "Beta_20d": lambda v: (
        f"Beta {round(v, 2)} — amplifying market moves more than usual"
        if v > 1.2 else
        f"Beta {round(v, 2)} — moving roughly in line with the market"
        if v > 0.8 else
        f"Beta {round(v, 2)} — dampening market moves, more defensive"
    ),
    "RS_line_ROC_10": lambda v: (
        f"Relative strength vs. Nifty rising ({round(v*100, 2)}% over 10 days) ↑"
        if v > 0 else
        f"Relative strength vs. Nifty falling ({round(v*100, 2)}% over 10 days) ↓"
    ),
    "RSI_rel_class": lambda v: (
        f"RSI {round(v, 1)} points above its peer group average"
        if v > 0 else
        f"RSI {round(abs(v), 1)} points below its peer group average"
    ),
    "Returns_rel_class": lambda v: (
        f"Outperforming peer stocks by {round(v*100, 2)}% today ↑"
        if v > 0 else
        f"Underperforming peer stocks by {round(abs(v)*100, 2)}% today ↓"
    ),
}

def explain_signal(symbol: str, signal: str) -> dict:
    """
    Generate SHAP-based plain English explanation for a signal
    """
    # Load model and scaler
    model  = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    # Get latest data
    df = fetch_prices(symbol, period="1y")
    df = add_technical_indicators(df)
    latest = df.iloc[-1].to_dict()

    # Market-relative / cross-sectional features — same computation used in
    # agents/research_agent.py and ml/rf_model.py's predict_signal(), needed
    # here too since this function does its own independent data fetch
    # rather than reusing research_agent's result.
    try:
        relative_feats = compute_live_relative_features(symbol, df, STOCKS, period="1y")
        latest.update(relative_feats)
    except Exception as e:
        print(f"[Explain] Market-relative features failed ({e}) — "
              f"falling back to 0 for those fields.")
        latest.update({f: 0.0 for f in MARKET_RELATIVE_FEATURES})

    # Build feature vector
    feature_values = {f: float(latest.get(f, 0)) for f in FEATURES}
    X = np.array([list(feature_values.values())])
    X_scaled = scaler.transform(X)

    # SHAP explanation
    explainer   = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_scaled)

    # Map signal to class index
    signal_idx = {"SELL": 0, "HOLD": 1, "BUY": 2}.get(signal, 1)

    # Handle both 2D and 3D SHAP output formats
    if isinstance(shap_values, list):
        # list of arrays — one per class
        shap_for_signal = shap_values[signal_idx][0]
    else:
        # 3D array — shape (n_samples, n_features, n_classes)
        if shap_values.ndim == 3:
            shap_for_signal = shap_values[0, :, signal_idx]
        else:
            shap_for_signal = shap_values[0]
    # Get top 3 most impactful features
    feature_impact = list(zip(FEATURES, shap_for_signal))
    feature_impact.sort(key=lambda x: abs(x[1]), reverse=True)
    top_3 = feature_impact[:3]

    # Convert to plain English
    reasons = []
    for feature, shap_val in top_3:
        raw_value = feature_values[feature]
        if feature in EXPLANATIONS:
            reason = EXPLANATIONS[feature](raw_value)
            direction = "supports" if shap_val > 0 else "cautions against"
            reasons.append(f"{reason}")

    # Risk context
    rsi_val = feature_values.get("RSI", 50)
    ret_5d  = feature_values.get("Returns_5d", 0)
    risk_note = build_risk_note(signal, rsi_val, ret_5d)

    return {
        "symbol":    symbol,
        "signal":    signal,
        "reasons":   reasons,
        "risk_note": risk_note,
        "top_features": [(f, round(float(v), 4)) for f, v in top_3],
    }

def build_risk_note(signal: str, rsi: float, ret_5d: float) -> str:
    """Plain English risk warning"""
    if signal == "BUY":
        if rsi > 65:
            return "⚠️ Caution: RSI is high — stock may be overbought, consider smaller position"
        return "✅ Risk level moderate — set stop-loss 3-5% below entry price"
    elif signal == "SELL":
        if rsi < 35:
            return "⚠️ Caution: RSI is low — stock may be oversold, short-selling risky"
        return "✅ Risk level moderate — confirm with volume before acting"
    else:
        return "ℹ️ Hold — no strong directional signal, wait for confirmation"

if __name__ == "__main__":
    print("Generating explanation for RELIANCE.NS...")
    result = explain_signal("RELIANCE.NS", "SELL")

    print(f"\nSignal: {result['signal']} — {result['symbol']}")
    print("\nWhy this signal?")
    for i, reason in enumerate(result["reasons"], 1):
        print(f"  {i}. {reason}")
    print(f"\nRisk note: {result['risk_note']}")
    print(f"\nTop SHAP features: {result['top_features']}")