# ml/screener.py
"""
Natural-Language Screener Builder — TradeMind's flagship differentiator.

Deterministic-first by design, consistent with the rest of this codebase
(no LLM call, no API key, no hallucination risk): a hand-built parser maps
natural-language filter phrases to structured (field, operator, value)
conditions, evaluated against the same indicator columns already computed
by ml/technical.py and ml/market_relative.py.

If a clause can't be confidently parsed, it is surfaced to the caller as
UNPARSED — never silently dropped or guessed at. A screener that quietly
ignores half your query and returns "5 matches" is worse than one that
says "I understood 2 of your 3 conditions, here's the one I couldn't
parse." That's the same "no embellishment" principle behind this
project's calibrated confidence scores — applied to language instead of
probabilities.

Example queries:
  "RSI below 30 and price above 50 day EMA"
  "MACD above signal and volume above average"
  "beta below 1 and RSI below 40"
  "RSI between 30 and 50"
"""
import os
import sys
# Makes 'from data.fetch_prices import ...' and 'from ml.technical import ...'
# work regardless of the current working directory or how this file is
# invoked (e.g. `python ml/screener.py` only puts ml/ on sys.path by
# default, not the repo root) — same pattern as ml/rf_model.py.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import re
import pandas as pd
import numpy as np

# --- Field aliases -----------------------------------------------------
# Natural-language phrase -> canonical dataframe column. Longest phrases
# first (checked at match time) so "50 day ema" doesn't get short-matched
# by a hypothetical shorter "ema" alias before the more specific one runs.
FIELD_ALIASES = {
    "50 day ema":            "EMA_50",
    "50-day ema":            "EMA_50",
    "ema 50":                "EMA_50",
    "ema50":                 "EMA_50",
    "20 day ema":            "EMA_20",
    "20-day ema":            "EMA_20",
    "ema 20":                "EMA_20",
    "ema20":                 "EMA_20",
    "bollinger upper band":  "BB_upper",
    "upper bollinger band":  "BB_upper",
    "bollinger upper":       "BB_upper",
    "upper band":            "BB_upper",
    "bollinger lower band":  "BB_lower",
    "lower bollinger band":  "BB_lower",
    "bollinger lower":       "BB_lower",
    "lower band":            "BB_lower",
    "macd signal":           "MACD_signal",
    "signal line":           "MACD_signal",
    "signal":                "MACD_signal",
    "macd histogram":        "MACD_hist",
    "average volume":        "Volume_MA20",
    "volume average":        "Volume_MA20",
    "20 day volume average": "Volume_MA20",
    "average":               "Volume_MA20",
    "5 day return":          "Returns_5d",
    "5-day return":          "Returns_5d",
    "five day return":       "Returns_5d",
    "daily return":          "Returns",
    "relative strength":     "RS_line_ROC_10",
    "relative strength line":"RS_line_ROC_10",
    "market relative return":"Rel_Return",
    "excess return":         "Rel_Return",
    "sector rsi":            "RSI_rel_class",
    "peer rsi":              "RSI_rel_class",
    "relative rsi":          "RSI_rel_class",
    "close price":           "Close",
    "current price":         "Close",
    "stock price":           "Close",
    "price":                 "Close",
    "close":                 "Close",
    "volume":                "Volume",
    "rsi":                   "RSI",
    "macd":                  "MACD",
    "beta":                  "Beta_20d",
    "return":                "Returns",
    "returns":                "Returns",
}
# Sorted longest-alias-first so multi-word phrases are tried before their
# shorter substrings (e.g. "50 day ema" before "ema").
_FIELD_ALIASES_SORTED = sorted(FIELD_ALIASES.items(), key=lambda kv: -len(kv[0]))

# Columns that require ml/market_relative.py features — a query touching
# any of these triggers the (slower) relative-feature computation instead
# of always paying that cost.
RELATIVE_COLUMNS = {
    "Rel_Return", "Rel_Return_5d", "Beta_20d", "RS_line_ROC_10",
    "RSI_rel_class", "Returns_rel_class",
}

