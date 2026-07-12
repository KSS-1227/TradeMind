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
from sklearn.frozen import FrozenEstimator

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

def time_split_by_symbol(df: pd.DataFrame, test_size: float = 0.4,
                          cal_ratio: float = 0.5):
    """
    Split chronologically WITHIN each symbol, then recombine across symbols —
    instead of one sequential split over the whole concatenated multi-symbol
    frame (which can silently dump entire symbols into the test set if the
    frame is built stock-by-stock, as build_training_data() does).

    Assumes each symbol's rows are already in chronological order (true here
    since fetch_prices() preserves date order and build_training_data() just
    concatenates per-symbol frames without reordering).

    Returns (train_df, cal_df, test_df), each containing a proportional,
    time-ordered slice of every symbol.
    """
    train_parts, temp_parts = [], []
    for _, group in df.groupby("symbol", sort=False):
        n = len(group)
        split_idx = int(n * (1 - test_size))
        train_parts.append(group.iloc[:split_idx])
        temp_parts.append(group.iloc[split_idx:])
    train_df = pd.concat(train_parts, ignore_index=True)
    temp_df  = pd.concat(temp_parts, ignore_index=True)

    cal_parts, test_parts = [], []
    for _, group in temp_df.groupby("symbol", sort=False):
        n = len(group)
        split_idx = int(n * cal_ratio)
        cal_parts.append(group.iloc[:split_idx])
        test_parts.append(group.iloc[split_idx:])
    cal_df  = pd.concat(cal_parts, ignore_index=True)
    test_df = pd.concat(test_parts, ignore_index=True)

    return train_df, cal_df, test_df


def train_model(calibration: str = "prefit"):
    """
    Train and save the Random Forest model.

    calibration:
      "prefit" — current approach. Train RF once on X_train, calibrate on a
                 separate held-out X_cal slice via FrozenEstimator. Cheap,
                 but calibrators only see one (smaller) slice of data.
      "cv5"    — cross-validated calibration. Fits 5 internal RF/calibrator
                 pairs on rotating folds of (X_train + X_cal combined), then
                 averages them. Uses more data per calibrator at the cost of
                 5x the training time. Typically more stable when the
                 calibration slice is small.
    """
    print("Building training data...")
    df = build_training_data()

    # Split chronologically WITHIN each symbol, then recombine — NOT a
    # single sequential split across the concatenated multi-symbol blob.
    # Concatenated order is stock-by-stock (see STOCKS list), so a naive
    # train_test_split(shuffle=False) on the combined frame put entire
    # symbols (the last 3 — GOLDBEES/SILVERBEES/NIFTYBEES, all ETFs with
    # much lower volatility than the individual stocks) almost exclusively
    # into the test set. The model trained on stocks and got evaluated on
    # ETFs it barely saw, which collapses accuracy toward "always predict
    # the majority class."
    train_df, cal_df, test_df = time_split_by_symbol(
        df, test_size=0.4, cal_ratio=0.5
    )
    print(f"Train rows: {len(train_df)} | Cal rows: {len(cal_df)} | "
          f"Test rows: {len(test_df)}")
    for name, part in [("Train", train_df), ("Cal", cal_df), ("Test", test_df)]:
        print(f"  {name} symbol counts:\n"
              f"{part['symbol'].value_counts().to_string()}")

    # Fit the scaler on the TRAIN fold only — fitting it on the full
    # dataset (including cal/test) leaks their distribution into training.
    scaler = StandardScaler()
    X_train = scaler.fit_transform(train_df[FEATURES].values)
    X_cal   = scaler.transform(cal_df[FEATURES].values)
    X_test  = scaler.transform(test_df[FEATURES].values)
    y_train = train_df["label"].values
    y_cal   = cal_df["label"].values
    y_test  = test_df["label"].values

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

    print(f"\nCalibrating confidence scores (method='{calibration}')...")
    if calibration == "cv5":
        # cv=5 needs an *unfitted* estimator — it clones and refits internally
        # on each fold. Give it train+cal combined so calibrators see more data.
        X_cal_fit = np.concatenate([X_train, X_cal])
        y_cal_fit = np.concatenate([y_train, y_cal])
        fresh_rf = RandomForestClassifier(
            n_estimators=200, max_depth=10, random_state=42,
            class_weight="balanced", n_jobs=-1
        )
        calibrated_model = CalibratedClassifierCV(
            estimator=fresh_rf, method="sigmoid", cv=5
        )
        calibrated_model.fit(X_cal_fit, y_cal_fit)
    elif calibration == "prefit":
        # Reuses the already-trained model above and calibrates its
        # confidence scores on the held-out calibration slice only.
        calibrated_model = CalibratedClassifierCV(
            estimator=FrozenEstimator(model), method="sigmoid"
        )
        calibrated_model.fit(X_cal, y_cal)
    else:
        raise ValueError(f"Unknown calibration method: {calibration!r} "
                          "(expected 'prefit' or 'cv5')")

    y_pred_cal = calibrated_model.predict(X_test)
    print("\nModel Performance (calibrated):")
    print(classification_report(y_test, y_pred_cal,
          target_names=["SELL", "HOLD", "BUY"]))

    print_reliability_report(model, X_test, y_test, label="Raw RF")
    print_reliability_report(calibrated_model, X_test, y_test,
                              label=f"Calibrated ({calibration})")
    print_reliability_comparison(model, calibrated_model, X_test, y_test)

    # Save raw model (used for feature-importance/SHAP), calibrated model
    # (used for confidence scores), and the scaler
    joblib.dump(model, MODEL_PATH)
    joblib.dump(calibrated_model, CALIBRATED_MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"\nRaw model saved to {MODEL_PATH}")
    print(f"Calibrated model saved to {CALIBRATED_MODEL_PATH}")
    print(f"Scaler saved to {SCALER_PATH}")

    return model, calibrated_model, scaler


