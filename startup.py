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
        logger.info("startup.lstm_model_missing — training now")
        try:
            from ml.lstm_model import train_lstm_model
            train_lstm_model(save=True)
            logger.info("startup.lstm_model_trained")
        except Exception as exc:
            logger.warning("startup.lstm_training_failed — %s", exc)


if __name__ == "__main__":
    ensure_model_exists()
