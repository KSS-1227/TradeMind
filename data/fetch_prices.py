# data/fetch_prices.py
import yfinance as yf
import pandas as pd
from datetime import datetime
import os
import requests

# Curated NSE stocks + ETFs for TradeMind's ML MODEL. Kept intentionally
# small — this is the universe the RF/XGBoost model was trained and
# labeled on. Don't add to this list without retraining.
STOCKS = [
    # NSE Stocks
    "RELIANCE.NS", "TCS.NS", "INFY.NS",
    "HDFCBANK.NS", "WIPRO.NS", "ICICIBANK.NS",
    "BAJFINANCE.NS", "SBIN.NS", "ITC.NS", "ADANIENT.NS",
    # Gold & Silver ETFs (NSE listed, in rupees)
    "GOLDBEES.NS",    # Nippon India Gold ETF
    "SILVERBEES.NS",  # Nippon India Silver ETF
    # Popular Index ETFs
    "NIFTYBEES.NS",   # Nifty50 ETF
]

# Broader universe for the NL SCREENER only. Unlike the ML model, the
# screener has no training/label dependency — it's pure rule evaluation
# against live indicators, so nothing stops it covering far more symbols
# than STOCKS. Includes STOCKS plus other liquid NSE large-caps.
SCREENER_UNIVERSE = STOCKS + [
    "LT.NS", "HINDUNILVR.NS", "AXISBANK.NS", "KOTAKBANK.NS", "MARUTI.NS",
    "SUNPHARMA.NS", "TITAN.NS", "ASIANPAINT.NS", "BHARTIARTL.NS",
    "TMPV.NS",  # was TATAMOTORS.NS — renamed after Oct 2025 CV/PV demerger
    "TATASTEEL.NS", "ULTRACEMCO.NS", "NESTLEIND.NS",
    "POWERGRID.NS", "NTPC.NS", "ONGC.NS", "COALINDIA.NS", "HCLTECH.NS",
    "TECHM.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS", "GRASIM.NS",
    "JSWSTEEL.NS", "HINDALCO.NS", "BPCL.NS", "EICHERMOT.NS",
    "HEROMOTOCO.NS", "BAJAJFINSV.NS", "INDUSINDBK.NS",
]

def fetch_prices(symbol: str, period: str = "1y") -> pd.DataFrame:
    """Fetch OHLCV data for a single NSE stock or ETF"""
    try:
        df = yf.download(symbol, period=period, interval="1d", progress=False)
        if df.empty:
            return pd.DataFrame()

        # Flatten MultiIndex columns from yfinance
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df["symbol"] = symbol
        df.reset_index(inplace=True)

        # Filter out data anomalies — remove rows where price moved >20% in one day
        if "Close" in df.columns:
            df["pct_change"] = df["Close"].pct_change().abs()
            df = df[df["pct_change"] < 0.20]
            df = df.drop(columns=["pct_change"])
            df.reset_index(drop=True, inplace=True)

        print(f"Fetched {len(df)} rows for {symbol}")
        return df
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        return pd.DataFrame()

def fetch_prices_batch(symbols: list, period: str = "6mo") -> dict:
    """
    Fetch OHLCV for multiple symbols in ONE yfinance call instead of N
    sequential ones. Matters once the universe is bigger than a handful of
    symbols (see SCREENER_UNIVERSE) — sequential fetch_prices() calls in a
    loop would make a live screener query noticeably slow.

    Returns {symbol: DataFrame}. Falls back to per-symbol fetch_prices()
    for the whole batch if the batch call itself fails, and for any
    individual symbol yfinance's batch response is missing/malformed for
    (batch calls can silently drop a problem ticker rather than raising).
    """
    if not symbols:
        return {}
    try:
        raw = yf.download(tickers=symbols, period=period, interval="1d",
                           group_by="ticker", progress=False, threads=True)
    except Exception as e:
        print(f"Batch fetch failed ({e}) — falling back to per-symbol fetch")
        return {s: fetch_prices(s, period) for s in symbols}

    results = {}
    for symbol in symbols:
        try:
            # yfinance returns a flat (non-MultiIndex) frame when only one
            # symbol was requested, and a MultiIndex (symbol, field) frame
            # for multiple — handle both shapes.
            df = raw.copy() if len(symbols) == 1 else raw[symbol].copy()
            df = df.dropna(how="all")
            if df.empty:
                results[symbol] = fetch_prices(symbol, period)
                continue

            df["symbol"] = symbol
            df.reset_index(inplace=True)

            if "Close" in df.columns:
                df["pct_change"] = df["Close"].pct_change().abs()
                df = df[df["pct_change"] < 0.20]
                df = df.drop(columns=["pct_change"])
                df.reset_index(drop=True, inplace=True)

            print(f"Fetched {len(df)} rows for {symbol} (batch)")
            results[symbol] = df
        except Exception as e:
            print(f"Batch fetch missing {symbol} ({e}) — fetching individually")
            results[symbol] = fetch_prices(symbol, period)
    return results

