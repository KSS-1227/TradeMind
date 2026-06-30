# ml/backtest.py
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import backtrader as bt
import pandas as pd
import numpy as np
import joblib
from datetime import datetime

from data.fetch_prices import fetch_prices
from ml.technical import add_technical_indicators

MODEL_PATH  = "ml/rf_model.pkl"
SCALER_PATH = "ml/scaler.pkl"

FEATURES = [
    "RSI", "MACD", "MACD_signal", "MACD_hist",
    "BB_upper", "BB_lower", "EMA_20", "EMA_50",
    "Volume_MA20", "Returns", "Returns_5d", "Volume"
]

# ── 1. Generate signals for entire history ─────────────────
def generate_historical_signals(symbol: str, period: str = "2y") -> pd.DataFrame:
    """Run RF model on every row of historical data"""
    model  = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    df = fetch_prices(symbol, period=period)
    df = add_technical_indicators(df)

    signals = []
    for i in range(len(df)):
        row = df.iloc[i]
        try:
            X = np.array([[float(row.get(f, 0)) for f in FEATURES]])
            X_scaled = scaler.transform(X)
            pred  = model.predict(X_scaled)[0]
            label = {0: "SELL", 1: "HOLD", 2: "BUY"}[pred]
        except:
            label = "HOLD"
        signals.append(label)

    df["signal"] = signals
    return df

# ── 2. Backtrader Strategy ─────────────────────────────────
class TradeMindStrategy(bt.Strategy):
    params = dict(signals=None, stop_loss_pct=0.05, max_dd_pct=0.15)

    def __init__(self):
        self.signal_map = {}
        if self.params.signals is not None:
            for _, row in self.params.signals.iterrows():
                date_str = str(row["Date"])[:10]
                self.signal_map[date_str] = row["signal"]

        self.trades = 0
        self.wins = 0
        self.trade_log = []
        self.entry_price = None
        self.peak_value = self.broker.getvalue()

    def next(self):
        date_str = self.datas[0].datetime.date(0).strftime("%Y-%m-%d")
        signal = self.signal_map.get(date_str, "HOLD")
        price = self.datas[0].close[0]

        # Track portfolio peak for max drawdown check
        current_value = self.broker.getvalue()
        self.peak_value = max(self.peak_value, current_value)
        current_dd = (self.peak_value - current_value) / self.peak_value

        # Force exit if max drawdown limit breached
        if self.position and current_dd > self.params.max_dd_pct:
            self.sell(size=self.position.size)
            self.trade_log.append({"date": date_str, "action": "FORCE_EXIT_DD", "price": round(price,2)})
            self.entry_price = None
            return

        # Stop-loss check
        if self.position and self.entry_price:
            loss_pct = (self.entry_price - price) / self.entry_price
            if loss_pct > self.params.stop_loss_pct:
                self.sell(size=self.position.size)
                self.trade_log.append({"date": date_str, "action": "STOP_LOSS", "price": round(price,2)})
                self.entry_price = None
                return

        if signal == "BUY" and not self.position:
            size = int(self.broker.getcash() * 0.95 / price)
            if size > 0:
                self.buy(size=size)
                self.entry_price = price
                self.trade_log.append({"date": date_str, "action": "BUY", "price": round(price,2)})

        elif signal == "SELL" and self.position:
            self.sell(size=self.position.size)
            self.trades += 1
            if price > (self.entry_price or price):
                self.wins += 1
            self.trade_log.append({"date": date_str, "action": "SELL", "price": round(price,2)})
            self.entry_price = None
