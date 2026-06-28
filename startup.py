# startup.py
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH  = "ml/rf_model.pkl"
SCALER_PATH = "ml/scaler.pkl"

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