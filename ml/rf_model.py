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

from data.fetch_prices import fetch_prices, STOCKS
from ml.technical import add_technical_indicators

MODEL_PATH  = "ml/rf_model.pkl"
SCALER_PATH = "ml/scaler.pkl"

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
        df = fetch_prices(symbol, period="2y")
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

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, shuffle=False
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

    # Evaluate
    y_pred = model.predict(X_test)
    print("\nModel Performance:")
    print(classification_report(y_test, y_pred,
          target_names=["SELL", "HOLD", "BUY"]))

    # Save model and scaler
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"\nModel saved to {MODEL_PATH}")
    print(f"Scaler saved to {SCALER_PATH}")

    return model, scaler

def predict_signal(symbol: str, model=None, scaler=None) -> dict:
    """Generate BUY/HOLD/SELL signal for a single stock"""

    # Load model if not passed
    if model is None:
        if not os.path.exists(MODEL_PATH):
            print("Model not found — training now...")
            model, scaler = train_model()
        else:
            model  = joblib.load(MODEL_PATH)
            scaler = joblib.load(SCALER_PATH)

    # Fetch latest data
    df = fetch_prices(symbol, period="1y")
    if df.empty:
        return {"error": f"No data for {symbol}"}

    df = add_technical_indicators(df)

    # Get latest features
    latest = df.iloc[-1]
    X = pd.DataFrame([{f: latest.get(f, 0) for f in FEATURES}])
    X_scaled = scaler.transform(X.values)

    # Predict
    pred  = model.predict(X_scaled)[0]
    proba = model.predict_proba(X_scaled)[0]

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
    model, scaler = train_model()

    # Test prediction
    print("\nTesting prediction for RELIANCE.NS...")
    result = predict_signal("RELIANCE.NS", model, scaler)
    print(f"\nSignal    : {result['signal']}")
    print(f"Confidence: {result['confidence']}")
    print(f"Price     : ₹{result['latest_price']}")
    print(f"Proba     : {result['probabilities']}")
    print(f"Top features: {result['top_features']}")