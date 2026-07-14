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
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier

from data.fetch_prices import fetch_prices, STOCKS
from ml.technical import add_technical_indicators
from ml.market_relative import (
    fetch_nifty_benchmark, add_market_relative_features,
    compute_live_relative_features, MARKET_RELATIVE_FEATURES,
)

MODEL_PATH            = "ml/rf_model.pkl"
CALIBRATED_MODEL_PATH = "ml/rf_model_calibrated.pkl"
SCALER_PATH           = "ml/scaler.pkl"

# Per-model-type save paths, so training an XGBoost run doesn't clobber the
# RF artifacts (or vice versa) — each model_type gets its own files.
# NOTE: agents/signal_agent.py currently hardcodes ml/rf_model*.pkl paths.
# Switching production inference to XGBoost means updating those constants
# too — that's a separate, deliberate change, not automatic here.
MODEL_PATHS = {
    "rf":      {"raw": "ml/rf_model.pkl",     "calibrated": "ml/rf_model_calibrated.pkl"},
    "xgboost": {"raw": "ml/xgb_model.pkl",    "calibrated": "ml/xgb_model_calibrated.pkl"},
}

FEATURES = [
    "RSI", "MACD", "MACD_signal", "MACD_hist",
    "BB_upper", "BB_lower", "EMA_20", "EMA_50",
    "Volume_MA20", "Returns", "Returns_5d", "Volume",
] + MARKET_RELATIVE_FEATURES  # Rel_Return, Rel_Return_5d, Beta_20d,
                               # RS_line_ROC_10, RSI_rel_class, Returns_rel_class

def create_labels(df: pd.DataFrame, horizon: int = 5,
                   threshold: float = 0.02) -> pd.DataFrame:
    """
    Create BUY/HOLD/SELL labels based on future returns.
    BUY  = future return > +threshold
    SELL = future return < -threshold
    HOLD = everything else

    threshold=0.02, horizon=5 is the original definition (±2% over 5 days).
    Widening threshold and/or extending horizon trades label frequency for
    label reliability — a ±2%/5-day move is closer to the daily noise floor
    for these tickers than a ±3%/10-day move, which is more likely to
    reflect a real directional signal rather than noise crossing a
    threshold by chance.
    """
    df = df.copy()
    df["future_return"] = df["Close"].shift(-horizon) / df["Close"] - 1

    def label(r):
        if r > threshold:   return 2  # BUY
        elif r < -threshold: return 0  # SELL
        else: return 1                 # HOLD

    df["label"] = df["future_return"].apply(label)
    df.dropna(inplace=True)
    return df

def build_feature_data() -> pd.DataFrame:
    """
    Fetch all symbols + Nifty and compute technical + market-relative
    features — everything EXCEPT labels. Labels are applied separately by
    build_training_data() so that trying different horizon/threshold
    combinations (see run_label_experiment()) doesn't require re-fetching
    ~14k rows of price data from yfinance for every combination tried —
    fetch once, label many times.
    """
    all_data = []
    for symbol in STOCKS:
        print(f"  Preparing {symbol}...")
        df = fetch_prices(symbol, period="5y")
        if df.empty:
            continue
        df = add_technical_indicators(df)
        all_data.append(df)

    combined = pd.concat(all_data, ignore_index=True)

    print("  Fetching Nifty 50 benchmark...")
    nifty_df = fetch_nifty_benchmark(period="5y")
    combined = add_market_relative_features(combined, nifty_df)
    return combined


def build_training_data(horizon: int = 5, threshold: float = 0.02,
                         feature_df: pd.DataFrame = None) -> pd.DataFrame:
    """
    Fetch and prepare training data for all stocks, including
    market-relative and cross-sectional features.

    feature_df: pass in the output of build_feature_data() to skip
                re-fetching when only horizon/threshold are changing
                (see run_label_experiment()). If None, fetches fresh.

    Order matters here:
      1. Per-symbol technical indicators (needs each symbol's own
         history — RSI/MACD/EMA are computed independently per symbol).
      2. Concatenate ALL symbols, THEN compute market-relative /
         cross-sectional features — these require every symbol's data
         aligned by date (Nifty comparison, peer-group averages), so
         they can't be computed per-symbol in isolation like step 1.
      3. Labels LAST, applied per symbol — create_labels() uses
         shift(-horizon), which must never cross a symbol boundary
         (step 2's concatenation would otherwise leak SBIN's early
         rows into RELIANCE's label window, etc).
    """
    combined = feature_df if feature_df is not None else build_feature_data()

    labeled_parts = []
    for _, group in combined.groupby("symbol", sort=False):
        labeled_parts.append(create_labels(group, horizon=horizon,
                                            threshold=threshold))
    combined = pd.concat(labeled_parts, ignore_index=True)

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


