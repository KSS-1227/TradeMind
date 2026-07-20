# ml/lstm_model.py
"""
LSTM price-trend model — the third model type alongside RF/XGBoost in
ml/rf_model.py, built to make the pitch deck's "LSTM: Designed for
sequential time-series data" claim literally true, not just stated.

Architecturally separate from ml/rf_model.py's train_model() on purpose.
RF/XGBoost consume one flat feature vector per row. LSTM needs a SEQUENCE
of `lookback` consecutive days per prediction — naively reshaping
rf_model.py's already-flattened X_train array into sliding windows would
risk building sequences that quietly span two different stocks at a
symbol boundary (the exact class of bug already caught twice this
project: in the original train/test split, and in the market-relative
feature computation). This module keeps the DataFrame's symbol/Date
columns intact all the way through sequence construction to prevent that.

Calibration uses temperature scaling (Guo et al., 2017), not
CalibratedClassifierCV — that's a genuine, standard choice for neural
nets, not a corner cut: temperature scaling is literally the calibration
method the deep learning calibration literature converged on, because
sigmoid/isotonic (built for the RF/XGBoost path) assume a scikit-learn
estimator interface an arbitrary PyTorch model doesn't have.

IMPORTANT — this file has NOT been run end-to-end. My sandbox's torch
install is broken (missing shared libs) and there isn't enough disk
space left to reinstall it, so this has been logic-tested (sequence
construction verified against synthetic data with pure pandas/numpy,
no torch needed for that part) but never actually trained. Run the
smoke test at the bottom on your own machine before trusting results.
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd
import joblib

from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report

from ml.rf_model import FEATURES, build_feature_data, create_labels, time_split_by_symbol

MODEL_PATH  = "ml/lstm_model.pt"
SCALER_PATH = "ml/lstm_scaler.pkl"
TEMP_PATH   = "ml/lstm_temperature.pkl"

DEFAULT_LOOKBACK = 20


def prepare_sequences(df: pd.DataFrame, features: list, lookback: int = DEFAULT_LOOKBACK):
    """
    Build (lookback-day sequence, label) pairs, one symbol at a time, so a
    sequence can never span two different stocks. df must already have
    'symbol', 'Date', the FEATURES columns, and 'label' — i.e. this runs
    AFTER create_labels(), same as the RF/XGBoost path.

    Returns:
      X_seq: (n_samples, lookback, n_features) float32 array
      y_seq: (n_samples,) int array
      meta:  DataFrame with 'symbol'/'Date' for the LAST day of each
             sequence, aligned row-for-row with X_seq/y_seq — useful for
             debugging/auditing which sequence came from where.
    """
    X_list, y_list, symbol_list, date_list = [], [], [], []

    for symbol, group in df.groupby("symbol", sort=False):
        group = group.sort_values("Date").reset_index(drop=True)
        feat_matrix = group[features].values.astype(np.float32)
        labels = group["label"].values
        dates = group["Date"].values
        n = len(group)
        if n < lookback:
            continue  # not enough history for even one sequence
        for i in range(lookback - 1, n):
            X_list.append(feat_matrix[i - lookback + 1: i + 1])
            y_list.append(labels[i])
            symbol_list.append(symbol)
            date_list.append(dates[i])

    X_seq = np.array(X_list, dtype=np.float32)
    y_seq = np.array(y_list, dtype=np.int64)
    meta = pd.DataFrame({"symbol": symbol_list, "Date": date_list})
    return X_seq, y_seq, meta


def build_lstm_model(n_features: int, hidden_size: int = 64,
                      num_layers: int = 2, n_classes: int = 3, dropout: float = 0.2):
    """Returns an unfitted LSTMNet. Import torch lazily so the rest of this
    module (sequence prep, which doesn't need torch) still works even if
    torch isn't installed — matches how ml/rf_model.py lazily imports
    xgboost only where actually needed."""
    import torch.nn as nn

    class LSTMNet(nn.Module):
        def __init__(self):
            super().__init__()
            self.lstm = nn.LSTM(
                input_size=n_features, hidden_size=hidden_size,
                num_layers=num_layers, batch_first=True,
                dropout=dropout if num_layers > 1 else 0.0,
            )
            self.dropout = nn.Dropout(dropout)
            self.fc = nn.Linear(hidden_size, n_classes)

        def forward(self, x):
            out, (h_n, c_n) = self.lstm(x)
            last_step = out[:, -1, :]      # final timestep's hidden state
            last_step = self.dropout(last_step)
            return self.fc(last_step)       # raw logits — softmax applied
                                             # outside, at loss/predict time

    return LSTMNet()


def _majority_baseline(y):
    values, counts = np.unique(y, return_counts=True)
    return counts.max() / counts.sum()


def train_lstm_model(horizon: int = 5, threshold: float = 0.02,
                      lookback: int = DEFAULT_LOOKBACK,
                      epochs: int = 30, batch_size: int = 64,
                      lr: float = 1e-3, save: bool = True,
                      feature_df: pd.DataFrame = None) -> dict:
    """
    Train the LSTM, calibrate it with temperature scaling, and report
    results in the same honest format as ml/rf_model.py's train_model()
    — majority baseline, raw accuracy, reliability gap before/after
    calibration. Returns a metrics dict; doesn't silently declare victory.
    """
    import torch
    import torch.nn as nn
    from torch.utils.data import TensorDataset, DataLoader

    torch.manual_seed(42)

    print("Building training data (reusing ml/rf_model.py's fetch + "
          "market-relative feature pipeline)...")
    combined = feature_df if feature_df is not None else build_feature_data()

    labeled_parts = []
    for _, group in combined.groupby("symbol", sort=False):
        labeled_parts.append(create_labels(group, horizon=horizon, threshold=threshold))
    labeled = pd.concat(labeled_parts, ignore_index=True)

    print("Splitting chronologically within each symbol (same method as RF/XGBoost)...")
    train_df, cal_df, test_df = time_split_by_symbol(labeled, test_size=0.4, cal_ratio=0.5)

    # Scale on TRAIN ONLY, same leakage-avoidance rule as the RF/XGBoost path
    scaler = StandardScaler()
    scaler.fit(train_df[FEATURES].values)
    for part in (train_df, cal_df, test_df):
        part[FEATURES] = scaler.transform(part[FEATURES].values)

    print(f"Building {lookback}-day sequences per symbol (never crossing "
          f"symbol boundaries)...")
    X_train, y_train, _ = prepare_sequences(train_df, FEATURES, lookback)
    X_cal,   y_cal,   _ = prepare_sequences(cal_df,   FEATURES, lookback)
    X_test,  y_test,  _ = prepare_sequences(test_df,  FEATURES, lookback)
    print(f"Sequences — train: {len(X_train)}, cal: {len(X_cal)}, test: {len(X_test)}")

    if len(X_train) == 0 or len(X_test) == 0:
        raise ValueError(
            f"No sequences built (lookback={lookback} may exceed the "
            f"shortest symbol's row count per split). Reduce lookback "
            f"or check time_split_by_symbol's output sizes."
        )

    # Class-weighted loss — same imbalance problem as RF/XGBoost (HOLD
    # dominates), handled the PyTorch-native way instead of sample_weight.
    class_counts = np.bincount(y_train, minlength=3)
    class_weights = torch.tensor(
        [len(y_train) / (3 * max(c, 1)) for c in class_counts], dtype=torch.float32
    )

    model = build_lstm_model(n_features=len(FEATURES))
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    train_ds = TensorDataset(torch.from_numpy(X_train), torch.from_numpy(y_train))
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)

    X_cal_t  = torch.from_numpy(X_cal)
    y_cal_t  = torch.from_numpy(y_cal)
    X_test_t = torch.from_numpy(X_test)

    print(f"\nTraining LSTM for up to {epochs} epochs (early stop on "
          f"calibration-set loss, patience=5)...")
    best_val_loss = float("inf")
    patience, patience_left = 5, 5
    best_state = None

    for epoch in range(epochs):
        model.train()
        total_loss = 0.0
        for xb, yb in train_loader:
            optimizer.zero_grad()
            logits = model(xb)
            loss = criterion(logits, yb)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(xb)
        train_loss = total_loss / len(X_train)

        model.eval()
        with torch.no_grad():
            val_logits = model(X_cal_t)
            val_loss = criterion(val_logits, y_cal_t).item()

        print(f"  epoch {epoch+1:>2}/{epochs}  train_loss={train_loss:.4f}  "
              f"cal_loss={val_loss:.4f}")

        if val_loss < best_val_loss - 1e-4:
            best_val_loss = val_loss
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
            patience_left = patience
        else:
            patience_left -= 1
            if patience_left <= 0:
                print(f"  Early stopping — no cal-loss improvement for {patience} epochs.")
                break

    if best_state is not None:
        model.load_state_dict(best_state)

    # --- Raw (uncalibrated) evaluation ---
    model.eval()
    with torch.no_grad():
        test_logits = model(X_test_t)
        raw_proba = torch.softmax(test_logits, dim=1).numpy()
    raw_pred = raw_proba.argmax(axis=1)
    raw_acc = (raw_pred == y_test).mean()
    baseline_acc = _majority_baseline(y_test)

    print(f"\nModel Performance (raw LSTM):")
    print(classification_report(y_test, raw_pred, target_names=["SELL", "HOLD", "BUY"],
                                 zero_division=0))
    print(f"Majority-class baseline: {baseline_acc:.3f}")
    print(f"Raw LSTM accuracy:       {raw_acc:.3f}")
    if raw_acc <= baseline_acc:
        print("WARNING: LSTM does not beat the majority-class baseline either — "
              "consistent with the RF/XGBoost finding that price-technical "
              "features are the real ceiling here, not the algorithm.")
    else:
        print(f"LSTM beats the baseline by {raw_acc - baseline_acc:.3f}.")

    # --- Temperature scaling calibration ---
    print("\nCalibrating via temperature scaling (fit on cal set)...")
    with torch.no_grad():
        cal_logits = model(X_cal_t)

    temperature = torch.nn.Parameter(torch.ones(1) * 1.5)
    temp_optimizer = torch.optim.LBFGS([temperature], lr=0.01, max_iter=50)
    nll_criterion = nn.CrossEntropyLoss()

    def temp_loss_closure():
        temp_optimizer.zero_grad()
        loss = nll_criterion(cal_logits / temperature, y_cal_t)
        loss.backward()
        return loss

    temp_optimizer.step(temp_loss_closure)
    learned_T = temperature.item()
    print(f"Learned temperature: {learned_T:.3f} "
          f"({'no change — model was already well-calibrated raw' if abs(learned_T-1) < 0.05 else 'rescaling applied'})")

    with torch.no_grad():
        cal_proba = torch.softmax(test_logits / learned_T, dim=1).numpy()
    cal_pred = cal_proba.argmax(axis=1)
    cal_acc = (cal_pred == y_test).mean()

    # Reliability gap, BUY class, same style as ml/rf_model.py's reliability_bins
    def reliability_gap(proba_buy, y_true, n_bins=10):
        y_buy = (y_true == 2).astype(int)
        try:
            from sklearn.calibration import calibration_curve
            frac_correct, mean_pred = calibration_curve(y_buy, proba_buy, n_bins=n_bins,
                                                          strategy="quantile")
            return float(np.mean(np.abs(mean_pred - frac_correct)))
        except Exception as e:
            print(f"Reliability gap skipped: {e}")
            return None

    raw_gap = reliability_gap(raw_proba[:, 2], y_test)
    cal_gap = reliability_gap(cal_proba[:, 2], y_test)
    print(f"\nReliability gap (BUY class) — raw: {raw_gap}, "
          f"after temperature scaling: {cal_gap}")

    if save:
        torch.save(model.state_dict(), MODEL_PATH)
        joblib.dump(scaler, SCALER_PATH)
        joblib.dump({"temperature": learned_T, "lookback": lookback,
                     "n_features": len(FEATURES)}, TEMP_PATH)
        print(f"\nSaved model to {MODEL_PATH}, scaler to {SCALER_PATH}, "
              f"temperature to {TEMP_PATH}")

    return {
        "raw_acc": raw_acc, "baseline_acc": baseline_acc, "gap": raw_acc - baseline_acc,
        "calibrated_acc": cal_acc, "temperature": learned_T,
        "raw_reliability_gap": raw_gap, "cal_reliability_gap": cal_gap,
    }


if __name__ == "__main__":
    result = train_lstm_model()
    print("\n" + "=" * 60)
    print("LSTM SUMMARY")
    print("=" * 60)
    for k, v in result.items():
        print(f"  {k}: {v}")