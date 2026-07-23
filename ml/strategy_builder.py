# ml/strategy_builder.py
"""
No-Code Strategy Builder — type a rule in plain English, get a real
5-year backtest of that exact rule, not the trained ML model's signals.

Deliberately built as thin glue over two already-tested pieces, not a
rewrite:
  - ml/screener.py's parse_query() — same deterministic parser used by
    the live screener. A rule here is parsed exactly the same way a
    screener query is; we're just evaluating it against every historical
    row instead of only today's snapshot.
  - ml/backtest.py's run_backtest_from_signals() — the same backtrader
    simulation (stop-loss, max-drawdown circuit breaker, commission,
    Sharpe/win-rate/benchmark) the trained-model backtest already uses.
    That function doesn't care where the 'signal' column came from.

STRATEGY CONVENTION (read this before interpreting results): a rule
here is treated as an ENTRY-AND-HOLD condition, not a separate buy/sell
pair. Every day the parsed condition(s) evaluate True → signal='BUY'
(only acts if not already positioned — see ml/backtest.py's
TradeMindStrategy). Every day they evaluate False → signal='SELL' (only
acts if currently positioned). Net effect: "stay invested exactly while
the condition holds, exit the moment it stops holding." A rule like
"RSI below 30" therefore means "hold RELIANCE on every day its RSI is
under 30, in cash otherwise" — not a one-time trade. This is stated
explicitly in the returned result so it's never ambiguous to the caller.
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd

from ml.screener import parse_query, needs_relative_features
from ml.backtest import run_backtest_from_signals, _build_relative_features_for_symbol
from ml.technical import add_technical_indicators
from data.fetch_prices import fetch_prices

STRATEGY_CONVENTION = (
    "Signal = BUY on every day the rule is true (enters if not already "
    "holding), SELL on every day it's false (exits if currently holding). "
    "This backtests 'stay invested while the condition holds', not a "
    "single one-off trade."
)


def generate_rule_based_signals(query: str, symbol: str, period: str = "5y"):
    """
    Parse `query` (same parser as the live screener) and evaluate it
    against every historical row for `symbol`, producing a day-by-day
    BUY/SELL signal column per STRATEGY_CONVENTION above.

    Returns (df_with_signal_column, conditions_understood, unparsed_clauses).
    Raises ValueError if nothing in the query could be parsed — same
    "never silently guess" principle as the screener.
    """
    conditions, unparsed = parse_query(query)
    if not conditions:
        raise ValueError(
            f"Couldn't parse any conditions from {query!r}. Try phrasing "
            f"like 'RSI below 30 and price above 50 day EMA'."
        )

    if needs_relative_features(conditions):
        df = _build_relative_features_for_symbol(symbol, period)
    else:
        df = fetch_prices(symbol, period=period)
        if df.empty:
            raise ValueError(f"No price data for {symbol}")
        df = add_technical_indicators(df)

    if df.empty:
        raise ValueError(f"No usable historical data for {symbol}")

    df = df.sort_values("Date").reset_index(drop=True)

    signals = []
    for _, row in df.iterrows():
        condition_met = all(c.evaluate(row)[0] for c in conditions)
        signals.append("BUY" if condition_met else "SELL")
    df["signal"] = signals

    # Diagnostic: how often was the rule actually true? A rule combining
    # contradictory technical conditions (e.g. RSI<30 "oversold/falling"
    # AND Close>EMA_50 "uptrend") can be true on 0 or very few days across
    # real history — that produces a correct-but-uninformative 0-trade
    # backtest, which looks like a bug if you don't know why. Surface it.
    true_days = sum(1 for s in signals if s == "BUY")
    total_days = len(signals)
    true_pct = (true_days / total_days * 100) if total_days else 0
    print(f"Rule was TRUE on {true_days}/{total_days} days ({true_pct:.1f}%).")
    if true_days == 0:
        print("WARNING: the rule never triggered across this history — the "
              "0-trade result below is expected given that, not a bug. "
              "This usually means the combined conditions are contradictory "
              "(e.g. an oversold condition + an uptrend condition rarely "
              "co-occur). Try a single condition, or a less restrictive "
              "combination, to confirm the pipeline itself is working.")

    return df, [c.describe() for c in conditions], unparsed


def backtest_custom_rule(query: str, symbol: str, period: str = "5y",
                          initial_cash: float = 100000.0) -> dict:
    """
    Full entry point: parse the rule, build historical signals, run it
    through the real backtest engine, return the same metric shape
    ml/backtest.py's run_backtest() already returns, plus the parsed-rule
    metadata so the caller can show the user exactly what was tested.
    """
    real_ticker = symbol.upper()
    if not real_ticker.endswith(".NS"):
        real_ticker += ".NS"

    df, conditions_understood, unparsed = generate_rule_based_signals(
        query, real_ticker, period)

    result = run_backtest_from_signals(real_ticker, df, initial_cash, period)
    if "error" in result:
        return result

    result["query"] = query
    result["conditions_understood"] = conditions_understood
    result["unparsed_clauses"] = unparsed
    result["strategy_convention"] = STRATEGY_CONVENTION
    return result


if __name__ == "__main__":
    import sys as _sys
    query = " ".join(_sys.argv[2:]) if len(_sys.argv) > 2 else "price above 50 day EMA"
    symbol = _sys.argv[1] if len(_sys.argv) > 1 else "RELIANCE"

    print(f"Backtesting rule {query!r} on {symbol}...\n")
    result = backtest_custom_rule(query, symbol)

    if "error" in result:
        print("ERROR:", result["error"])
    else:
        print(f"Conditions understood: {result['conditions_understood']}")
        if result["unparsed_clauses"]:
            print(f"Could NOT understand: {result['unparsed_clauses']}")
        print(f"\n{result['strategy_convention']}\n")
        print(f"Total Return : {result['total_return']}%")
        print(f"Sharpe Ratio : {result['sharpe_ratio']}")
        print(f"Max Drawdown : {result['max_drawdown']}%")
        print(f"Win Rate     : {result['win_rate']}%")
        print(f"Total Trades : {result['total_trades']}")