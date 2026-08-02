# startup.py
import logging
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.append(PROJECT_ROOT)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_PATH  = os.path.join(PROJECT_ROOT, "ml", "rf_model.pkl")
SCALER_PATH = os.path.join(PROJECT_ROOT, "ml", "scaler.pkl")
LSTM_PATH   = os.path.join(PROJECT_ROOT, "ml", "lstm_model.pt")


def ensure_model_exists():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        logger.info("startup.rf_model_missing — training now")
        from ml.rf_model import train_model
        train_model()
        logger.info("startup.rf_model_trained")
    else:
        logger.info("startup.model_ready")

    if not os.path.exists(LSTM_PATH):
        logger.info("startup.lstm_model_missing — downloading from Hugging Face Model Hub")
        from huggingface_hub import hf_hub_download
        ml_dir = os.path.join(PROJECT_ROOT, "ml")
        for filename in ("lstm_model.pt", "lstm_scaler.pkl", "lstm_temperature.pkl"):
            hf_hub_download(
                repo_id="KSS-1227/trademind-lstm",
                filename=filename,
                local_dir=ml_dir,
                local_dir_use_symlinks=False,
            )
        logger.info("startup.lstm_models_downloaded")


if __name__ == "__main__":
    ensure_model_exists()
