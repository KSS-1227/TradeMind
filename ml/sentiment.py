# ml/sentiment.py
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from transformers import pipeline
import torch

from data.news_enrichment import enrich_articles_for_stock, aggregate_sentiment_inputs

# Load FinBERT once at module level (avoids reloading on every call)
print("Loading FinBERT model...")
finbert = pipeline(
    "text-classification",
    model="ProsusAI/finbert",
    device=0 if torch.cuda.is_available() else -1
)
print("FinBERT ready.")

def analyze_sentiment(articles: list) -> dict:
    """
    Analyze sentiment of news using FinBERT.
    `articles` can be either:
      - list[dict] with "headline"/"url" keys (current fetch_news.py format), or
      - list[str] (legacy format, kept for backward compatibility)
    Returns dominant sentiment + scores.
    """
    if not articles:
        return {
            "dominant": "neutral",
            "scores": {"positive": 0, "negative": 0, "neutral": 1},
            "confidence": 0.0,
            "summary": "No news available"
        }

    # Normalize to plain text list — prefer enriched full text if present,
    # otherwise fall back to headline (or the raw string, for legacy callers)
    if isinstance(articles[0], dict):
        texts_source = [a.get("sentiment_input") or a.get("headline", "") for a in articles]
    else:
        texts_source = articles

    # Limit to 5 items, truncate long ones
    texts = [t[:512] for t in texts_source[:5] if t]

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
        summary = build_summary(dominant, confidence, len(articles))

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

def get_enriched_sentiment(symbol: str) -> dict:
    """
    Full pipeline: fetch news -> enrich top articles with full text ->
    score with FinBERT. Use this instead of calling fetch_news() +
    analyze_sentiment() separately, since it wires in the enrichment step.
    """
    from data.fetch_news import fetch_news

    articles = fetch_news(symbol)
    enriched = enrich_articles_for_stock(articles)
    return analyze_sentiment(enriched)


if __name__ == "__main__":
    result = get_enriched_sentiment("RELIANCE.NS")

    print(f"\nSentiment Result for Reliance:")
    print(f"  Dominant : {result['dominant'].upper()}")
    print(f"  Confidence: {result['confidence']}")
    print(f"  Scores   : {result['scores']}")
    print(f"  Summary  : {result['summary']}")