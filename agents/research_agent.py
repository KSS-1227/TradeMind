# agents/research_agent.py
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.fetch_prices import fetch_prices
from data.fetch_news import fetch_news, fetch_market_news
from ml.technical import add_technical_indicators

def research(symbol: str) -> dict:
    """
    Agent 1 — Research Agent
    Pulls price data, technical indicators, and news headlines
    """
    print(f"[Research Agent] Fetching data for {symbol}...")

    # Fetch price data with indicators
    df = fetch_prices(symbol, period="6mo")
    if df.empty:
        return {"error": f"No price data for {symbol}"}

    df = add_technical_indicators(df)
    latest = df.iloc[-1]

    # Fetch news
    headlines     = fetch_news(symbol, days=7)
    market_news   = fetch_market_news(days=3)

    print(f"[Research Agent] Done — {len(df)} price rows, {len(headlines)} headlines")

    return {
        "symbol":       symbol,
        "df":           df,
        "latest":       latest.to_dict(),
        "headlines":    headlines,
        "market_news":  market_news,
    }