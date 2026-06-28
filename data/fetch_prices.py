# data/fetch_prices.py
import yfinance as yf
import pandas as pd
from datetime import datetime
import os
import requests

# Curated NSE stocks + ETFs for TradeMind
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