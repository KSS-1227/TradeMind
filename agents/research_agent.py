# agents/research_agent.py
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.fetch_prices import fetch_prices, STOCKS
from data.fetch_news import fetch_news, fetch_market_news
from ml.technical import add_technical_indicators
from ml.market_relative import compute_live_relative_features

def research(symbol: str) -> dict:
    """
    Agent 1 — Research Agent
    Pulls price data, technical indicators, market-relative/cross-sectional
    features, and news headlines.
    """
    print(f"[Research Agent] Fetching data for {symbol}...")

    # Fetch price data with indicators
    df = fetch_prices(symbol, period="6mo")
    if df.empty:
        return {"error": f"No price data for {symbol}"}

    df = add_technical_indicators(df)
    latest = df.iloc[-1].to_dict()

    # Market-relative / cross-sectional features (Rel_Return, Beta_20d,
    # RSI_rel_class, etc.) — the model was retrained to expect these (see
    # ml/rf_model.py FEATURES). Peer group uses STOCKS (the model's own
    # 13-symbol training universe), NOT the larger screener universe —
    # using a different, bigger peer group here would shift the
    # cross-sectional feature's distribution away from what the model
    # was actually trained on.
    try:
        relative_feats = compute_live_relative_features(symbol, df, STOCKS, period="6mo")
        latest.update(relative_feats)
    except Exception as e:
        print(f"[Research Agent] Market-relative features failed ({e}) — "
              f"falling back to 0 for those fields. Signal quality may be "
              f"degraded but won't crash.")
        from ml.market_relative import MARKET_RELATIVE_FEATURES
        latest.update({f: 0.0 for f in MARKET_RELATIVE_FEATURES})

    # Fetch news
    headlines     = fetch_news(symbol, days=7)
    market_news   = fetch_market_news(days=3)

    print(f"[Research Agent] Done — {len(df)} price rows, {len(headlines)} headlines")

    return {
        "symbol":       symbol,
        "df":           df,
        "latest":       latest,
        "headlines":    headlines,
        "market_news":  market_news,
    }