def fetch_all_stocks(period: str = "1y") -> pd.DataFrame:
    """Fetch data for all stocks and combine"""
    all_data = []
    for symbol in STOCKS:
        df = fetch_prices(symbol, period)
        if not df.empty:
            all_data.append(df)
    return pd.concat(all_data, ignore_index=True)

def save_to_csv(df: pd.DataFrame, filename: str = "data/prices.csv"):
    """Save fetched data locally"""
    df.to_csv(filename, index=False)
    print(f"Saved to {filename}")

def fetch_gold_price_inr() -> dict:
    """
    Fetch real gold price in INR per 10 grams
    Converts international USD/troy oz → INR/10g
    Includes Indian import duty (15%) + GST (3%)
    """
    try:
        # Fetch gold futures price in USD
        gold_df = yf.download("GC=F", period="3mo",
                              interval="1d", progress=False)

        # Fetch USD to INR exchange rate
        usd_inr_df = yf.download("INR=X", period="3mo",
                                  interval="1d", progress=False)

        if gold_df.empty or usd_inr_df.empty:
            return {"error": "Could not fetch gold data"}

        # Flatten MultiIndex
        if isinstance(gold_df.columns, pd.MultiIndex):
            gold_df.columns = gold_df.columns.get_level_values(0)
        if isinstance(usd_inr_df.columns, pd.MultiIndex):
            usd_inr_df.columns = usd_inr_df.columns.get_level_values(0)

        # Latest values
        gold_usd_per_oz = float(gold_df["Close"].iloc[-1])
        usd_to_inr      = float(usd_inr_df["Close"].iloc[-1])

        # Indian retail gold price calculation
        # 1 troy oz = 31.1035 grams
        # Indian retail = international + 15% import duty + 3% GST
        IMPORT_DUTY   = 0.15
        GST           = 0.03
        INDIA_PREMIUM = (1 + IMPORT_DUTY) * (1 + GST)  # = 1.1845

        gold_inr_per_10g = (
            gold_usd_per_oz / 31.1035
        ) * 10 * usd_to_inr * INDIA_PREMIUM

        # Build historical data for chart
        gold_df.reset_index(inplace=True)
        usd_inr_df.reset_index(inplace=True)

        # Merge gold + fx on date
        merged = pd.merge(
            gold_df[["Date", "Close"]].rename(columns={"Close": "gold_usd"}),
            usd_inr_df[["Date", "Close"]].rename(columns={"Close": "usd_inr"}),
            on="Date", how="inner"
        )

        # Apply same Indian premium to historical prices
        merged["price_10g_inr"] = (
            (merged["gold_usd"] / 31.1035) * 10 * merged["usd_inr"] * INDIA_PREMIUM
        ).round(2)

        return {
            "current_price_10g": round(gold_inr_per_10g, 2),
            "current_price_oz":  round(gold_usd_per_oz, 2),
            "usd_to_inr":        round(usd_to_inr, 2),
            "history": [
                {
                    "Date":  str(row["Date"])[:10],
                    "Close": row["price_10g_inr"]
                }
                for _, row in merged.iterrows()
            ]
        }

    except Exception as e:
        print(f"Gold price error: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    print("Fetching NSE stock data...")
    df = fetch_all_stocks()
    save_to_csv(df)
    print(f"\nTotal rows fetched: {len(df)}")
    print(df.head())

    print("\nFetching gold price...")
    gold = fetch_gold_price_inr()
    print(f"24K Gold per 10g: ₹{gold.get('current_price_10g', 'N/A')}")