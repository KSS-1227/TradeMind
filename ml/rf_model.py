# ml/rf_model.py
import pandas as pd
import numpy as np
import joblib
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.preprocessing import StandardScaler
from sklearn.calibration import CalibratedClassifierCV, calibration_curve

from data.fetch_prices import fetch_prices, STOCKS
from ml.technical import add_technical_indicators

MODEL_PATH            = "ml/rf_model.pkl"
CALIBRATED_MODEL_PATH = "ml/rf_model_calibrated.pkl"
SCALER_PATH           = "ml/scaler.pkl"

FEATURES = [
    "RSI", "MACD", "MACD_signal", "MACD_hist",
    "BB_upper", "BB_lower", "EMA_20", "EMA_50",
    "Volume_MA20", "Returns", "Returns_5d", "Volume"
]

def create_labels(df: pd.DataFrame, horizon: int = 5) -> pd.DataFrame:
    """
    Create BUY/HOLD/SELL labels based on future returns
    BUY  = future return > +2%
    SELL = future return < -2%
    HOLD = everything else
    """
    df = df.copy()
    df["future_return"] = df["Close"].shift(-horizon) / df["Close"] - 1

    def label(r):
        if r > 0.02:  return 2  # BUY
        elif r < -0.02: return 0  # SELL
        else: return 1            # HOLD

    df["label"] = df["future_return"].apply(label)
    df.dropna(inplace=True)
    return df

def build_training_data() -> pd.DataFrame:
    """Fetch and prepare training data for all stocks"""
    all_data = []
    for symbol in STOCKS:
        print(f"  Preparing {symbol}...")
        df = fetch_prices(symbol, period="5y")
        if df.empty:
            continue
        df = add_technical_indicators(df)
        df = create_labels(df)
        all_data.append(df)

    combined = pd.concat(all_data, ignore_index=True)
    print(f"\nTotal training rows: {len(combined)}")
    return combined

def train_model():
    """Train and save the Random Forest model"""
    print("Building training data...")
    df = build_training_data()

    X = df[FEATURES].values
    y = df["label"].values

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Three-way split: train (60%) / calibration (20%) / test (20%).
    # Calibration needs its own held-out slice — calibrating on the same
    # data the model was trained on (or on the final test set) overstates
    # how well-calibrated the confidence scores really are.
    X_train, X_temp, y_train, y_temp = train_test_split(
        X_scaled, y, test_size=0.4, random_state=42, shuffle=False
    )
    X_cal, X_test, y_cal, y_test = train_test_split(
        X_temp, y_temp, test_size=0.5, random_state=42, shuffle=False
    )

    print("\nTraining Random Forest...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # Evaluate raw model
    y_pred = model.predict(X_test)
    print("\nModel Performance (raw):")
    print(classification_report(y_test, y_pred,
          target_names=["SELL", "HOLD", "BUY"]))

    # Wrap with calibration — reuses the already-trained model above and
    # calibrates its confidence scores on the held-out calibration slice.
    print("\nCalibrating confidence scores...")
    calibrated_model = CalibratedClassifierCV(
        estimator=model, method="sigmoid", cv="prefit"
    )
    calibrated_model.fit(X_cal, y_cal)

    y_pred_cal = calibrated_model.predict(X_test)
    print("\nModel Performance (calibrated):")
    print(classification_report(y_test, y_pred_cal,
          target_names=["SELL", "HOLD", "BUY"]))

    print_reliability_report(calibrated_model, X_test, y_test)

    # Save raw model (used for feature-importance/SHAP), calibrated model
    # (used for confidence scores), and the scaler
    joblib.dump(model, MODEL_PATH)
    joblib.dump(calibrated_model, CALIBRATED_MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"\nRaw model saved to {MODEL_PATH}")
    print(f"Calibrated model saved to {CALIBRATED_MODEL_PATH}")
    print(f"Scaler saved to {SCALER_PATH}")

    return model, calibrated_model, scaler


def print_reliability_report(calibrated_model, X_test, y_test):
    """
    For the BUY class (label=2): when the model says '70% confident',
    was it actually right ~70% of the time? Bring this table to the
    hackathon demo as evidence of calibration, not just accuracy.
    """
    probs_buy = calibrated_model.predict_proba(X_test)[:, 2]
    y_buy = (y_test == 2).astype(int)

    try:
        fraction_correct, mean_predicted = calibration_curve(
            y_buy, probs_buy, n_bins=10, strategy="quantile"
        )
        print("\nCalibration Reliability Report (BUY class)")
        print("-" * 45)
        print(f"{'Predicted conf.':>16} | {'Actual accuracy':>16}")
        for pred, actual in zip(mean_predicted, fraction_correct):
            print(f"{pred:>16.2f} | {actual:>16.2f}")
        print("\nWell-calibrated = the two columns are close to equal.")
    except Exception as e:
        print(f"Reliability report skipped (not enough data for binning): {e}")

def predict_signal(symbol: str, model=None, calibrated_model=None, scaler=None) -> dict:
    """
    Generate BUY/HOLD/SELL signal for a single stock.
    `model` (raw) is used for feature importances; `calibrated_model` is
    used for the actual prediction and confidence score, since it's the
    one with meaningful, calibrated probabilities.
    """

    # Load models if not passed
    if model is None or calibrated_model is None:
        if not os.path.exists(CALIBRATED_MODEL_PATH):
            print("Calibrated model not found — training now...")
            model, calibrated_model, scaler = train_model()
        else:
            model            = joblib.load(MODEL_PATH)
            calibrated_model = joblib.load(CALIBRATED_MODEL_PATH)
            scaler           = joblib.load(SCALER_PATH)

    # Fetch latest data
    df = fetch_prices(symbol, period="6mo")
    if df.empty:
        return {"error": f"No data for {symbol}"}

    df = add_technical_indicators(df)

    # Get latest features
    latest = df.iloc[-1]
    X = pd.DataFrame([{f: latest.get(f, 0) for f in FEATURES}])
    X_scaled = scaler.transform(X.values)

    # Predict using the calibrated model — confidence here reflects
    # real-world accuracy, not the raw (often overconfident) RF score
    pred  = calibrated_model.predict(X_scaled)[0]
    proba = calibrated_model.predict_proba(X_scaled)[0]

    label_map   = {0: "SELL", 1: "HOLD", 2: "BUY"}
    signal      = label_map[pred]
    confidence  = round(float(max(proba)), 3)

    # Feature importances for SHAP
    feature_importance = dict(zip(FEATURES, model.feature_importances_))
    top_features = sorted(feature_importance.items(),
                         key=lambda x: x[1], reverse=True)[:3]

    return {
        "symbol":       symbol,
        "signal":       signal,
        "confidence":   confidence,
        "probabilities": {
            "SELL": round(float(proba[0]), 3),
            "HOLD": round(float(proba[1]), 3),
            "BUY":  round(float(proba[2]), 3),
        },
        "top_features": top_features,
        "latest_price": round(float(latest["Close"]), 2),
    }

if __name__ == "__main__":
    # Train model
    model, calibrated_model, scaler = train_model()

    # Test prediction
    print("\nTesting prediction for RELIANCE.NS...")
    result = predict_signal("RELIANCE.NS", model, calibrated_model, scaler)
    print(f"\nSignal    : {result['signal']}")
    print(f"Confidence: {result['confidence']}")
    print(f"Price     : ₹{result['latest_price']}")
    print(f"Proba     : {result['probabilities']}")
    print(f"Top features: {result['top_features']}")