"""
notifications/whatsapp_templates.py

TradeMind WhatsApp Message Templates

Purpose
-------
Formats all WhatsApp responses sent by TradeMind.

This module contains NO AI logic.
This module contains NO business logic.

It only converts structured data into clean,
human-friendly WhatsApp messages.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------

def _divider() -> str:
    return "━━━━━━━━━━━━━━━━━━"


def _bullet(items: List[str]) -> str:
    if not items:
        return "• No additional information available."

    return "\n".join(f"• {item}" for item in items)


# ---------------------------------------------------------
# Welcome
# ---------------------------------------------------------

def welcome_message() -> str:
    return (
        "🤖 *Welcome to TradeMind AI*\n"
        f"{_divider()}\n\n"
        "Your AI Financial Copilot.\n\n"
        "Simply send:\n\n"
        "📈 Reliance\n"
        "📈 TCS\n"
        "📈 Infosys\n"
        "📈 HDFC Bank\n\n"
        "You'll instantly receive:\n"
        "• Current Price\n"
        "• AI Recommendation\n"
        "• Market News\n"
        "• Technical Outlook\n"
        "• Risk Analysis\n\n"
        "Type *HELP* anytime."
    )


# ---------------------------------------------------------
# Help
# ---------------------------------------------------------

def help_message() ->str:
    return (
        "📚 *TradeMind Commands*\n"
        f"{_divider()}\n\n"
        "Simply send a stock name.\n\n"
        "Examples:\n"
        "• Reliance\n"
        "• TCS\n"
        "• Infosys\n\n"
        "Other commands:\n\n"
        "NEWS\n"
        "TECHNICAL\n"
        "COMPARE <Stock>\n"
        "HELP\n"
    )


# ---------------------------------------------------------
# Unsupported Symbol
# ---------------------------------------------------------

def unsupported_symbol(symbol: str) -> str:
    return (
        "❌ *Stock Not Supported*\n"
        f"{_divider()}\n\n"
        f"'{symbol}' is not available.\n\n"
        "Examples:\n"
        "• Reliance\n"
        "• TCS\n"
        "• Infosys\n"
        "• HDFC Bank\n"
        "• Gold\n"
        "• Silver"
    )


# ---------------------------------------------------------
# AI Stock Analysis
# ---------------------------------------------------------

def stock_analysis(data: Dict) -> str:

    signal = data.get("signal", "HOLD")

    emoji = {
        "BUY": "🟢",
        "SELL": "🔴",
        "HOLD": "🟡",
    }.get(signal, "⚪")

    reasons = _bullet(data.get("reasoning", []))

    return (
        f"🤖 *TradeMind AI Analysis*\n"
        f"{_divider()}\n\n"
        f"📈 *Stock:* {data.get('symbol')}\n"
        f"💰 *Current Price:* {data.get('current_price')}\n\n"

        f"{emoji} *Recommendation:* {signal}\n"
        f"🎯 *Confidence:* {data.get('confidence')}%\n"
        f"📊 *Risk:* {data.get('overall_risk')}\n"
        f"📈 *Expected Return:* {data.get('expected_return')}\n"
        f"🔮 *Predicted Price:* {data.get('predicted_price')}\n\n"

        "🧠 *AI Models*\n"
        "✅ Random Forest\n"
        "✅ LSTM\n"
        "✅ FinBERT\n\n"

        "📌 *Why?*\n"
        f"{reasons}\n\n"

        "Reply:\n"
        "NEWS\n"
        "TECHNICAL\n"
        "COMPARE <Stock>"
    )


# ---------------------------------------------------------
# Firecrawl News
# ---------------------------------------------------------

def latest_news(symbol: str, news: List[str]) -> str:

    return (
        f"📰 *Latest News*\n"
        f"{_divider()}\n\n"
        f"📈 {symbol}\n\n"
        f"{_bullet(news)}\n\n"
        "_Powered by Firecrawl_"
    )


# ---------------------------------------------------------
# Technical Summary
# ---------------------------------------------------------

def technical_summary(data: Dict) -> str:

    return (
        "📊 *Technical Analysis*\n"
        f"{_divider()}\n\n"

        f"RSI: {data.get('rsi')}\n"
        f"MACD: {data.get('macd')}\n"
        f"EMA: {data.get('ema')}\n"
        f"Volume: {data.get('volume')}\n\n"

        f"Trend: {data.get('trend')}\n"
        f"Momentum: {data.get('momentum')}\n"
    )


# ---------------------------------------------------------
# Comparison
# ---------------------------------------------------------

def comparison(stock1: Dict, stock2: Dict) -> str:

    return (
        "⚖ *Stock Comparison*\n"
        f"{_divider()}\n\n"

        f"{stock1['symbol']}\n"
        f"Signal: {stock1['signal']}\n"
        f"Confidence: {stock1['confidence']}%\n\n"

        f"{stock2['symbol']}\n"
        f"Signal: {stock2['signal']}\n"
        f"Confidence: {stock2['confidence']}%\n"
    )


# ---------------------------------------------------------
# Processing
# ---------------------------------------------------------

def processing(symbol: str) -> str:

    return (
        "🤖 TradeMind AI\n\n"
        f"Analyzing *{symbol}*...\n\n"
        "✔ Market Data\n"
        "✔ Random Forest\n"
        "✔ LSTM\n"
        "✔ FinBERT\n"
        "✔ Firecrawl News\n"
        "✔ AI Summary\n\n"
        "Please wait..."
    )


# ---------------------------------------------------------
# Error
# ---------------------------------------------------------

def internal_error() -> str:

    return (
        "⚠ TradeMind AI\n\n"
        "Something went wrong while processing your request.\n\n"
        "Please try again in a few moments."
    )


# ---------------------------------------------------------
# Footer
# ---------------------------------------------------------

def footer() -> str:

    return (
        "\n\n"
        f"{_divider()}\n"
        "TradeMind AI • Powered by Ensemble AI\n"
        f"{datetime.now().strftime('%d %b %Y %H:%M')}"
    )