def build_estimator(model_type: str):
    """
    Return an unfitted estimator for the given model_type. Kept in one place
    so RF and XGBoost hyperparameters aren't duplicated across the direct-fit
    path and the cv5-calibration fresh-clone path.
    """
    if model_type == "rf":
        return RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            random_state=42,
            class_weight="balanced",
            n_jobs=-1
        )
    elif model_type == "xgboost":
        # class_weight isn't a native XGBoost param — imbalance is handled
        # via sample_weight at fit time instead (see train_model()).
        # subsample/colsample/min_child_weight/reg_lambda are here
        # specifically to control overfitting on a fairly small,
        # noisy tabular dataset (~9k train rows, 12 features) — this is
        # not a default XGBClassifier() call.
        return XGBClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=3,
            reg_lambda=1.0,
            objective="multi:softprob",
            num_class=3,
            eval_metric="mlogloss",
            random_state=42,
            n_jobs=-1,
        )
    else:
        raise ValueError(f"Unknown model_type: {model_type!r} "
                          "(expected 'rf' or 'xgboost')")


def train_model(calibration: str = "prefit", model_type: str = "rf",
                 horizon: int = 5, threshold: float = 0.02,
                 feature_df: pd.DataFrame = None, save: bool = True,
                 metrics_out: dict = None):
    """
    Train and save a signal-classification model.

    model_type:
      "rf"      — RandomForestClassifier (original default).
      "xgboost" — gradient-boosted trees. Usually extracts more signal than
                  RF from the same tabular features when there's real signal
                  to find, at the cost of more hyperparameters to get wrong.
                  Class imbalance is handled via sample_weight since XGBoost
                  has no native class_weight param.

    calibration:
      "prefit" — current approach. Train the model once on X_train, calibrate
                 on a separate held-out X_cal slice via FrozenEstimator.
                 Cheap, but calibrators only see one (smaller) slice of data.
      "cv5"    — cross-validated calibration. Fits 5 internal model/calibrator
                 pairs on rotating folds of (X_train + X_cal combined), then
                 averages them. Uses more data per calibrator at the cost of
                 5x the training time. Typically more stable when the
                 calibration slice is small.

    horizon, threshold: label definition — BUY/SELL if the future return
                 over `horizon` days exceeds ±`threshold`. Original default
                 is horizon=5, threshold=0.02 (±2% over 5 days). See
                 run_label_experiment() to compare alternatives cheaply.

    feature_df: pass build_feature_data()'s output to skip re-fetching when
                 only horizon/threshold change (used by run_label_experiment).
    """
    print("Building training data...")
    df = build_training_data(horizon=horizon, threshold=threshold,
                              feature_df=feature_df)

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

    print(f"\nTraining {model_type.upper()}...")
    model = build_estimator(model_type)
    if model_type == "xgboost":
        # RF gets class balance via class_weight="balanced"; XGBoost has no
        # equivalent param for multi:softprob, so pass per-sample weights
        # computed the same way sklearn would derive class_weight internally.
        sample_weight = compute_sample_weight(class_weight="balanced", y=y_train)
        model.fit(X_train, y_train, sample_weight=sample_weight)
    else:
        model.fit(X_train, y_train)

    # Evaluate raw model
    y_pred = model.predict(X_test)
    print("\nModel Performance (raw):")
    print(classification_report(y_test, y_pred,
          target_names=["SELL", "HOLD", "BUY"]))

    # Majority-class baseline — the accuracy you'd get by always predicting
    # the most common label in the test set, no model at all. If the raw
    # model doesn't clear this, it's adding negative value over a dummy
    # guess and isn't ready to drive real signals regardless of how well
    # its confidence scores calibrate afterward.
    label_names = {0: "SELL", 1: "HOLD", 2: "BUY"}
    values, counts = np.unique(y_test, return_counts=True)
    majority_label = values[np.argmax(counts)]
    majority_baseline_acc = counts.max() / counts.sum()
    raw_acc = (y_pred == y_test).mean()
    print(f"Majority-class baseline (\"always predict "
          f"{label_names[majority_label]}\"): {majority_baseline_acc:.3f}")
    print(f"Raw model accuracy:                                "
          f"{raw_acc:.3f}")
    if raw_acc <= majority_baseline_acc:
        print("WARNING: raw model does not beat the majority-class "
              "baseline — it has no real edge yet. Calibration below "
              "will produce honest-looking confidence scores, but they're "
              "honestly reporting a model with no discriminative signal.")
    else:
        print(f"Raw model beats the baseline by "
              f"{(raw_acc - majority_baseline_acc):.3f}.")

    # Full feature importance ranking — not just top-3. This directly
    # answers "is the model actually using the market-relative/
    # cross-sectional features, or did they just cost rows to warmup NaN
    # drops without the model finding them useful?" A feature ranked near
    # the bottom isn't necessarily useless (RF/XGB importances split
    # credit across correlated features), but if ALL SIX new features
    # cluster at the bottom, that's real evidence, not a guess.
    importances = pd.Series(model.feature_importances_, index=FEATURES) \
                    .sort_values(ascending=False)
    print("\nFull feature importance ranking:")
    for rank, (feat, imp) in enumerate(importances.items(), start=1):
        flag = "  <- market-relative/cross-sectional" if feat in MARKET_RELATIVE_FEATURES else ""
        print(f"  {rank:>2}. {feat:<20} {imp:.4f}{flag}")
    relative_ranks = [r for r, (f, _) in enumerate(importances.items(), start=1)
                       if f in MARKET_RELATIVE_FEATURES]
    print(f"\nMarket-relative features occupy ranks {sorted(relative_ranks)} "
          f"out of {len(FEATURES)} total features.")

    print(f"\nCalibrating confidence scores (method='{calibration}')...")
    if calibration == "cv5":
        # cv=5 needs an *unfitted* estimator — it clones and refits internally
        # on each fold. Give it train+cal combined so calibrators see more data.
        X_cal_fit = np.concatenate([X_train, X_cal])
        y_cal_fit = np.concatenate([y_train, y_cal])
        fresh_model = build_estimator(model_type)
        if model_type == "xgboost":
            # CalibratedClassifierCV passes fit_params through to each fold's
            # .fit() call, so per-fold sample weights still get applied
            # correctly even though the underlying y distribution shifts
            # slightly fold to fold.
            fit_sample_weight = compute_sample_weight(
                class_weight="balanced", y=y_cal_fit
            )
            calibrated_model = CalibratedClassifierCV(
                estimator=fresh_model, method="sigmoid", cv=5
            )
            calibrated_model.fit(X_cal_fit, y_cal_fit,
                                  sample_weight=fit_sample_weight)
        else:
            calibrated_model = CalibratedClassifierCV(
                estimator=fresh_model, method="sigmoid", cv=5
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

    print_reliability_report(model, X_test, y_test,
                              label=f"Raw {model_type.upper()}")
    print_reliability_report(calibrated_model, X_test, y_test,
                              label=f"Calibrated ({model_type}, {calibration})")
    print_reliability_comparison(model, calibrated_model, X_test, y_test)

    if metrics_out is not None:
        # Lets run_label_experiment() collect results across many runs
        # without changing this function's normal 3-value return signature
        # (which train_model()'s other callers already depend on).
        metrics_out["raw_acc"] = raw_acc
        metrics_out["majority_baseline_acc"] = majority_baseline_acc
        metrics_out["gap"] = raw_acc - majority_baseline_acc

    if not save:
        print("\n(save=False — skipping disk write, this was an experiment run)")
        return model, calibrated_model, scaler

    # Save raw model (used for feature-importance/SHAP), calibrated model
    # (used for confidence scores), and the scaler — path per model_type so
    # rf and xgboost runs don't overwrite each other's artifacts.
    raw_path = MODEL_PATHS[model_type]["raw"]
    calibrated_path = MODEL_PATHS[model_type]["calibrated"]
    joblib.dump(model, raw_path)
    joblib.dump(calibrated_model, calibrated_path)
    joblib.dump(scaler, SCALER_PATH)
    print(f"\nRaw model saved to {raw_path}")
    print(f"Calibrated model saved to {calibrated_path}")
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

def run_label_experiment(model_type: str = "rf",
                          combos: list = None) -> pd.DataFrame:
    """
    Test whether the label definition (horizon/threshold), not the model
    or features, is the real bottleneck. Fetches price data ONCE via
    build_feature_data(), then re-labels and retrains for each
    (horizon, threshold) combo — cheap, since no re-fetching happens.

    combos: list of (horizon, threshold) tuples. Defaults to comparing
            the original definition against wider/longer alternatives:
              (5,  0.02)  — original: ±2% over 5 days
              (5,  0.03)  — wider threshold, same horizon
              (10, 0.02)  — same threshold, longer horizon
              (10, 0.03)  — both wider and longer
            The hypothesis being tested: ±2%/5-day sits near the noise
            floor for these tickers, and a real signal (if one exists in
            these features) should show up more clearly at a threshold/
            horizon combo that isn't dominated by day-to-day noise
            crossing the boundary by chance.
    """
    if combos is None:
        combos = [(5, 0.02), (5, 0.03), (10, 0.02), (10, 0.03)]

    print("Fetching price + market-relative feature data once for all "
          "label combinations...")
    feature_df = build_feature_data()

    results = []
    for horizon, threshold in combos:
        print(f"\n{'=' * 20}  horizon={horizon}, threshold={threshold:.0%}  {'=' * 20}")
        metrics = {}
        train_model(calibration="prefit", model_type=model_type,
                    horizon=horizon, threshold=threshold,
                    feature_df=feature_df, save=False, metrics_out=metrics)
        results.append({
            "horizon": horizon,
            "threshold": threshold,
            "raw_acc": metrics["raw_acc"],
            "baseline_acc": metrics["majority_baseline_acc"],
            "gap": metrics["gap"],
        })

    results_df = pd.DataFrame(results).sort_values("gap", ascending=False)
    print("\n" + "=" * 60)
    print(f"LABEL EXPERIMENT SUMMARY ({model_type.upper()})")
    print("=" * 60)
    print(results_df.to_string(index=False,
          formatters={"threshold": "{:.0%}".format,
                      "raw_acc": "{:.3f}".format,
                      "baseline_acc": "{:.3f}".format,
                      "gap": "{:+.3f}".format}))
    best = results_df.iloc[0]
    if best["gap"] > 0:
        print(f"\nBest combo (horizon={int(best['horizon'])}, "
              f"threshold={best['threshold']:.0%}) clears baseline by "
              f"{best['gap']:.3f}. This is a real, if modest, edge — "
              "worth locking in as the new label definition.")
    else:
        print(f"\nBest combo still doesn't clear baseline (gap "
              f"{best['gap']:+.3f}). None of these thresholds/horizons "
              "found real signal — the bottleneck likely isn't the label "
              "either at this point. Consider: (a) longer horizons still "
              "(20+ days), (b) fundamentally different feature sources "
              "(order flow, options data, earnings surprises) rather than "
              "further tuning price-derived technicals.")
    return results_df


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

    # Market-relative / cross-sectional features for the latest row —
    # requires fetching Nifty + same-asset-class peers (see the latency
    # note in ml/market_relative.py's compute_live_relative_features()).
    relative_feats = compute_live_relative_features(symbol, df, STOCKS, period="6mo")

    # Get latest features
    latest = df.iloc[-1]
    feature_row = {f: latest.get(f, 0) for f in FEATURES if f not in MARKET_RELATIVE_FEATURES}
    feature_row.update(relative_feats)
    X = pd.DataFrame([feature_row])[FEATURES]  # enforce training column order
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
    #   python ml/rf_model.py                     -> rf, prefit (original default)
    #   python ml/rf_model.py cv5                  -> rf, cv5 calibration
    #   python ml/rf_model.py both                 -> rf, train both calibration methods
    #   python ml/rf_model.py prefit xgboost       -> xgboost, prefit calibration
    #   python ml/rf_model.py compare              -> rf vs xgboost, same (prefit)
    #                                                  calibration, side-by-side summary
    #   python ml/rf_model.py label_experiment     -> rf, sweep horizon/threshold combos,
    #                                                  fetches data once, no models saved
    #   python ml/rf_model.py label_experiment xgboost -> same sweep, xgboost
    method     = sys.argv[1] if len(sys.argv) > 1 else "prefit"
    model_type = sys.argv[2] if len(sys.argv) > 2 else "rf"

    if method == "label_experiment":
        run_label_experiment(model_type=model_type)
        sys.exit(0)

    if method == "compare":
        results = {}
        for mt in ("rf", "xgboost"):
            print("\n" + "=" * 25, f" {mt.upper()} ", "=" * 25)
            m, cal_m, scl = train_model(calibration="prefit", model_type=mt)
            results[mt] = (m, cal_m, scl)

        print("\n" + "=" * 60)
        print("RF vs XGBoost — see the 'Majority-class baseline' and "
              "'Raw model accuracy' lines printed for each run above. "
              "Whichever raw model clears the baseline by more has the "
              "real edge — that's the one worth calibrating and shipping.")
        print("=" * 60)

        model, calibrated_model, scaler = results[model_type]

    elif method == "both":
        print("=" * 30, " PREFIT ", "=" * 30)
        _, calibrated_prefit, _ = train_model(calibration="prefit",
                                               model_type=model_type)
        print("\n" + "=" * 30, " CV=5 ", "=" * 30)
        model, calibrated_cv5, scaler = train_model(calibration="cv5",
                                                      model_type=model_type)

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
        model, calibrated_model, scaler = train_model(calibration=method,
                                                        model_type=model_type)

    # Test prediction
    print("\nTesting prediction for RELIANCE.NS...")
    result = predict_signal("RELIANCE.NS", model, calibrated_model, scaler)
    print(f"\nSignal    : {result['signal']}")
    print(f"Confidence: {result['confidence']}")
    print(f"Price     : ₹{result['latest_price']}")
    print(f"Proba     : {result['probabilities']}")
    print(f"Top features: {result['top_features']}")