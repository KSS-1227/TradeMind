# data/fetch_news.py
# data/fetch_news.py
import yfinance as yf
import feedparser

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

def fetch_news(symbol: str, days: int = 7) -> list:
    """Fetch news using yfinance built-in news — no API key needed"""
    headlines = []

    # Method 1 — yfinance built-in news
    try:
        ticker = yf.Ticker(symbol)
        news   = ticker.news
        if news:
            for item in news[:8]:
                content = item.get("content", {})
                title   = content.get("title", "") or item.get("title", "")
                summary = content.get("summary", "") or ""
                if title:
                    headlines.append(f"{title}. {summary}".strip(". "))
            print(f"yfinance: {len(headlines)} headlines for {symbol}")
    except Exception as e:
        print(f"yfinance news error for {symbol}: {e}")

    # Method 2 — Google News RSS fallback
    if not headlines:
        try:
            company = STOCK_NAMES.get(symbol, symbol.replace(".NS",""))
            query   = company.replace(" ", "+")
            url     = f"https://news.google.com/rss/search?q={query}+stock+India&hl=en-IN&gl=IN&ceid=IN:en"
            feed    = feedparser.parse(url)
            for entry in feed.entries[:6]:
                if entry.get("title"):
                    headlines.append(entry.title)
            print(f"RSS fallback: {len(headlines)} headlines for {symbol}")
        except Exception as e:
            print(f"RSS fallback error: {e}")

    return headlines

def fetch_market_news(days: int = 3) -> list:
    """General Indian market news via RSS"""
    try:
        url  = "https://news.google.com/rss/search?q=NSE+BSE+Indian+stock+market&hl=en-IN&gl=IN&ceid=IN:en"
        feed = feedparser.parse(url)
        return [e.title for e in feed.entries[:15] if e.get("title")]
    except Exception as e:
        print(f"Market news error: {e}")
        return []