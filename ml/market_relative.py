# ml/market_relative.py
"""
Market-relative and cross-sectional features.

Every existing feature (RSI, MACD, EMA, Bollinger Bands, its own volume)
describes a stock in isolation. None of it tells the model whether
today's move happened because the whole market moved, or because this
specific stock did something unusual relative to its peers — and that
*relative* signal is typically where real predictive edge lives, not
the raw indicator level. A stock's RSI of 70 means something different
on a day the whole market is up 3% vs. a day the market is flat.

This module adds two families of features:

  1. Market-relative — stock vs. the Nifty 50 index:
       Rel_Return        stock's daily return   minus Nifty's daily return
       Rel_Return_5d     stock's 5-day return   minus Nifty's 5-day return
       Beta_20d          rolling 20-day beta vs. Nifty (is this stock
                          amplifying or damping recent market moves?)
       RS_line_ROC_10    10-day momentum of the (stock / Nifty) price
                          ratio — the classic technical "relative
                          strength line", not to be confused with RSI

  2. Cross-sectional — stock vs. its own asset-class peer group, same date:
       RSI_rel_class     stock's RSI     minus peer-group average RSI
       Returns_rel_class stock's return  minus peer-group average return
     Peer average is leave-one-out (excludes the stock itself), and
     peer groups are asset-class-scoped (equity vs. ETF) so we're not
     comparing a bank stock's RSI to a gold ETF's RSI and calling it
     "sector-relative" when it isn't.
"""
import pandas as pd
import numpy as np

# Grouped by asset class so cross-sectional comparisons are apples-to-apples.
# Keep this in sync with data/fetch_prices.py:STOCKS — anything not listed
# here defaults to "equity" (see .fillna() below) rather than raising, so a
# newly added symbol doesn't crash the pipeline, just gets grouped generically.
ASSET_CLASS = {
    "RELIANCE.NS":   "equity",
    "TCS.NS":        "equity",
    "INFY.NS":       "equity",
    "HDFCBANK.NS":   "equity",
    "WIPRO.NS":      "equity",
    "ICICIBANK.NS":  "equity",
    "BAJFINANCE.NS": "equity",
    "SBIN.NS":       "equity",
    "ITC.NS":        "equity",
    "ADANIENT.NS":   "equity",
    "GOLDBEES.NS":   "etf",
    "SILVERBEES.NS": "etf",
    "NIFTYBEES.NS":  "etf",
}

NIFTY_SYMBOL = "^NSEI"

MARKET_RELATIVE_FEATURES = [
    "Rel_Return", "Rel_Return_5d", "Beta_20d", "RS_line_ROC_10",
    "RSI_rel_class", "Returns_rel_class",
]


def fetch_nifty_benchmark(period: str = "5y") -> pd.DataFrame:
    """
    Fetch Nifty 50 index closes and derive the same return features
    computed on individual stocks, so they can be merged in by date.
    """
    import yfinance as yf

    df = yf.download(NIFTY_SYMBOL, period=period, interval="1d", progress=False)
    if df.empty:
        raise RuntimeError(f"Could not fetch Nifty benchmark data ({NIFTY_SYMBOL})")

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df.reset_index(inplace=True)

    out = pd.DataFrame({
        "Date":        pd.to_datetime(df["Date"]),
        "Nifty_Close": df["Close"].astype(float),
    })
    out["Nifty_Return"]    = out["Nifty_Close"].pct_change()
    out["Nifty_Return_5d"] = out["Nifty_Close"].pct_change(periods=5)
    return out


def _rolling_beta(stock_ret: pd.Series, market_ret: pd.Series,
                   window: int = 20) -> pd.Series:
    """
    Rolling beta = Cov(stock, market) / Var(market) over `window` days.
    Requires both series to share the same index (true for same-length
    per-symbol slices produced by groupby()).
    """
    cov = stock_ret.rolling(window).cov(market_ret)
    var = market_ret.rolling(window).var()
    beta = cov / var
    return beta.replace([np.inf, -np.inf], np.nan)


def add_market_relative_features(combined: pd.DataFrame,
                                  nifty_df: pd.DataFrame,
                                  beta_window: int = 20,
                                  rs_window: int = 10) -> pd.DataFrame:
    """
    combined: concatenated per-symbol frames — the output of running
              add_technical_indicators() on each symbol and concatenating,
              BEFORE per-symbol labels are attached. Must have 'Date',
              'symbol', 'Close', 'Returns', 'Returns_5d', 'RSI' columns.
    nifty_df: output of fetch_nifty_benchmark().

    Returns `combined` with the MARKET_RELATIVE_FEATURES columns added.
    Labels must be computed AFTER this (per symbol, via create_labels），
    since this function only adds features — it doesn't touch 'label'.
    """
    df = combined.copy()
    df["Date"] = pd.to_datetime(df["Date"])

    nifty_df = nifty_df.copy()
    nifty_df["Date"] = pd.to_datetime(nifty_df["Date"])
    df = df.merge(nifty_df, on="Date", how="left")

    # --- Market-relative (vs. Nifty) ---
    df["Rel_Return"]    = df["Returns"]    - df["Nifty_Return"]
    df["Rel_Return_5d"] = df["Returns_5d"] - df["Nifty_Return_5d"]

    # Sort once so every per-symbol groupby below operates on chronological
    # slices — required for rolling() to mean anything.
    df.sort_values(["symbol", "Date"], inplace=True)

    beta_parts, rs_parts = [], []
    for _, g in df.groupby("symbol", sort=False):
        beta_parts.append(_rolling_beta(g["Returns"], g["Nifty_Return"], beta_window))
        rs_line = g["Close"] / g["Nifty_Close"]
        rs_parts.append(rs_line.pct_change(periods=rs_window))
    df["Beta_20d"]       = pd.concat(beta_parts).reindex(df.index)
    df["RS_line_ROC_10"] = pd.concat(rs_parts).reindex(df.index)

    # --- Cross-sectional (vs. same-date, same-asset-class peers) ---
    df["asset_class"] = df["symbol"].map(ASSET_CLASS).fillna("equity")
    grp = df.groupby(["Date", "asset_class"])
    for col in ["RSI", "Returns"]:
        grp_sum   = grp[col].transform("sum")
        grp_count = grp[col].transform("count")
        # Leave-one-out mean: peer average excluding the stock itself.
        # Where a group has only 1 member on a date, this is NaN (no peers
        # to compare against that day) — dropped downstream like any other
        # feature NaN, not silently zero-filled.
        denom = (grp_count - 1).replace(0, np.nan)
        loo_mean = (grp_sum - df[col]) / denom
        df[f"{col}_rel_class"] = df[col] - loo_mean

    df.drop(columns=["asset_class"], inplace=True)
    return df