# --- Operator aliases ----------------------------------------------------
# Longest phrase first, same reasoning as FIELD_ALIASES.
OPERATOR_ALIASES = [
    ("is greater than or equal to", ">="),
    ("is less than or equal to",    "<="),
    ("greater than or equal to",    ">="),
    ("less than or equal to",       "<="),
    ("at least",                    ">="),
    ("at most",                     "<="),
    ("or above",                    ">="),
    ("or below",                    "<="),
    ("or higher",                   ">="),
    ("or lower",                    "<="),
    ("greater than",                ">"),
    ("less than",                   "<"),
    ("lower than",                  "<"),
    ("higher than",                 ">"),
    ("more than",                   ">"),
    ("is above",                    ">"),
    ("is below",                    "<"),
    ("is over",                     ">"),
    ("is under",                    "<"),
    ("equals",                      "=="),
    ("equal to",                    "=="),
    ("above",                       ">"),
    ("below",                       "<"),
    ("over",                        ">"),
    ("under",                       "<"),
    (">=",                          ">="),
    ("<=",                          "<="),
    (">",                           ">"),
    ("<",                           "<"),
    ("=",                           "=="),
]

OPS = {
    ">":  lambda a, b: a > b,
    "<":  lambda a, b: a < b,
    ">=": lambda a, b: a >= b,
    "<=": lambda a, b: a <= b,
    "==": lambda a, b: np.isclose(a, b, rtol=0.02),
}


class ParsedCondition:
    def __init__(self, raw_clause, field, op, value, value_is_field=False):
        self.raw_clause    = raw_clause
        self.field         = field
        self.op            = op
        self.value         = value            # float, OR a column name if value_is_field
        self.value_is_field = value_is_field

    def describe(self):
        val = self.value if not self.value_is_field else self.value
        return f"{self.field} {self.op} {val}"

    def evaluate(self, row):
        left = row.get(self.field)
        right = row.get(self.value) if self.value_is_field else self.value
        if left is None or right is None or pd.isna(left) or pd.isna(right):
            return False, left, right
        return bool(OPS[self.op](left, right)), left, right


def _match_field(text: str):
    """Longest-alias-first match. Returns (canonical_column, remaining_text) or None."""
    text_l = text.strip().lower()
    for alias, col in _FIELD_ALIASES_SORTED:
        if text_l == alias or text_l.startswith(alias + " ") or text_l.endswith(" " + alias):
            return col
    return None


def _match_operator(text: str):
    """Longest-operator-first match anywhere in the clause. Returns (op_symbol, span) or None."""
    text_l = text.lower()
    for phrase, symbol in OPERATOR_ALIASES:
        idx = text_l.find(f" {phrase} ")
        if idx != -1:
            return symbol, idx + 1, idx + 1 + len(phrase)
        # allow operator right after the field with no leading space edge case
        if text_l.startswith(phrase + " "):
            return symbol, 0, len(phrase)
    return None


def parse_clause(clause: str):
    """
    Parse a single condition clause like "RSI below 30" or
    "price above 50 day EMA" into a ParsedCondition, or return None if
    it can't be confidently parsed (caller is responsible for surfacing
    this to the user rather than silently dropping it).
    """
    clause = clause.strip()
    if not clause:
        return None

    op_match = _match_operator(clause)
    if op_match is None:
        return None
    op_symbol, start, end = op_match

    field_text = clause[:start].strip()
    value_text = clause[end:].strip()

    field_col = _match_field(field_text)
    if field_col is None:
        return None

    # Value is either a number, or another field alias (cross-column
    # comparisons like "price above 50 day EMA").
    value_text_clean = value_text.rstrip(".")
    try:
        value = float(re.sub(r"[%,]", "", value_text_clean))
        return ParsedCondition(clause, field_col, op_symbol, value, value_is_field=False)
    except ValueError:
        value_field = _match_field(value_text_clean)
        if value_field is not None:
            return ParsedCondition(clause, field_col, op_symbol, value_field, value_is_field=True)
        return None


def parse_query(query: str):
    """
    Split on 'and'/',' (AND semantics only for this MVP — OR support is a
    reasonable follow-up but adds real ambiguity: "RSI below 30 or above
    70" needs different grouping logic than a flat clause list) and parse
    each clause independently.

    Returns (parsed_conditions: list[ParsedCondition], unparsed_clauses: list[str])
    """
    # Normalize "between X and Y" into two clauses before the generic
    # " and " split would otherwise break it apart wrongly.
    query = re.sub(
        r"([a-zA-Z0-9_\- ]+?)\s+between\s+([\d.]+)\s+and\s+([\d.]+)",
        r"\1 above \2 and \1 below \3",
        query, flags=re.IGNORECASE,
    )

    raw_clauses = re.split(r"\s+and\s+|,\s*", query, flags=re.IGNORECASE)
    parsed, unparsed = [], []
    for raw in raw_clauses:
        cond = parse_clause(raw)
        if cond is not None:
            parsed.append(cond)
        elif raw.strip():
            unparsed.append(raw.strip())
    return parsed, unparsed


