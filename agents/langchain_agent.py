# agents/langchain_agent.py

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langchain_core.tools import tool
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

from agents.pipeline import run_pipeline
from ml.screener import screen_stocks
from data.fetch_prices import fetch_prices, SCREENER_UNIVERSE

SYSTEM_PROMPT = """You are TradeMind's investment research assistant.

HARD RULE, never break this: every number you state — price, confidence,
signal, backtest metric, anything quantitative — MUST come directly from
a tool call you made in this conversation. Never estimate, guess, recall
from training data, or round a number "for readability" in a way that
changes it. If a tool doesn't have the information needed to answer, say
so plainly instead of filling the gap with a plausible-sounding number.

When you report a signal, always include: the signal (BUY/SELL/HOLD),
the confidence percentage exactly as the tool returned it, and at least
one reason from the tool's explanation. Never say "confident" or "likely"
in your own words if the underlying confidence is low — represent the
actual number honestly.

Keep answers concise — 2-4 sentences unless the user asks for detail.
"""


@tool
def get_stock_signal(symbol: str) -> str:
    """Get the current trading signal (BUY/SELL/HOLD), calibrated
    confidence, current price, and reasons for an NSE-listed stock.
    `symbol` should be a plain ticker like 'RELIANCE' or 'TCS' (no .NS
    suffix needed)."""
    real_ticker = symbol.upper()
    if not real_ticker.endswith(".NS") and real_ticker not in ("GC=F", "SI=F"):
        real_ticker += ".NS"
    result = run_pipeline(real_ticker)
    if "error" in result:
        return f"Could not get a signal for {symbol}: {result['error']}"
    reasons = "; ".join(result.get("reasons", [])[:3])
    return (
        f"Symbol: {result.get('symbol', symbol)}\n"
        f"Signal: {result.get('signal')}\n"
        f"Confidence: {result.get('confidence')}\n"
        f"Price: {result.get('price')}\n"
        f"Reasons: {reasons}"
    )


@tool
def screen_stocks_by_criteria(query: str) -> str:
    """Find stocks matching a natural-language technical filter, e.g.
    'RSI below 30 and price above 50 day EMA'. Screens across TradeMind's
    tracked NSE universe and returns matching symbols with the exact
    numbers that made each one match. If part of the query can't be
    understood, that's reported too — never silently guessed at."""
    result = screen_stocks(query, universe=SCREENER_UNIVERSE)
    if result.get("error"):
        return result["error"]
    lines = [f"Understood conditions: {', '.join(result['conditions_understood'])}"]
    if result["unparsed_clauses"]:
        lines.append(f"Could NOT understand: {result['unparsed_clauses']}")
    if not result["matches"]:
        lines.append(f"No matches out of {result['symbols_screened']} screened.")
    else:
        lines.append(f"{len(result['matches'])} matches out of {result['symbols_screened']} screened:")
        for m in result["matches"][:10]:  # cap so the LLM isn't flooded
            lines.append(f"  {m['symbol']} (₹{m['price']}): {'; '.join(m['matched_conditions'])}")
    return "\n".join(lines)


@tool
def get_current_price(symbol: str) -> str:
    """Get just the latest closing price for an NSE stock symbol, when
    the user only wants a price and not a full signal."""
    real_ticker = symbol.upper()
    if not real_ticker.endswith(".NS"):
        real_ticker += ".NS"
    df = fetch_prices(real_ticker, period="5d")
    if df.empty:
        return f"No price data found for {symbol}."
    latest_close = float(df["Close"].iloc[-1])
    latest_date = str(df["Date"].iloc[-1])[:10] if "Date" in df.columns else "latest"
    return f"{symbol.upper()}: ₹{latest_close:.2f} as of {latest_date}"


TOOLS = [get_stock_signal, screen_stocks_by_criteria, get_current_price]

_agent = None  # built lazily on first real query, not at import time —
                # importing this module must not crash a server that
                # simply doesn't have OPENAI_API_KEY set yet (same
                # reasoning as notifications/whatsapp.py's lazy credential
                # read).


def _get_agent():
    global _agent
    if _agent is not None:
        return _agent

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY not set. Get a key from platform.openai.com, "
            "then set it as an environment variable (locally) or a "
            "Secret (Hugging Face Space settings) — same setup pattern "
            "as TWILIO_ACCOUNT_SID."
        )

    llm = ChatOpenAI(model="gpt-4o-mini", api_key=api_key, temperature=0)
    _agent = create_agent(model=llm, tools=TOOLS, system_prompt=SYSTEM_PROMPT)
    return _agent


def ask_trademind(question: str) -> dict:
    """
    Main entry point. Returns {"answer": str} on success, or
    {"answer": None, "error": str} if something went wrong (missing key,
    API error, etc.) — never raises, so a caller (e.g. the /ask FastAPI
    route) can return a clean error response instead of a 500.
    """
    try:
        agent = _get_agent()
    except RuntimeError as e:
        return {"answer": None, "error": str(e)}

    try:
        result = agent.invoke({"messages": [{"role": "user", "content": question}]})
        final_message = result["messages"][-1]
        return {"answer": final_message.content, "error": None}
    except Exception as e:
        return {"answer": None, "error": f"Agent query failed: {e}"}


if __name__ == "__main__":
    import sys as _sys
    q = " ".join(_sys.argv[1:]) or "What's the current signal for RELIANCE?"
    print(f"Question: {q}\n")
    result = ask_trademind(q)
    if result["error"]:
        print(f"ERROR: {result['error']}")
    else:
        print(f"Answer: {result['answer']}")