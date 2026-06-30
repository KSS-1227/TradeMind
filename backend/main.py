# backend/main.py
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import time

from agents.pipeline import run_pipeline
from data.fetch_prices import STOCKS, fetch_prices
from ml.backtest import run_backtest
# Ensure model exists on startup
from startup import ensure_model_exists
ensure_model_exists()
from data.fetch_news import fetch_market_news


app = FastAPI(
    title="TradeMind API",
    description="AI Co-Pilot for Indian Retail Investors",
    version="1.0.0"
)

# Allow React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache signals so we don't re-run pipeline on every request
signal_cache = {}
CACHE_TTL = 300  # 5 minutes
# Map custom symbols to real tickers
SYMBOL_MAP = {
    "GOLD24K.NS": "GC=F",    # Gold Futures
    "SILVER.NS":  "SI=F",    # Silver Futures
}
# ── Routes ────────────────────────────────────

@app.get("/")
def root():
    return {
        "name":    "TradeMind API",
        "version": "1.0.0",
        "status":  "running"
    }

@app.get("/stocks")
def list_stocks():
    """Return list of supported NSE stocks"""
    stocks = [s.replace(".NS", "") for s in STOCKS]
    return {"stocks": stocks, "count": len(stocks)}

@app.get("/signal/{symbol}")
def get_signal(symbol: str):
    if not symbol.endswith(".NS"):
        symbol = symbol + ".NS"
    symbol = symbol.upper()

    # Map to real ticker if needed
    real_ticker = SYMBOL_MAP.get(symbol, symbol)

    cached = signal_cache.get(symbol)
    if cached and (time.time() - cached["timestamp"]) < CACHE_TTL:
        cached["data"]["cached"] = True
        return cached["data"]

    try:
        result = run_pipeline(real_ticker)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])

        # Override symbol display name
        result["symbol"]    = symbol.replace(".NS", "")
        result["cached"]    = False
        result["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S")

        signal_cache[symbol] = {
            "timestamp": time.time(),
            "data":      result
        }
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/signals/all")
def get_all_signals():
    """Get signals for all 10 stocks — use sparingly, takes ~2 mins"""
    results = []
    for stock in STOCKS:
        try:
            result = run_pipeline(stock)
            results.append(result)
        except Exception as e:
            results.append({"symbol": stock, "error": str(e)})
    return {"signals": results, "count": len(results)}

@app.get("/health")
def health():
    return {"status": "ok", "model": "rf_model.pkl"}

@app.get("/prices/{symbol}")
def get_prices(symbol: str):
    if not symbol.endswith(".NS"):
        symbol = symbol + ".NS"
    symbol = symbol.upper()

    # Map to real ticker
    real_ticker = SYMBOL_MAP.get(symbol, symbol)

    df = fetch_prices(real_ticker, period="3mo")
    if df.empty:
        raise HTTPException(status_code=404, detail="No data")

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    if "Date" not in df.columns:
        df = df.reset_index()

    # For gold/silver convert USD to INR
    if real_ticker in ["GC=F", "SI=F"]:
        usd_inr_df = fetch_prices("INR=X", period="3mo")
        if not usd_inr_df.empty:
            if isinstance(usd_inr_df.columns, pd.MultiIndex):
                usd_inr_df.columns = usd_inr_df.columns.get_level_values(0)
            latest_fx = float(usd_inr_df["Close"].iloc[-1])
            INDIA_PREMIUM = (1 + 0.15) * (1 + 0.03)
            # Gold: per 10 grams | Silver: per kg
            if real_ticker == "GC=F":
                df["Close"] = (df["Close"] / 31.1035) * 10 * latest_fx * INDIA_PREMIUM
            else:
                df["Close"] = (df["Close"] / 32.1507) * 1000 * latest_fx * INDIA_PREMIUM

    result = []
    for _, row in df.iterrows():
        try:
            result.append({
                "Date":  str(row["Date"])[:10],
                "Close": round(float(row["Close"]), 2)
            })
        except:
            continue

    return {"data": result}

@app.get("/backtest/{symbol}")
def get_backtest(symbol: str):
    """Run backtest for a symbol"""
    if not symbol.endswith(".NS"):
        symbol = symbol + ".NS"
    try:
        result = run_backtest(symbol.upper(), period="2y")
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
from data.fetch_prices import fetch_gold_price_inr

@app.get("/gold")
def get_gold_price():
    """Real gold price in INR per 10 grams"""
    result = fetch_gold_price_inr()
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result
@app.get("/news")
def get_market_news():
    """General Indian market news"""
    try:
        headlines = fetch_market_news(days=3)
        return {"headlines": headlines, "count": len(headlines)}
    except Exception as e:
        return {"headlines": [], "count": 0, "error": str(e)}