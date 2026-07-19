# notifications/whatsapp.py
"""
WhatsApp alert delivery via Twilio's REST API.

SETUP:
  1. Sign up at twilio.com (free tier is fine for a hackathon demo).
  2. Go to Console > Messaging > Try it out > Send a WhatsApp message.
     This gives you the sandbox number and a join code.
  3. From your phone, WhatsApp the join code to the sandbox number once.
     Every recipient must do this before they can receive messages.
  4. Set these env vars in Hugging Face Space settings:
       TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
       TWILIO_AUTH_TOKEN=your_auth_token
       TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   (sandbox default)
"""
import os
import requests

# ── Read credentials at call time, not import time ──────────────────────────
# HF Spaces injects env vars after module import on cold starts.
# Reading at the top of each function guarantees we always get the live value.

TWILIO_API_URL = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"


def _get_credentials():
    """Return (sid, token, from_number) — read fresh each call so HF Space
    env-var injection is never missed due to module-level caching."""
    return (
        os.getenv("TWILIO_ACCOUNT_SID"),
        os.getenv("TWILIO_AUTH_TOKEN"),
        os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886"),
    )


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
    Send a WhatsApp message via Twilio.
    Returns:
      Success: {"success": True,  "sid": "SM...", "provider": "twilio", "recipient": "whatsapp:+91..."}
      Failure: {"success": False, "error": "<reason>", "http_status": <int>, "raw": {...}}
    Never raises — callers must check ["success"].
    """
    sid, token, from_number = _get_credentials()

    # ── Credential check ─────────────────────────────────────
    if not sid or not token:
        msg = (
            f"Twilio credentials missing. "
            f"TWILIO_ACCOUNT_SID={'SET' if sid else 'MISSING'}, "
            f"TWILIO_AUTH_TOKEN={'SET' if token else 'MISSING'}. "
            f"Add them in HF Space Settings → Variables."
        )
        print(f"[whatsapp] CREDENTIAL ERROR: {msg}")
        return {"success": False, "error": msg}

    to_normalized = _normalize_whatsapp_number(to)
    url           = TWILIO_API_URL.format(sid=sid)
    payload       = {"From": from_number, "To": to_normalized, "Body": body}

    print(f"[whatsapp] Sending to={to_normalized} from={from_number} url={url}")
    print(f"[whatsapp] Body preview: {body[:120]}...")

    try:
        resp = requests.post(
            url,
            auth=(sid, token),
            data=payload,
            timeout=15,
        )
        raw  = {}
        try:
            raw = resp.json()
        except Exception:
            raw = {"raw_text": resp.text[:500]}

        print(f"[whatsapp] Twilio HTTP {resp.status_code}: {raw}")

        if resp.status_code in (200, 201):
            message_sid = raw.get("sid", "")
            print(f"[whatsapp] SUCCESS — SID={message_sid}")
            return {
                "success":   True,
                "sid":       message_sid,
                "provider":  "twilio",
                "recipient": to_normalized,
            }

        # Twilio error response — extract the most useful fields
        twilio_error = raw.get("message") or raw.get("more_info") or f"HTTP {resp.status_code}"
        twilio_code  = raw.get("code", "")
        error_msg    = f"Twilio error {twilio_code}: {twilio_error}" if twilio_code else twilio_error

        print(f"[whatsapp] FAILED — {error_msg}")
        return {
            "success":     False,
            "error":       error_msg,
            "http_status": resp.status_code,
            "raw":         raw,
        }

    except requests.Timeout:
        msg = "Twilio request timed out after 15 seconds."
        print(f"[whatsapp] TIMEOUT: {msg}")
        return {"success": False, "error": msg}
    except requests.RequestException as e:
        msg = f"Network error calling Twilio: {str(e)}"
        print(f"[whatsapp] NETWORK ERROR: {msg}")
        return {"success": False, "error": msg}


def format_signal_alert(signal_data: dict) -> str:
    """Basic alert format — used by the scheduled check-alerts endpoint."""
    symbol     = signal_data.get("symbol", "?")
    signal     = signal_data.get("signal", "?")
    confidence = signal_data.get("confidence", "?")
    price      = signal_data.get("price", "?")
    reasons    = signal_data.get("reasons", [])[:3]

    lines = [
        f"*TradeMind alert: {symbol}*",
        f"Signal: {signal} ({confidence} confidence)",
        f"Price: {price}",
    ]
    if reasons:
        lines += ["", "Why:"] + [f"- {r}" for r in reasons]
    lines += ["", "Not financial advice."]
    return "\n".join(lines)


def format_instant_alert(signal_data: dict) -> str:
    """
    Professional demo alert — includes price, signal, confidence,
    AI reasons, and calculated entry/target/stop levels.
    """
    symbol     = signal_data.get("symbol", "?")
    signal     = signal_data.get("signal", "HOLD")
    confidence = signal_data.get("confidence", "?")
    price_raw  = signal_data.get("price", "₹0")
    reasons    = signal_data.get("reasons", [])[:3]

    sig_emoji = {"BUY": "✅", "SELL": "🔴", "HOLD": "⏸️"}.get(signal, "")

    try:
        price_num = float(str(price_raw).replace("₹", "").replace(",", ""))
    except Exception:
        price_num = 0

    if signal == "BUY" and price_num:
        levels = (
            f"📌 *Entry:* ₹{price_num * 0.997:,.2f} – ₹{price_num * 1.003:,.2f}\n"
            f"🎯 *Target:* ₹{price_num * 1.05:,.2f}\n"
            f"🛑 *Stop Loss:* ₹{price_num * 0.96:,.2f}"
        )
    elif signal == "SELL" and price_num:
        levels = (
            f"📌 *Entry (short):* ₹{price_num * 0.997:,.2f} – ₹{price_num * 1.003:,.2f}\n"
            f"🎯 *Target:* ₹{price_num * 0.95:,.2f}\n"
            f"🛑 *Stop Loss:* ₹{price_num * 1.04:,.2f}"
        )
    else:
        levels = "📌 *Action:* Hold current position"

    reasons_text = "\n".join(f"• {r}" for r in reasons) if reasons else "• Indicator-based signal"

    return (
        f"🚨 *TradeMind AI Alert*\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"📈 *Stock:* {symbol}\n"
        f"💰 *Current Price:* {price_raw}\n"
        f"🤖 *AI Recommendation:* {signal} {sig_emoji}\n"
        f"🎯 *Confidence:* {confidence}\n\n"
        f"*Reason:*\n{reasons_text}\n\n"
        f"*Suggested Action:*\n{levels}\n\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"_Generated by TradeMind AI_\n"
        f"_Not financial advice._"
    )
