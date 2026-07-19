# backend/main.py
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import time

from agents.pipeline import run_pipeline
from data.fetch_prices import STOCKS, SCREENER_UNIVERSE, fetch_prices
from ml.backtest import run_backtest
from ml.screener import screen_stocks
from notifications.whatsapp import send_whatsapp_message, format_signal_alert
from notifications.subscriptions import (
    add_subscription, remove_subscription, list_subscriptions,
    symbols_with_subscribers,
)
from pydantic import BaseModel
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

class ScreenerRequest(BaseModel):
    query: str

@app.post("/screener")
def run_screener(request: ScreenerRequest):
    """
    Natural-Language Screener Builder. Deterministic parsing — no LLM
    call — so results are reproducible and every match comes with an
    explicit per-condition breakdown, and any part of the query that
    couldn't be understood is surfaced rather than silently dropped.

    Example body: {"query": "RSI below 30 and price above 50 day EMA"}
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")
    try:
        result = screen_stocks(request.query, universe=SCREENER_UNIVERSE)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class WhatsAppSubscribeRequest(BaseModel):
    phone: str    # E.164 format, e.g. "+919876543210"
    symbol: str   # e.g. "RELIANCE" or "RELIANCE.NS"

class WhatsAppWelcomeRequest(BaseModel):
    phone: str

@app.post("/whatsapp/welcome")
def whatsapp_welcome(request: WhatsAppWelcomeRequest):
    """
    Send a one-time welcome WhatsApp message after signup.
    Called fire-and-forget from the frontend — never fails signup.
    """
    message = (
        "🎉 *Welcome to TradeMind!*\n\n"
        "Your WhatsApp number has been registered successfully.\n\n"
        "You'll receive:\n"
        "📈 Stock Alerts\n"
        "🤖 AI Recommendations\n"
        "💼 Portfolio Insights\n"
        "🚨 Important Notifications\n\n"
        "TradeMind — AI Co-Pilot for Indian Retail Investors 💹"
    )
    result = send_whatsapp_message(request.phone, message)
    if not result["success"]:
        # Log but return 200 — frontend fire-and-forgets this
        print(f"[whatsapp/welcome] Failed to send to {request.phone}: {result.get('error')}")
    return {"sent": result["success"]}

@app.post("/whatsapp/subscribe")
def whatsapp_subscribe(request: WhatsAppSubscribeRequest):
    """
    Subscribe a phone number to WhatsApp alerts for a stock. Sends an
    immediate confirmation message so the user gets instant feedback that
    the number actually works (this also surfaces Twilio sandbox
    join-code issues right away instead of silently at alert time).

    NOTE: recipients must have joined your Twilio WhatsApp sandbox first
    (see notifications/whatsapp.py) — this is a Twilio sandbox
    requirement, not something this endpoint can bypass.
    """
    result = add_subscription(request.phone, request.symbol)
    if result["added"]:
        confirm = send_whatsapp_message(
            request.phone,
            f"You're subscribed to TradeMind alerts for {request.symbol.upper()}. "
            f"You'll get a WhatsApp message when the signal changes to BUY or SELL."
        )
        result["confirmation_sent"] = confirm["success"]
        if not confirm["success"]:
            result["confirmation_error"] = confirm["error"]
    return result

@app.post("/whatsapp/unsubscribe")
def whatsapp_unsubscribe(request: WhatsAppSubscribeRequest):
    return remove_subscription(request.phone, request.symbol)

@app.get("/whatsapp/subscriptions")
def whatsapp_list_subscriptions(symbol: str = None):
    """Debug/admin view of current subscriptions. Not phone-number-scoped
    auth — fine for a hackathon demo, but don't ship this route as-is to
    a real product without adding access control."""
    return {"subscriptions": list_subscriptions(symbol)}

@app.post("/whatsapp/check-alerts")
def whatsapp_check_alerts():
    """
    Evaluate the current signal for every symbol that has at least one
    subscriber, and WhatsApp anyone subscribed to a symbol whose signal
    is currently BUY or SELL (HOLD is deliberately not alerted — that's
    the "nothing changed" case, and alerting on it would just be noise).

    For a demo: call this manually via a button/curl. For production:
    wire this to a scheduled job (cron, or a simple `while True: sleep`
    loop in a separate process) running every N minutes during market
    hours — this endpoint itself doesn't loop or schedule anything, it
    just runs one evaluation pass when called.
    """
    symbols = symbols_with_subscribers()
    sent, skipped, errors = [], [], []

    for symbol in symbols:
        real_ticker = SYMBOL_MAP.get(symbol, symbol)
        try:
            signal_data = run_pipeline(real_ticker)
        except Exception as e:
            errors.append({"symbol": symbol, "error": str(e)})
            continue
        if "error" in signal_data:
            errors.append({"symbol": symbol, "error": signal_data["error"]})
            continue

        signal_data["symbol"] = symbol.replace(".NS", "")
        if signal_data.get("signal") == "HOLD":
            skipped.append(symbol)
            continue

        message = format_signal_alert(signal_data)
        for sub in list_subscriptions(symbol):
            result = send_whatsapp_message(sub["phone"], message)
            entry = {"phone": sub["phone"], "symbol": symbol,
                      "signal": signal_data["signal"], "success": result["success"]}
            if not result["success"]:
                entry["error"] = result["error"]
            sent.append(entry)

    return {"symbols_checked": symbols, "alerts_sent": sent,
            "skipped_hold": skipped, "errors": errors}

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
        result = run_backtest(symbol.upper(), period="5y")
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