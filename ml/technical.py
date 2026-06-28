# ml/technical.py
import pandas as pd
import pandas_ta as ta

def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add RSI, MACD, Bollinger Bands, EMA to price dataframe
    """
    # Make a clean copy
    data = df.copy()

    # Make sure Close is a proper Series (yfinance sometimes returns MultiIndex)
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    close = data["Close"].astype(float)
    high  = data["High"].astype(float)
    low   = data["Low"].astype(float)
    volume = data["Volume"].astype(float)

    # RSI — momentum indicator
    data["RSI"] = ta.rsi(close, length=14)

    # MACD — trend indicator
    macd = ta.macd(close, fast=12, slow=26, signal=9)
    if macd is not None:
        macd_cols = list(macd.columns)
        macd_line   = [c for c in macd_cols if c.startswith("MACD_")][0]
        signal_line = [c for c in macd_cols if c.startswith("MACDs_")][0]
        hist_line   = [c for c in macd_cols if c.startswith("MACDh_")][0]
        data["MACD"]        = macd[macd_line]
        data["MACD_signal"] = macd[signal_line]
        data["MACD_hist"]   = macd[hist_line]

    # Bollinger Bands — volatility indicator
    bbands = ta.bbands(close, length=20, std=2)
    if bbands is not None:
        # Get actual column names (vary by pandas-ta version)
        bb_cols = list(bbands.columns)
        upper = [c for c in bb_cols if "BBU" in c][0]
        mid   = [c for c in bb_cols if "BBM" in c][0]
        lower = [c for c in bb_cols if "BBL" in c][0]
        data["BB_upper"] = bbands[upper]
        data["BB_mid"]   = bbands[mid]
        data["BB_lower"] = bbands[lower]

    # EMA — trend direction
    data["EMA_20"]  = ta.ema(close, length=20)
    data["EMA_50"]  = ta.ema(close, length=50)

    # Volume moving average
    data["Volume_MA20"] = volume.rolling(window=20).mean()

    # Price momentum
    data["Returns"]     = close.pct_change()
    data["Returns_5d"]  = close.pct_change(periods=5)

    # Drop rows with NaN from indicator calculations
    data.dropna(inplace=True)
    data.reset_index(drop=True, inplace=True)

    return data

def get_signal_features(df: pd.DataFrame) -> dict:
    """
    Extract the latest row as a feature dict for the ML model
    """
    latest = df.iloc[-1]

    return {
        "RSI":          latest.get("RSI", 50),
        "MACD":         latest.get("MACD", 0),
        "MACD_signal":  latest.get("MACD_signal", 0),
        "BB_upper":     latest.get("BB_upper", 0),
        "BB_lower":     latest.get("BB_lower", 0),
        "EMA_20":       latest.get("EMA_20", 0),
        "EMA_50":       latest.get("EMA_50", 0),
        "Volume_MA20":  latest.get("Volume_MA20", 0),
        "Returns":      latest.get("Returns", 0),
        "Returns_5d":   latest.get("Returns_5d", 0),
        "Close":        latest.get("Close", 0),
        "Volume":       latest.get("Volume", 0),
    }

if __name__ == "__main__":
    import sys, os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from data.fetch_prices import fetch_prices

    print("Fetching Reliance data...")
    df = fetch_prices("RELIANCE.NS", period="1y")

    print("Adding technical indicators...")
    df = add_technical_indicators(df)

    print(f"\nColumns: {list(df.columns)}")
    print(f"Rows after indicators: {len(df)}")

    features = get_signal_features(df)
    print(f"\nLatest features:")
    for k, v in features.items():
        print(f"  {k}: {round(float(v), 4)}")