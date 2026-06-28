# data/fetch_news.py
import requests
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

NEWSAPI_KEY = os.getenv("NEWSAPI_KEY")

# Stock name mapping for better news search
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
    # ── Commodities ──
    "GOLDBEES.NS":   "gold price India MCX",
    "SILVERBEES.NS": "silver price India MCX",
    "NIFTYBEES.NS":  "Nifty50 index India market",
    "GC=F":  "gold price India MCX commodity",
    "SI=F":  "silver price India MCX commodity",
}

def fetch_news(symbol: str, days: int = 7) -> list:
    """Fetch recent news headlines for a stock"""
    company_name = STOCK_NAMES.get(symbol, symbol)
    from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": f"{company_name} NSE stock India",
        "from": from_date,
        "language": "en",
        "sortBy": "relevancy",
        "pageSize": 10,
        "apiKey": NEWSAPI_KEY,
    }

    try:
        response = requests.get(url, params=params)
        data = response.json()

        if data.get("status") != "ok":
            print(f"NewsAPI error: {data.get('message')}")
            return []

        headlines = []
        for article in data.get("articles", []):
            title = article.get("title", "")
            desc = article.get("description", "")
            if title:
                headlines.append(f"{title}. {desc}")

        print(f"Fetched {len(headlines)} headlines for {company_name}")
        return headlines

    except Exception as e:
        print(f"Error fetching news for {symbol}: {e}")
        return []

def fetch_market_news(days: int = 3) -> list:
    """Fetch general Indian market news"""
    url = "https://newsapi.org/v2/everything"
    params = {
        "q": "NSE BSE Indian stock market trading",
        "from": (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d"),
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 15,
        "apiKey": NEWSAPI_KEY,
    }

    try:
        response = requests.get(url, params=params)
        data = response.json()
        headlines = [a.get("title", "") for a in data.get("articles", []) if a.get("title")]
        print(f"Fetched {len(headlines)} market headlines")
        return headlines
    except Exception as e:
        print(f"Error fetching market news: {e}")
        return []

if __name__ == "__main__":
    # Test with Reliance
    headlines = fetch_news("RELIANCE.NS")
    print("\nSample headlines:")
    for h in headlines[:3]:
        print(f"  - {h[:100]}")

    print("\nMarket news:")
    market = fetch_market_news()
    for h in market[:3]:
        print(f"  - {h[:100]}")