def needs_relative_features(conditions) -> bool:
    for c in conditions:
        if c.field in RELATIVE_COLUMNS:
            return True
        if c.value_is_field and c.value in RELATIVE_COLUMNS:
            return True
    return False


def build_snapshot(universe: list, period: str = "6mo",
                    include_relative: bool = False) -> pd.DataFrame:
    """
    Fetch the latest indicator row for every symbol in `universe`.
    Uses fetch_prices_batch() (one yfinance call for the whole universe)
    rather than a sequential per-symbol loop — with SCREENER_UNIVERSE at
    ~40 symbols instead of the model's 13, sequential fetching would make
    a live screener query noticeably slower.

    include_relative=True also computes market-relative/cross-sectional
    features (needs Nifty + full-universe alignment — see
    ml/market_relative.py) — only pay that cost when the query actually
    references those fields (see needs_relative_features()).
    """
    from data.fetch_prices import fetch_prices_batch
    from ml.technical import add_technical_indicators

    fetched = fetch_prices_batch(universe, period=period)

    rows = []
    per_symbol_indicators = {}
    for symbol in universe:
        df = fetched.get(symbol)
        if df is None or df.empty:
            continue
        df = add_technical_indicators(df)
        if df.empty:
            continue
        per_symbol_indicators[symbol] = df
        latest = df.iloc[-1].to_dict()
        latest["symbol"] = symbol
        rows.append(latest)

    snapshot = pd.DataFrame(rows)

    if include_relative and not snapshot.empty:
        from ml.market_relative import fetch_nifty_benchmark, add_market_relative_features
        nifty_df = fetch_nifty_benchmark(period=period)
        # add_market_relative_features needs multi-row per-symbol history
        # for the rolling beta/RS-line calcs — reuse the indicator frames
        # already fetched above instead of re-fetching.
        all_hist = list(per_symbol_indicators.values())
        combined = pd.concat(all_hist, ignore_index=True)
        combined = add_market_relative_features(combined, nifty_df)
        # take the latest row per symbol, and pull just the relative columns
        latest_rel = (combined.sort_values("Date")
                               .groupby("symbol", as_index=False)
                               .tail(1)[["symbol"] + list(RELATIVE_COLUMNS)])
        snapshot = snapshot.merge(latest_rel, on="symbol", how="left")

    return snapshot


def screen_stocks(query: str, universe: list = None, period: str = "6mo") -> dict:
    """
    Full screener entry point: parse the NL query, fetch what's needed,
    evaluate every symbol, return matches with per-condition breakdowns.
    """
    if universe is None:
        from data.fetch_prices import SCREENER_UNIVERSE
        universe = SCREENER_UNIVERSE

    conditions, unparsed = parse_query(query)
    if not conditions:
        return {
            "query": query,
            "conditions_understood": [],
            "unparsed_clauses": unparsed,
            "matches": [],
            "error": "Couldn't parse any conditions from this query. "
                     "Try phrasing like 'RSI below 30 and price above 50 day EMA'.",
        }

    include_relative = needs_relative_features(conditions)
    snapshot = build_snapshot(universe, period=period, include_relative=include_relative)

    matches = []
    for _, row in snapshot.iterrows():
        results = [c.evaluate(row) for c in conditions]
        if all(ok for ok, _, _ in results):
            breakdown = [
                f"{c.field}={left:.2f} {c.op} "
                f"{(right if not c.value_is_field else f'{c.value}={right:.2f}')}"
                for c, (ok, left, right) in zip(conditions, results)
            ]
            matches.append({
                "symbol": row["symbol"],
                "price": round(float(row.get("Close", np.nan)), 2),
                "matched_conditions": breakdown,
            })

    return {
        "query": query,
        "conditions_understood": [c.describe() for c in conditions],
        "unparsed_clauses": unparsed,
        "matches": matches,
        "symbols_screened": len(snapshot),
    }


if __name__ == "__main__":
    import sys
    query = " ".join(sys.argv[1:]) or "RSI below 40 and price above 50 day EMA"
    print(f"Query: {query}\n")
    result = screen_stocks(query)
    print("Conditions understood:")
    for c in result["conditions_understood"]:
        print(f"  - {c}")
    if result["unparsed_clauses"]:
        print("Could NOT parse:")
        for u in result["unparsed_clauses"]:
            print(f"  - {u!r}")
    print(f"\nScreened {result.get('symbols_screened', 0)} symbols, "
          f"{len(result['matches'])} matches:")
    for m in result["matches"]:
        print(f"  {m['symbol']} (₹{m['price']})")
        for cond in m["matched_conditions"]:
            print(f"      {cond}")