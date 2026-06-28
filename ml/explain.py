# ml/explain.py
import shap
import joblib
import numpy as np
import pandas as pd
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.fetch_prices import fetch_prices
from ml.technical import add_technical_indicators

MODEL_PATH  = "ml/rf_model.pkl"
SCALER_PATH = "ml/scaler.pkl"

FEATURES = [
    "RSI", "MACD", "MACD_signal", "MACD_hist",
    "BB_upper", "BB_lower", "EMA_20", "EMA_50",
    "Volume_MA20", "Returns", "Returns_5d", "Volume"
]

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
    latest = df.iloc[-1]

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