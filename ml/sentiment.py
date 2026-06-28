# ml/sentiment.py
from transformers import pipeline
import torch

# Load FinBERT once at module level (avoids reloading on every call)
print("Loading FinBERT model...")
finbert = pipeline(
    "text-classification",
    model="ProsusAI/finbert",
    device=0 if torch.cuda.is_available() else -1
)
print("FinBERT ready.")

def analyze_sentiment(headlines: list) -> dict:
    """
    Analyze sentiment of news headlines using FinBERT
    Returns dominant sentiment + scores
    """
    if not headlines:
        return {
            "dominant": "neutral",
            "scores": {"positive": 0, "negative": 0, "neutral": 1},
            "confidence": 0.0,
            "summary": "No news available"
        }

    # Limit to 5 headlines, truncate long ones
    texts = [h[:512] for h in headlines[:5]]

    try:
        results = finbert(texts)

        scores = {"positive": 0.0, "negative": 0.0, "neutral": 0.0}
        for r in results:
            label = r["label"].lower()
            scores[label] += r["score"]

        # Normalize
        total = sum(scores.values())
        scores = {k: round(v / total, 3) for k, v in scores.items()}

        dominant = max(scores, key=scores.get)
        confidence = round(scores[dominant], 3)

        # Plain English summary
        summary = build_summary(dominant, confidence, len(headlines))

        return {
            "dominant": dominant,
            "scores": scores,
            "confidence": confidence,
            "summary": summary
        }

    except Exception as e:
        print(f"Sentiment error: {e}")
        return {
            "dominant": "neutral",
            "scores": {"positive": 0, "negative": 0, "neutral": 1},
            "confidence": 0.0,
            "summary": "Sentiment unavailable"
        }

def build_summary(dominant: str, confidence: float, num_headlines: int) -> str:
    """Convert sentiment scores to plain English for the Explainer Agent"""
    pct = int(confidence * 100)
    if dominant == "positive":
        return f"{pct}% of recent news is positive — market sentiment favors upside"
    elif dominant == "negative":
        return f"{pct}% of recent news is negative — proceed with caution"
    else:
        return f"News sentiment is mixed — no strong directional signal from {num_headlines} articles"

if __name__ == "__main__":
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from data.fetch_news import fetch_news

    headlines = fetch_news("RELIANCE.NS")
    result = analyze_sentiment(headlines)

    print(f"\nSentiment Result for Reliance:")
    print(f"  Dominant : {result['dominant'].upper()}")
    print(f"  Confidence: {result['confidence']}")
    print(f"  Scores   : {result['scores']}")
    print(f"  Summary  : {result['summary']}")