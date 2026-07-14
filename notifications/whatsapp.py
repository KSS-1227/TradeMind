# notifications/whatsapp.py
"""
WhatsApp alert delivery via Twilio's REST API.

Uses plain `requests` calls to Twilio's HTTP API rather than the `twilio`
PyPI package — one fewer dependency, and consistent with how this codebase
already calls Firecrawl directly (see data/fetch_news.py) instead of
pulling in an SDK for a single endpoint.

SETUP (you need to do this — I can't create Twilio credentials for you):
  1. Sign up at twilio.com (free tier is enough for a hackathon demo).
  2. Go to Console > Messaging > Try it out > Send a WhatsApp message.
     This gives you Twilio's WhatsApp Sandbox number and a join code.
  3. From your own phone, WhatsApp the join code to the sandbox number —
     Twilio can only message numbers that have joined the sandbox first.
     Every recipient (including your test phone) must do this once.
  4. Set these environment variables (same os.getenv() pattern as
     FIRECRAWL_API_KEY in data/fetch_news.py):
       TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
       TWILIO_AUTH_TOKEN=your_auth_token
       TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   (sandbox default)

For a real production launch (not the hackathon sandbox), you'd apply for
a Twilio WhatsApp Business number — sandbox numbers require the join-code
step for every user, which doesn't scale past a demo.
"""
import os
import requests

TWILIO_ACCOUNT_SID   = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN    = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

TWILIO_API_URL = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"


def _normalize_whatsapp_number(phone: str) -> str:
    """Accepts '+919876543210', '919876543210', or 'whatsapp:+919876543210'
    and returns the 'whatsapp:+<E.164>' form Twilio requires."""
    phone = phone.strip()
    if phone.startswith("whatsapp:"):
        return phone
    if not phone.startswith("+"):
        phone = "+" + phone
    return f"whatsapp:{phone}"


def send_whatsapp_message(to: str, body: str) -> dict:
    """
    Send a WhatsApp message via Twilio. Returns a dict — either
    {"success": True, "sid": ...} or {"success": False, "error": ...}.
    Never raises — callers (e.g. a loop sending alerts to many
    subscribers) shouldn't have one failed send kill the whole batch.
    """
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        return {
            "success": False,
            "error": "Twilio credentials not configured. Set "
                     "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN env vars — "
                     "see notifications/whatsapp.py docstring for setup.",
        }

    url = TWILIO_API_URL.format(sid=TWILIO_ACCOUNT_SID)
    try:
        resp = requests.post(
            url,
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={
                "From": TWILIO_WHATSAPP_FROM,
                "To":   _normalize_whatsapp_number(to),
                "Body": body,
            },
            timeout=15,
        )
        data = resp.json()
        if resp.status_code in (200, 201):
            return {"success": True, "sid": data.get("sid")}
        return {
            "success": False,
            "error": data.get("message", f"Twilio returned HTTP {resp.status_code}"),
        }
    except requests.RequestException as e:
        return {"success": False, "error": str(e)}


def format_signal_alert(signal_data: dict) -> str:
    """
    Turn a /signal-style response dict (symbol, signal, confidence, price,
    reasons) into a readable WhatsApp message. Deliberately plain text —
    WhatsApp doesn't render markdown tables or rich formatting reliably.
    """
    symbol     = signal_data.get("symbol", "?")
    signal     = signal_data.get("signal", "?")
    confidence = signal_data.get("confidence", "?")
    price      = signal_data.get("price", "?")
    reasons    = signal_data.get("reasons", [])[:3]  # keep it short for WhatsApp

    lines = [
        f"*TradeMind alert: {symbol}*",
        f"Signal: {signal} ({confidence} confidence)",
        f"Price: {price}",
    ]
    if reasons:
        lines.append("")
        lines.append("Why:")
        lines.extend(f"- {r}" for r in reasons)
    lines.append("")
    lines.append("This is a calibrated confidence estimate, not financial advice.")
    return "\n".join(lines)