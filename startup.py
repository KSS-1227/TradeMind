# startup.py
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.append(PROJECT_ROOT)

MODEL_PATH = os.path.join(PROJECT_ROOT, "ml", "rf_model.pkl")
SCALER_PATH = os.path.join(PROJECT_ROOT, "ml", "scaler.pkl")

def ensure_model_exists():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        print("Model not found — training now (first startup)...")
        from ml.rf_model import train_model
        train_model()
        print("Model trained and saved.")
    else:
        print("Model found — skipping training.")

if __name__ == "__main__":
    ensure_model_exists()