def reliability_bins(model, X_test, y_test, n_bins: int = 10):
    """
    Returns (mean_predicted, fraction_correct) arrays for the BUY class
    (label=2) so different models' calibration can be compared directly.
    Returns (None, None) if there isn't enough data to bin.
    """
    probs_buy = model.predict_proba(X_test)[:, 2]
    y_buy = (y_test == 2).astype(int)
    try:
        fraction_correct, mean_predicted = calibration_curve(
            y_buy, probs_buy, n_bins=n_bins, strategy="quantile"
        )
        return mean_predicted, fraction_correct
    except Exception as e:
        print(f"Reliability bins skipped (not enough data for binning): {e}")
        return None, None


def print_reliability_report(model, X_test, y_test, label: str = "Calibrated"):
    """
    For the BUY class (label=2): when the model says '70% confident',
    was it actually right ~70% of the time? Bring this table to the
    hackathon demo as evidence of calibration, not just accuracy.
    """
    mean_predicted, fraction_correct = reliability_bins(model, X_test, y_test)
    if mean_predicted is None:
        return

    print(f"\nCalibration Reliability Report — {label} (BUY class)")
    print("-" * 45)
    print(f"{'Predicted conf.':>16} | {'Actual accuracy':>16}")
    for pred, actual in zip(mean_predicted, fraction_correct):
        print(f"{pred:>16.2f} | {actual:>16.2f}")
    print("\nWell-calibrated = the two columns are close to equal.")


def print_reliability_comparison(raw_model, calibrated_model, X_test, y_test):
    """
    Side-by-side reliability table: raw RF vs. calibrated model, bin by bin,
    on the same held-out test set. Use this to see whether calibration is
    actually correcting overconfidence or just compressing an already-weak
    signal toward 50%.
    """
    raw_pred, raw_actual = reliability_bins(raw_model, X_test, y_test)
    cal_pred, cal_actual = reliability_bins(calibrated_model, X_test, y_test)

    if raw_pred is None or cal_pred is None:
        print("Comparison skipped — not enough data for binning.")
        return

    print("\nReliability Comparison — Raw vs. Calibrated (BUY class)")
    print("-" * 72)
    print(f"{'Raw pred.':>10} | {'Raw actual':>10} || "
          f"{'Cal pred.':>10} | {'Cal actual':>10} | {'Bin':>4}")
    n = min(len(raw_pred), len(cal_pred))
    for i in range(n):
        print(f"{raw_pred[i]:>10.2f} | {raw_actual[i]:>10.2f} || "
              f"{cal_pred[i]:>10.2f} | {cal_actual[i]:>10.2f} | {i+1:>4}")

    raw_gap = np.mean(np.abs(np.array(raw_pred) - np.array(raw_actual)))
    cal_gap = np.mean(np.abs(np.array(cal_pred) - np.array(cal_actual)))
    print(f"\nMean |predicted - actual| gap — raw: {raw_gap:.3f}  "
          f"calibrated: {cal_gap:.3f}")
    print("Smaller gap = better calibrated. If the calibrated gap isn't "
          "meaningfully smaller than the raw gap, calibration isn't the "
          "fix you need — the underlying signal is the bottleneck.")

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
    # Usage:
    #   python ml/rf_model.py             -> current default (prefit)
    #   python ml/rf_model.py cv5         -> cross-validated calibration
    #   python ml/rf_model.py both        -> train both, compare reliability tables
    method = sys.argv[1] if len(sys.argv) > 1 else "prefit"

    if method == "both":
        print("=" * 30, " PREFIT ", "=" * 30)
        _, calibrated_prefit, _ = train_model(calibration="prefit")
        print("\n" + "=" * 30, " CV=5 ", "=" * 30)
        model, calibrated_cv5, scaler = train_model(calibration="cv5")

        # Reuse the same test split train_model() built internally is not
        # exposed here, so this comparison only holds if you re-run
        # print_reliability_comparison from inside train_model (already
        # printed above for each). This final block just confirms both
        # models saved correctly.
        print("\nBoth calibration methods trained. Compare the two "
              "'Calibration Reliability Report' tables printed above "
              "to see which is closer to the diagonal (predicted ≈ actual).")
        calibrated_model = calibrated_cv5
    else:
        model, calibrated_model, scaler = train_model(calibration=method)

    # Test prediction
    print("\nTesting prediction for RELIANCE.NS...")
    result = predict_signal("RELIANCE.NS", model, calibrated_model, scaler)
    print(f"\nSignal    : {result['signal']}")
    print(f"Confidence: {result['confidence']}")
    print(f"Price     : ₹{result['latest_price']}")
    print(f"Proba     : {result['probabilities']}")
    print(f"Top features: {result['top_features']}")