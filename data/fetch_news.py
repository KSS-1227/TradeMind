# data/fetch_news.py
import os
import requests
import yfinance as yf
import feedparser

FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
FIRECRAWL_URL = "https://api.firecrawl.dev/v2/search"

STOCK_NAMES = {
    "RELIANCE.NS":   "Reliance Industries",
    "TCS.NS":        "Tata Consultancy Services",
    "INFY.NS":       "Infosys",
    "HDFCBANK.NS":   "HDFC Bank",
    "WIPRO.NS":      "Wipro",
    "ICICIBANK.NS":  "ICICI Bank",
    "BAJFINANCE.NS": "Bajaj Finance",
    "SBIN.NS":       "State Bank of India",
    "ITC.NS":        "ITC Limited",
    "ADANIENT.NS":   "Adani Enterprises",
    "GOLDBEES.NS":   "gold price India MCX",
    "SILVERBEES.NS": "silver price India MCX",
    "NIFTYBEES.NS":  "Nifty50 index India",
    "GC=F":          "gold commodity MCX India",
    "SI=F":          "silver commodity MCX India",
}


def fetch_news_firecrawl(symbol: str) -> list:
    """Fetch news headlines via Firecrawl search — reliable on cloud hosts"""
    if not FIRECRAWL_API_KEY:
        return []

    company = STOCK_NAMES.get(symbol, symbol.replace(".NS", ""))
    try:
        resp = requests.post(
            FIRECRAWL_URL,
            headers={"Authorization": f"Bearer {FIRECRAWL_API_KEY}"},
            json={
                "query": f"{company} share price NSE news",
                "limit": 6,
                "tbs": "qdr:w",  # past week
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("data", []) or []
        articles = []
        for r in results:
            title = r.get("title", "")
            desc  = r.get("description", "")
            url   = r.get("url", "")
            if title:
                articles.append({
                    "headline": f"{title}. {desc}".strip(". "),
                    "url": url,
                })
        print(f"Firecrawl: {len(articles)} headlines for {symbol}")
        return articles
    except Exception as e:
        print(f"Firecrawl news error for {symbol}: {e}")
        return []


def fetch_news(symbol: str, days: int = 7) -> list:
    """
    Returns a list of dicts: [{"headline": str, "url": str}, ...]
    (Previously returned plain strings — updated so downstream enrichment
    can fetch full article text via the "url" field.)
    """
    articles = []

    # Method 1 — yfinance (fast, free, but flaky on cloud IPs)
    try:
        ticker = yf.Ticker(symbol)
        news = ticker.news
        if news:
            for item in news[:8]:
                content = item.get("content", {})
                title = content.get("title", "") or item.get("title", "")
                summary = content.get("summary", "") or ""
                url = (
                    content.get("canonicalUrl", {}).get("url")
                    or content.get("clickThroughUrl", {}).get("url")
                    or item.get("link", "")
                    or ""
                )
                if title:
                    articles.append({
                        "headline": f"{title}. {summary}".strip(". "),
                        "url": url,
                    })
            print(f"yfinance: {len(articles)} headlines for {symbol}")
    except Exception as e:
        print(f"yfinance news error for {symbol}: {e}")

    # Method 2 — Firecrawl (reliable fallback)
    if not articles:
        articles = fetch_news_firecrawl(symbol)

    # Method 3 — Google News RSS (last resort)
    if not articles:
        try:
            company = STOCK_NAMES.get(symbol, symbol.replace(".NS", ""))
            query = company.replace(" ", "+")
            url = f"https://news.google.com/rss/search?q={query}+stock+India&hl=en-IN&gl=IN&ceid=IN:en"
            feed = feedparser.parse(url)
            for entry in feed.entries[:6]:
                if entry.get("title"):
                    articles.append({
                        "headline": entry.title,
                        "url": entry.get("link", ""),
                    })
            print(f"RSS fallback: {len(articles)} headlines for {symbol}")
        except Exception as e:
            print(f"RSS fallback error: {e}")

    return articles


def fetch_market_news(days: int = 3) -> list:
    try:
        url = "https://news.google.com/rss/search?q=NSE+BSE+Indian+stock+market&hl=en-IN&gl=IN&ceid=IN:en"
        feed = feedparser.parse(url)
        return [e.title for e in feed.entries[:15] if e.get("title")]
    except Exception as e:
        print(f"Market news error: {e}")
        return []