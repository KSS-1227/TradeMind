"""
TradeMind — News Enrichment Module
-------------------------------------------
Upgrades your existing yfinance -> Firecrawl -> Google News RSS fallback
chain from "headline + snippet" to "full article text" before it hits
FinBERT for sentiment scoring.

Design goals:
- Reuse your existing fallback chain to GET the article URL/metadata.
- Only do a full scrape for the top N articles per stock (cost/latency control).
- Cache scraped text so repeat requests within a TTL window don't re-hit Firecrawl.
- Fail gracefully back to headline-only sentiment if scraping fails.
"""

import os
import time
import hashlib
import json
import requests
from pathlib import Path
from typing import Optional

# Uses the same FIRECRAWL_API_KEY / raw-requests pattern as data/fetch_news.py
# (this repo doesn't use the Firecrawl Python SDK, just direct HTTP calls).
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape"

CACHE_DIR = Path("cache/news_articles")
CACHE_TTL_SECONDS = 60 * 60 * 6  # 6 hours — news doesn't need minute-level freshness
MAX_ARTICLES_PER_STOCK = 3        # cost/latency control
MAX_CHARS_PER_ARTICLE = 2000      # cap length fed into FinBERT


def _cache_key(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:24]


def _read_cache(url: str) -> Optional[str]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f"{_cache_key(url)}.json"
    if not path.exists():
        return None

    data = json.loads(path.read_text())
    if time.time() - data["cached_at"] > CACHE_TTL_SECONDS:
        return None  # stale, force re-scrape
    return data["text"]


def _write_cache(url: str, text: str) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f"{_cache_key(url)}.json"
    path.write_text(json.dumps({"url": url, "text": text, "cached_at": time.time()}))


def get_full_article_text(article_url: str) -> str:
    """
    Returns full, cleaned article text for a given URL, via Firecrawl's
    /v2/scrape endpoint (same auth/style as fetch_news_firecrawl).
    Falls back to empty string on any failure — caller should then
    fall back to headline-only sentiment rather than crash the pipeline.
    """
    if not article_url or not FIRECRAWL_API_KEY:
        return ""

    cached = _read_cache(article_url)
    if cached is not None:
        return cached

    try:
        resp = requests.post(
            FIRECRAWL_SCRAPE_URL,
            headers={"Authorization": f"Bearer {FIRECRAWL_API_KEY}"},
            json={"url": article_url, "formats": ["markdown"]},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        text = (data.get("data", {}).get("markdown") or "")[:MAX_CHARS_PER_ARTICLE]
        if text.strip():
            _write_cache(article_url, text)
        return text
    except Exception as e:
        print(f"[news_enrichment] Scrape failed for {article_url}: {e}")
        return ""


def enrich_articles_for_stock(
    articles: list[dict],
    max_articles: int = MAX_ARTICLES_PER_STOCK,
) -> list[dict]:
    """
    Takes the article list your existing fallback chain already produces
    (each dict expected to have at least "url" and "headline" keys) and
    adds a "full_text" field to the top N of them.

    Articles beyond max_articles are left as headline-only to control
    Firecrawl usage and latency — they still get scored, just on the
    headline/snippet like before.
    """
    enriched = []
    for i, article in enumerate(articles):
        if i < max_articles and article.get("url"):
            full_text = get_full_article_text(article["url"])
            article["full_text"] = full_text if full_text else None
            article["sentiment_input"] = full_text or article.get("headline", "")
        else:
            article["full_text"] = None
            article["sentiment_input"] = article.get("headline", "")
        enriched.append(article)

    return enriched


def aggregate_sentiment_inputs(enriched_articles: list[dict]) -> str:
    """
    Combines multiple articles' sentiment_input into one block for FinBERT,
    so a single biased/clickbait headline doesn't dominate the signal.
    Trims to keep total input within a reasonable token budget.
    """
    combined = "\n\n---\n\n".join(
        a["sentiment_input"] for a in enriched_articles if a.get("sentiment_input")
    )
    return combined[:6000]  # rough cap; adjust to your FinBERT tokenizer's limit


# ---------------------------------------------------------------------
# Example usage — slot this into your existing pipeline
# ---------------------------------------------------------------------
if __name__ == "__main__":
    # from firecrawl import FirecrawlApp
    # firecrawl_app = FirecrawlApp(api_key="YOUR_KEY")

    # articles = your_existing_fallback_chain_fetch(ticker="RELIANCE.NS")
    # enriched = enrich_articles_for_stock(firecrawl_app, articles)
    # sentiment_text = aggregate_sentiment_inputs(enriched)
    # sentiment_score = finbert_model(sentiment_text)  # your existing FinBERT call

    print("Import enrich_articles_for_stock() and call it right after your "
          "existing news fallback chain returns article metadata, before "
          "passing anything to FinBERT.")