# ── 3. Run backtest ────────────────────────────────────────
def run_backtest(symbol: str, initial_cash: float = 100000.0,
                 period: str = "2y") -> dict:
    """
    Run full backtest for a symbol
    Returns metrics + daily portfolio values
    """
    print(f"\nRunning backtest for {symbol}...")

    # Generate signals
    df = generate_historical_signals(symbol, period)
    if df.empty:
        return {"error": f"No data for {symbol}"}

    # Prepare OHLCV data for backtrader
    bt_df = df[["Date","Open","High","Low","Close","Volume"]].copy()

    # Flatten MultiIndex if needed
    if isinstance(bt_df.columns, pd.MultiIndex):
        bt_df.columns = bt_df.columns.get_level_values(0)

    bt_df["Date"]   = pd.to_datetime(bt_df["Date"])
    bt_df           = bt_df.set_index("Date")
    bt_df           = bt_df.astype(float)
    bt_df           = bt_df.dropna()

    # Create backtrader data feed
    data_feed = bt.feeds.PandasData(dataname=bt_df)

    # Set up cerebro
    cerebro = bt.Cerebro()
    cerebro.adddata(data_feed)
    cerebro.addstrategy(TradeMindStrategy, signals=df)
    cerebro.broker.setcash(initial_cash)
    cerebro.broker.setcommission(commission=0.001)  # 0.1% per trade

    # Add analyzers
    cerebro.addanalyzer(bt.analyzers.SharpeRatio,
                        _name="sharpe", riskfreerate=0.06,
                        annualize=True, timeframe=bt.TimeFrame.Days)
    cerebro.addanalyzer(bt.analyzers.DrawDown,    _name="drawdown")
    cerebro.addanalyzer(bt.analyzers.TradeAnalyzer, _name="trades")
    cerebro.addanalyzer(bt.analyzers.TimeReturn,  _name="returns",
                        timeframe=bt.TimeFrame.Days)

    # Run
    results   = cerebro.run()
    strategy  = results[0]
    final_val = cerebro.broker.getvalue()

    # Extract metrics
    sharpe_ratio = strategy.analyzers.sharpe.get_analysis().get(
        "sharperatio", 0) or 0

    dd_analysis  = strategy.analyzers.drawdown.get_analysis()
    max_drawdown = dd_analysis.get("max", {}).get("drawdown", 0)

    trade_analysis = strategy.analyzers.trades.get_analysis()
    total_trades   = trade_analysis.get("total", {}).get("closed", 0)
    won_trades     = trade_analysis.get("won",   {}).get("total",  0)
    win_rate       = (won_trades / total_trades * 100) if total_trades > 0 else 0

    total_return   = ((final_val - initial_cash) / initial_cash) * 100

    # Daily portfolio values for chart
    daily_returns  = strategy.analyzers.returns.get_analysis()
    portfolio_curve = []
    value = initial_cash
    for date, ret in daily_returns.items():
        value = value * (1 + ret)
        portfolio_curve.append({
            "date":  str(date)[:10],
            "value": round(value, 2),
            "return_pct": round((value - initial_cash) / initial_cash * 100, 2)
        })

    # Nifty50 benchmark
    benchmark = generate_benchmark(period)

    print(f"Backtest complete for {symbol}")
    print(f"  Total Return : {round(total_return, 2)}%")
    print(f"  Sharpe Ratio : {round(sharpe_ratio, 3)}")
    print(f"  Max Drawdown : {round(max_drawdown, 2)}%")
    print(f"  Win Rate     : {round(win_rate, 2)}%")
    print(f"  Total Trades : {total_trades}")

    return {
        "symbol":          symbol,
        "initial_cash":    initial_cash,
        "final_value":     round(final_val, 2),
        "total_return":    round(total_return, 2),
        "sharpe_ratio":    round(float(sharpe_ratio), 3),
        "max_drawdown":    round(float(max_drawdown), 2),
        "win_rate":        round(win_rate, 2),
        "total_trades":    total_trades,
        "portfolio_curve": portfolio_curve,
        "benchmark":       benchmark,
        "trade_log":       strategy.trade_log[-10:],
    }

# ── 4. Nifty50 benchmark ───────────────────────────────────
def generate_benchmark(period: str = "2y") -> list:
    """Buy and hold Nifty50 benchmark"""
    try:
        df = fetch_prices("^NSEI", period=period)
        if df.empty:
            return []

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df = df.dropna(subset=["Close"])
        initial = float(df["Close"].iloc[0])

        result = []
        for _, row in df.iterrows():
            try:
                close = float(row["Close"])
                result.append({
                    "date":       str(row["Date"])[:10],
                    "value":      round(100000 * close / initial, 2),
                    "return_pct": round((close - initial) / initial * 100, 2)
                })
            except:
                continue
        return result
    except Exception as e:
        print(f"Benchmark error: {e}")
        return []

if __name__ == "__main__":
    result = run_backtest("RELIANCE.NS", period="5y")

    print(f"\n{'='*50}")
    print(f"BACKTEST RESULTS — {result['symbol']}")
    print(f"{'='*50}")
    print(f"Initial Capital : ₹{result['initial_cash']:,.0f}")
    print(f"Final Value     : ₹{result['final_value']:,.0f}")
    print(f"Total Return    : {result['total_return']}%")
    print(f"Sharpe Ratio    : {result['sharpe_ratio']}")
    print(f"Max Drawdown    : {result['max_drawdown']}%")
    print(f"Win Rate        : {result['win_rate']}%")
    print(f"Total Trades    : {result['total_trades']}")
    print(f"\nLast 5 trades:")
    for t in result["trade_log"][-5:]:
        print(f"  {t['date']} — {t['action']} @ ₹{t['price']}")