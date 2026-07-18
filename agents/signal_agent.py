# agents/signal_agent.py
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import joblib
import numpy as np
import pandas as pd
import yfinance as yf

from ml.sentiment import analyze_sentiment
from data.news_enrichment import enrich_articles_for_stock
from ml.rf_model import FEATURES  # single source of truth — do NOT redefine
                                   # this list here again. It previously was
                                   # duplicated in this file and silently fell
                                   # out of sync when market-relative features
                                   # were added to ml/rf_model.py, causing a
                                   # feature-count mismatch at prediction time.

MODEL_PATH            = "ml/rf_model.pkl"
CALIBRATED_MODEL_PATH = "ml/rf_model_calibrated.pkl"
SCALER_PATH           = "ml/scaler.pkl"

def generate_signal(research_data: dict) -> dict:
    """
    Agent 2 — Signal Agent
    Combines RF model + FinBERT sentiment → final signal
    """
    print(f"[Signal Agent] Generating signal for {research_data['symbol']}...")

    symbol  = research_data["symbol"]
    latest  = research_data["latest"]
    df      = research_data["df"]

    # Load model — prefer the calibrated model for well-calibrated confidence
    # scores; fall back to the raw model if calibration hasn't been run yet
    # (e.g. fresh clone before ml/rf_model.py's train_model() has been re-run).
    scaler = joblib.load(SCALER_PATH)
    if os.path.exists(CALIBRATED_MODEL_PATH):
        model = joblib.load(CALIBRATED_MODEL_PATH)
    else:
        print("[Signal Agent] Calibrated model not found — using raw model. "
              "Run ml/rf_model.py's train_model() to generate it.")
        model = joblib.load(MODEL_PATH)

    # Build feature vector
    X = np.array([[float(latest.get(f, 0)) for f in FEATURES]])
    X_scaled = scaler.transform(X)

    # RF prediction
    pred  = model.predict(X_scaled)[0]
    proba = model.predict_proba(X_scaled)[0]
    label_map  = {0: "SELL", 1: "HOLD", 2: "BUY"}
    rf_signal  = label_map[pred]
    rf_confidence = float(max(proba))

    # Enrich top news articles with full text, then score sentiment
    enriched_articles = enrich_articles_for_stock(research_data["headlines"])
    sentiment = analyze_sentiment(enriched_articles)

    # Sentiment is surfaced as separate context below — it is NOT blended
    # into the signal or confidence shown to the user. A calibration audit
    # (Monte Carlo test against the real combine_signals() code, see
    # ml/rf_model.py's calibration_experiment work) found that blending an
    # unvalidated sentiment score into the calibrated RF confidence made
    # the shown number's calibration gap ~12x worse under the most
    # defensible assumption (no evidence FinBERT sentiment predicts actual
    # price moves for this universe — untestable directly, since no
    # historical sentiment archive matched to past dates exists). Until
    # sentiment is validated against real outcomes, showing the calibrated
    # RF probability untouched is the more honest choice — consistent with
    # this project's own "no embellishment" standard applied to itself.
    sentiment_note = describe_sentiment_alignment(rf_signal, sentiment)

    final_signal     = rf_signal
    final_confidence = rf_confidence

    # Risk metrics
    close_prices = df["Close"].astype(float)
    risk_metrics = calculate_risk(close_prices, final_signal)

    print(f"[Signal Agent] RF: {rf_signal} ({rf_confidence:.2f}) | "
          f"Sentiment: {sentiment['dominant']} ({sentiment_note}) | "
          f"Shown as-is — sentiment is context only, not blended into confidence.")
    
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
        "sentiment_note":   sentiment_note,
        "risk_metrics":     risk_metrics,
        "latest_price":     round(latest_price, 2),
        "probabilities": {
            "SELL": round(float(proba[0]), 3),
            "HOLD": round(float(proba[1]), 3),
            "BUY":  round(float(proba[2]), 3),
        },

    }


def describe_sentiment_alignment(rf_signal: str, sentiment: dict) -> str:
    """
    Plain-English note on whether news sentiment agrees or disagrees with
    the model's signal — informational only, on purpose. Deliberately does
    NOT produce a confidence number or change the signal: see the
    calibration-audit note in generate_signal() for why blending an
    unvalidated sentiment score into the calibrated RF probability was
    found to make the shown confidence meaningfully less honest.
    """
    dominant  = sentiment.get("dominant", "neutral")
    sent_conf = float(sentiment.get("confidence", 0) or 0)

    if sent_conf == 0:
        return "No recent news available."
    if rf_signal == "BUY" and dominant == "positive":
        return "News sentiment agrees (positive)."
    if rf_signal == "SELL" and dominant == "negative":
        return "News sentiment agrees (negative)."
    if rf_signal == "BUY" and dominant == "negative":
        return "News sentiment disagrees (negative) — model signal shown as-is, unchanged."
    if rf_signal == "SELL" and dominant == "positive":
        return "News sentiment disagrees (positive) — model signal shown as-is, unchanged."
    return "News sentiment is neutral."

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