def get_peer_symbols(symbol: str, universe: list) -> list:
    """Other symbols in `universe` sharing symbol's asset class."""
    asset_class = ASSET_CLASS.get(symbol, "equity")
    return [s for s in universe
            if s != symbol and ASSET_CLASS.get(s, "equity") == asset_class]


def compute_live_relative_features(symbol: str, target_df: pd.DataFrame,
                                    universe: list, period: str = "6mo") -> dict:
    """
    Compute the same MARKET_RELATIVE_FEATURES for a single symbol's most
    recent row, for use at prediction time (predict_signal()).

    target_df: symbol's own dataframe AFTER add_technical_indicators()
               (needs 'Date', 'Close', 'Returns', 'Returns_5d', 'RSI').
    universe:  the full STOCKS list, used to find peers for the
               cross-sectional (RSI_rel_class / Returns_rel_class) piece.

    NOTE ON LATENCY: this fetches the Nifty index plus every peer in the
    same asset class (9 extra tickers for an equity, 2 for an ETF) on
    every call. That's fine for occasional/manual signal checks, but for
    a live API serving many requests, cache peer-group RSI/Returns
    averages on a schedule (e.g. refresh once per trading day) instead
    of recomputing them per request — see TODO at the bottom of this
    file for a starting point.
    """
    from data.fetch_prices import fetch_prices
    from ml.technical import add_technical_indicators

    target_df = target_df.copy()
    target_df["Date"] = pd.to_datetime(target_df["Date"])
    latest_date = target_df["Date"].iloc[-1]

    # --- Market-relative vs. Nifty ---
    nifty_df = fetch_nifty_benchmark(period=period)
    merged = target_df.merge(nifty_df, on="Date", how="left")
    merged["Rel_Return"]    = merged["Returns"]    - merged["Nifty_Return"]
    merged["Rel_Return_5d"] = merged["Returns_5d"] - merged["Nifty_Return_5d"]
    merged["Beta_20d"]      = _rolling_beta(merged["Returns"], merged["Nifty_Return"], 20)
    rs_line = merged["Close"] / merged["Nifty_Close"]
    merged["RS_line_ROC_10"] = rs_line.pct_change(periods=10)
    latest = merged.iloc[-1]

    # --- Cross-sectional vs. peer group, same date ---
    peers = get_peer_symbols(symbol, universe)
    peer_rsis, peer_rets = [], []
    for peer in peers:
        try:
            pdf = fetch_prices(peer, period=period)
            if pdf.empty:
                continue
            pdf = add_technical_indicators(pdf)
            pdf["Date"] = pd.to_datetime(pdf["Date"])
            # nearest available row on/before the target's latest date —
            # peers may not trade on the exact same calendar day
            pdf = pdf[pdf["Date"] <= latest_date]
            if pdf.empty:
                continue
            row = pdf.iloc[-1]
            peer_rsis.append(row["RSI"])
            peer_rets.append(row["Returns"])
        except Exception as e:
            print(f"  Peer fetch skipped for {peer}: {e}")
            continue

    rsi_rel_class     = latest["RSI"]     - np.mean(peer_rsis) if peer_rsis else 0.0
    returns_rel_class = latest["Returns"] - np.mean(peer_rets) if peer_rets else 0.0

    return {
        "Rel_Return":        float(latest["Rel_Return"])    if pd.notna(latest["Rel_Return"])    else 0.0,
        "Rel_Return_5d":     float(latest["Rel_Return_5d"]) if pd.notna(latest["Rel_Return_5d"]) else 0.0,
        "Beta_20d":          float(latest["Beta_20d"])      if pd.notna(latest["Beta_20d"])      else 0.0,
        "RS_line_ROC_10":    float(latest["RS_line_ROC_10"]) if pd.notna(latest["RS_line_ROC_10"]) else 0.0,
        "RSI_rel_class":     float(rsi_rel_class),
        "Returns_rel_class": float(returns_rel_class),
    }

# TODO (production latency): replace the per-request peer fetch in
# compute_live_relative_features() with a small scheduled job that writes
# {symbol: {"RSI": ..., "Returns": ...}} for the latest trading date to a
# cache (Redis/file/DB), refreshed once after market close. predict_signal()
# would then read cached peer stats instead of re-fetching ~9 tickers per
# prediction request.