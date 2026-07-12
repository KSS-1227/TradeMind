"""
TradeMind — Confidence Calibration Module
-------------------------------------------
Wraps the existing Random Forest classifier with CalibratedClassifierCV
so that the confidence % shown to users actually reflects real-world
accuracy (e.g., a "78% confidence" prediction is correct ~78% of the time
historically), instead of a raw, overconfident model score.

Drop this into your existing model training/inference pipeline — it does
NOT replace your model, just wraps it.
"""

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib


# ---------------------------------------------------------------------
# 1. TRAIN + CALIBRATE
# ---------------------------------------------------------------------
def train_calibrated_model(X: pd.DataFrame, y: pd.Series, method: str = "isotonic"):
    """
    Trains your existing RandomForest and wraps it with calibration.

    method: "isotonic" (better with more data, non-parametric)
            or "sigmoid" / "platt" (better with limited data, ~<1000 samples)

    Use "sigmoid" if your dataset per stock is small (typical for a
    single-stock backtest); use "isotonic" if you're pooling training
    data across many stocks/tickers.
    """
    X_train, X_cal, y_train, y_cal = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Your existing base model — unchanged
    base_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        random_state=42,
        class_weight="balanced",
    )
    base_model.fit(X_train, y_train)

    # Wrap it — this is the actual fix.
    # cv="prefit" reuses the already-trained model above and calibrates
    # on a held-out slice, so you don't retrain from scratch.
    calibrated_model = CalibratedClassifierCV(
        estimator=base_model, method=method, cv="prefit"
    )
    calibrated_model.fit(X_cal, y_cal)

    return calibrated_model, base_model


# ---------------------------------------------------------------------
# 2. ENSEMBLE — combine LSTM + calibrated RF + sentiment score
# ---------------------------------------------------------------------
def ensemble_confidence(
    rf_confidence: float,
    lstm_confidence: float,
    sentiment_score: float,
    weights: dict | None = None,
) -> float:
    """
    Weighted average of your three signal sources into one final
    confidence score. Tune weights based on backtested reliability
    of each component (see reliability_report below) rather than
    guessing — the component that's historically most accurate
    should get the highest weight.

    sentiment_score should already be normalized to 0-1 (e.g., FinBERT
    positive probability), not a raw -1/0/1 label.
    """
    if weights is None:
        weights = {"rf": 0.45, "lstm": 0.35, "sentiment": 0.20}

    final_confidence = (
        weights["rf"] * rf_confidence
        + weights["lstm"] * lstm_confidence
        + weights["sentiment"] * sentiment_score
    )
    return round(float(final_confidence), 4)


# ---------------------------------------------------------------------
# 3. VALIDATE CALIBRATION — the number you want for your hackathon deck
# ---------------------------------------------------------------------
def reliability_report(calibrated_model, X_test: pd.DataFrame, y_test: pd.Series):
    """
    Produces a reliability curve: for predictions where the model said
    "70% confidence," were they actually correct ~70% of the time?

    This is the exact evidence a technical-feasibility judge would want
    to see — bring the printed table + a plotted reliability curve to
    your demo.
    """
    probs = calibrated_model.predict_proba(X_test)[:, 1]
    fraction_correct, mean_predicted = calibration_curve(
        y_test, probs, n_bins=10, strategy="quantile"
    )

    report = pd.DataFrame(
        {
            "predicted_confidence_bucket": np.round(mean_predicted, 2),
            "actual_accuracy": np.round(fraction_correct, 2),
        }
    )
    print("\nCalibration Reliability Report")
    print("-" * 40)
    print(report.to_string(index=False))
    print("\nWell-calibrated = the two columns are close to equal.")

    return report


# ---------------------------------------------------------------------
# 4. SAVE / LOAD for your FastAPI inference endpoint
# ---------------------------------------------------------------------
def save_model(calibrated_model, path: str = "models/rf_calibrated.pkl"):
    joblib.dump(calibrated_model, path)


def load_model(path: str = "models/rf_calibrated.pkl"):
    return joblib.load(path)


# ---------------------------------------------------------------------
# Example usage
# ---------------------------------------------------------------------
if __name__ == "__main__":
    # Replace with your actual feature matrix (technical indicators,
    # sentiment features, etc.) and labels (1 = price went up, 0 = down)
    # X = pd.read_csv("data/features.csv")
    # y = pd.read_csv("data/labels.csv")["target"]

    # calibrated_model, base_model = train_calibrated_model(X, y, method="sigmoid")
    # save_model(calibrated_model)

    # At inference time, in your existing prediction endpoint:
    # rf_conf = calibrated_model.predict_proba(new_features)[0][1]
    # final_conf = ensemble_confidence(rf_conf, lstm_conf, sentiment_score)

    print("Import this module into your training script and call "
          "train_calibrated_model(X, y) with your existing feature set.")