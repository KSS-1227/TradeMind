# agents/signal_agent.py
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import joblib
import numpy as np
import pandas as pd
import yfinance as yf

from ml.sentiment import analyze_sentiment

MODEL_PATH  = "ml/rf_model.pkl"
SCALER_PATH = "ml/scaler.pkl"

FEATURES = [
    "RSI", "MACD", "MACD_signal", "MACD_hist",
    "BB_upper", "BB_lower", "EMA_20", "EMA_50",
    "Volume_MA20", "Returns", "Returns_5d", "Volume"
]

def generate_signal(research_data: dict) -> dict:
    """
    Agent 2 — Signal Agent
    Combines RF model + FinBERT sentiment → final signal
    """
    print(f"[Signal Agent] Generating signal for {research_data['symbol']}...")

    symbol  = research_data["symbol"]
    latest  = research_data["latest"]
    df      = research_data["df"]

    # Load model
    model  = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    # Build feature vector
    X = np.array([[float(latest.get(f, 0)) for f in FEATURES]])
    X_scaled = scaler.transform(X)

    # RF prediction
    pred  = model.predict(X_scaled)[0]
    proba = model.predict_proba(X_scaled)[0]
    label_map  = {0: "SELL", 1: "HOLD", 2: "BUY"}
    rf_signal  = label_map[pred]
    rf_confidence = float(max(proba))

    # Sentiment analysis
    sentiment = analyze_sentiment(research_data["headlines"])

    # Combine RF + sentiment into final signal
    final_signal, final_confidence = combine_signals(
        rf_signal, rf_confidence, sentiment
    )

    # Risk metrics
    close_prices = df["Close"].astype(float)
    risk_metrics = calculate_risk(close_prices, final_signal)

    print(f"[Signal Agent] RF: {rf_signal} ({rf_confidence:.2f}) | "
          f"Sentiment: {sentiment['dominant']} | "
          f"Final: {final_signal} ({final_confidence:.2f})")
    
    latest_price = float(latest.get("Close", 0))
    if symbol in ["GC=F", "SI=F"]:
        try:
            fx_df = yf.download("INR=X", period="5d", 
                            interval="1d", progress=False)
            if isinstance(fx_df.columns, pd.MultiIndex):
                fx_df.columns = fx_df.columns.get_level_values(0)
                usd_to_inr    = float(fx_df["Close"].iloc[-1])
                INDIA_PREMIUM = (1 + 0.15) * (1 + 0.03)
                if symbol == "GC=F":
                    latest_price = round(
                        (latest_price / 31.1035) * 10 * usd_to_inr * INDIA_PREMIUM, 2)
                else:
                    latest_price = round(
                        (latest_price / 32.1507) * 1000 * usd_to_inr * INDIA_PREMIUM, 2
                    )
        except Exception as e:
            print(f"FX conversion error: {e}")
    

    return {
        "symbol":           symbol,
        "signal":           final_signal,
        "confidence":       round(final_confidence, 3),
        "rf_signal":        rf_signal,
        "rf_confidence":    round(rf_confidence, 3),
        "sentiment":        sentiment,
        "risk_metrics":     risk_metrics,
        "latest_price":     round(latest_price, 2),
        "probabilities": {
            "SELL": round(float(proba[0]), 3),
            "HOLD": round(float(proba[1]), 3),
            "BUY":  round(float(proba[2]), 3),
        },

    }


def combine_signals(rf_signal: str, rf_conf: float, sentiment: dict) -> tuple:
    rf_conf   = rf_conf if rf_conf else 0.5
    dominant  = sentiment.get("dominant", "neutral")
    sent_conf = sentiment.get("confidence", 0) or 0

    if rf_signal == "BUY" and dominant == "positive":
        return "BUY", min(rf_conf + sent_conf * 0.2, 0.99)
    elif rf_signal == "SELL" and dominant == "negative":
        return "SELL", min(rf_conf + sent_conf * 0.2, 0.99)
    elif rf_signal == "BUY" and dominant == "negative":
        return "HOLD", (rf_conf + sent_conf) / 2
    elif rf_signal == "SELL" and dominant == "positive":
        return "HOLD", (rf_conf + sent_conf) / 2
    else:
        return rf_signal, rf_conf

def calculate_risk(close_prices: pd.Series, signal: str) -> dict:
    """Calculate key risk metrics"""
    returns = close_prices.pct_change().dropna()

    # Sharpe ratio (annualized, assume 0% risk-free rate)
    sharpe = float(returns.mean() / returns.std() * (252 ** 0.5)) \
             if returns.std() > 0 else 0

    # Max drawdown
    rolling_max = close_prices.cummax()
    drawdown    = (close_prices - rolling_max) / rolling_max
    max_dd      = float(drawdown.min())

    # VaR 95%
    import numpy as np
    var_95 = float(np.percentile(returns, 5))

    return {
        "sharpe_ratio": round(sharpe, 3),
        "max_drawdown": f"{round(max_dd * 100, 2)}%",
        "var_95":       f"{round(var_95 * 100, 2)}%",
    }