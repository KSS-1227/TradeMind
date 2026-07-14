# notifications/subscriptions.py
"""
Tracks which phone numbers want WhatsApp alerts for which stocks.

This is the one piece of the WhatsApp feature that DOES need persistent
storage — you can't alert someone without remembering their number and
what they asked to be alerted about. That's inherent to the feature, not
a design choice that can be avoided.

To be clear about scale, since storage came up before: this is a tiny
JSON file of {phone, symbol} pairs — a few KB even with thousands of
subscriptions, nothing like the price-history datasets used for model
training. No historical data is stored here, just current subscriptions.

For a hackathon demo, a JSON file is the right amount of engineering —
it needs zero setup (no database server, no schema migrations) and
survives a backend restart, which an in-memory dict wouldn't. For a real
production deployment with many users, swap this for an actual database
table (Postgres/SQLite) — the function signatures below are written so
that swap doesn't touch any calling code in backend/main.py.
"""
import json
import os
import threading

SUBSCRIPTIONS_PATH = os.path.join(os.path.dirname(__file__), "subscriptions.json")
_lock = threading.Lock()  # guards concurrent read-modify-write from multiple requests


def _load() -> list:
    if not os.path.exists(SUBSCRIPTIONS_PATH):
        return []
    try:
        with open(SUBSCRIPTIONS_PATH, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _save(subs: list):
    with open(SUBSCRIPTIONS_PATH, "w") as f:
        json.dump(subs, f, indent=2)


def add_subscription(phone: str, symbol: str) -> dict:
    symbol = symbol.upper()
    if not symbol.endswith(".NS"):
        symbol += ".NS"
    with _lock:
        subs = _load()
        if any(s["phone"] == phone and s["symbol"] == symbol for s in subs):
            return {"added": False, "reason": "already subscribed"}
        subs.append({"phone": phone, "symbol": symbol})
        _save(subs)
    return {"added": True}


def remove_subscription(phone: str, symbol: str) -> dict:
    symbol = symbol.upper()
    if not symbol.endswith(".NS"):
        symbol += ".NS"
    with _lock:
        subs = _load()
        new_subs = [s for s in subs
                    if not (s["phone"] == phone and s["symbol"] == symbol)]
        removed = len(new_subs) != len(subs)
        _save(new_subs)
    return {"removed": removed}


def list_subscriptions(symbol: str = None) -> list:
    subs = _load()
    if symbol is None:
        return subs
    symbol = symbol.upper()
    if not symbol.endswith(".NS"):
        symbol += ".NS"
    return [s for s in subs if s["symbol"] == symbol]


def symbols_with_subscribers() -> list:
    """Unique list of symbols anyone is subscribed to — used by the
    alert-check job so it only evaluates signals for stocks someone
    actually cares about, not the whole universe."""
    return sorted({s["symbol"] for s in _load()})