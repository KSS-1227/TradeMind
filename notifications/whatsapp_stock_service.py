"""
notifications/whatsapp_stock_service.py

TradeMind WhatsApp AI Stock Service

Purpose
-------
Provides conversational stock analysis for WhatsApp.

Pipeline
--------

Incoming Message
        │
        ▼
Symbol Resolution
        │
        ▼
HistoricalService
        │
        ├── Random Forest
        ├── LSTM
        ├── FinBERT
        ├── Fusion Engine
        └── Portfolio AI Report
        │
        ▼
Firecrawl News
        │
        ▼
WhatsApp Templates
        │
        ▼
Formatted WhatsApp Response

Architecture
------------
This module DOES NOT:

• Send WhatsApp messages
• Call Twilio APIs
• Parse webhooks

Those responsibilities belong to notifications.whatsapp.py.

This module only orchestrates AI analysis and builds
responses for WhatsApp.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional

from data.fetch_news import fetch_news
from notifications.whatsapp_symbols import (
    help_text,
    is_supported,
    normalize_symbol,
)
from notifications.whatsapp_templates import (
    help_message,
    internal_error,
    latest_news,
    processing,
    stock_analysis,
    unsupported_symbol,
)
from wealth.historical_service import (
    HistoricalAnalysis,
    HistoricalService,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

MAX_NEWS_ITEMS = 5

SUPPORTED_COMMANDS = {
    "HELP",
    "NEWS",
    "TECHNICAL",
    "COMPARE",
}

# ---------------------------------------------------------
# Context Object
# ---------------------------------------------------------


@dataclass(slots=True)
class WhatsAppSession:
    """
    Lightweight conversation context.

    This allows the router to remember
    the previously analyzed stock.

    Example

    User:
        Reliance

    User:
        NEWS

    NEWS automatically refers to Reliance.
    """

    last_symbol: Optional[str] = None


# ---------------------------------------------------------
# Service
# ---------------------------------------------------------


class WhatsAppStockService:
    """
    TradeMind AI WhatsApp Service.

    Public API

        analyze(symbol)

        latest_news(symbol)

        technical(symbol)

        compare(symbol1, symbol2)

        help()

    This class never communicates with Twilio.
    """

    def __init__(self) -> None:

        self.analysis_service = HistoricalService()

    # -----------------------------------------------------
    # Helpers
    # -----------------------------------------------------

    @staticmethod
    def _normalize(symbol: str) -> str:
        """
        Normalize a stock symbol.

        Raises
        ------
        ValueError
        """

        resolved = normalize_symbol(symbol)

        if not resolved:
            raise ValueError(symbol)

        return resolved

    @staticmethod
    def _headline_list(news: List[Dict]) -> List[str]:
        """
        Convert Firecrawl articles into
        headline strings.
        """

        headlines = []

        for article in news[:MAX_NEWS_ITEMS]:

            title = article.get("headline")

            if title:
                headlines.append(title)

        return headlines

    @staticmethod
    def _extract_reasoning(
        analysis: HistoricalAnalysis,
    ) -> List[str]:
        """
        Keep only the strongest AI reasons.
        """

        return analysis.reasoning[:3]

    @staticmethod
    def _analysis_dict(
        analysis: HistoricalAnalysis,
    ) -> Dict:
        """
        Convert HistoricalAnalysis into
        the template format.
        """

        return {
            "symbol": analysis.symbol.replace(".NS", ""),
            "current_price": f"₹{analysis.current_price:,.2f}",
            "predicted_price": (
                "-"
                if analysis.predicted_price is None
                else f"₹{analysis.predicted_price:,.2f}"
            ),
            "expected_return": (
                "-"
                if analysis.expected_return is None
                else f"{analysis.expected_return:.2f}%"
            ),
            "signal": analysis.recommendation.upper(),
            "confidence": round(analysis.confidence),
            "overall_risk": analysis.overall_risk,
            "trend": analysis.trend,
            "reasoning": WhatsAppStockService._extract_reasoning(analysis),
            "ai_report": (
                analysis.ai_report.model_dump()
                if analysis.ai_report
                else None
            ),
        }

    # -----------------------------------------------------
    # Public API
    # -----------------------------------------------------

    def help(self) -> str:
        """
        Return help menu.
        """

        return help_message()

    def supports(self, message: str) -> bool:
        """
        Check whether a message is a
        supported stock or command.
        """

        message = message.strip().upper()

        if message in SUPPORTED_COMMANDS:
            return True

        return is_supported(message)

    def process_message(
        self,
        sender: str,
        text: str,
        session: WhatsAppSession,
    ) -> str:
        """
        Route an incoming WhatsApp message
        to the correct handler and update
        the session's last known symbol.
        """

        command = text.strip().upper()

        if command == "HELP":
            return self.help()

        if command == "NEWS":
            if not session.last_symbol:
                return "Send a stock symbol first, then NEWS."
            return self.latest_stock_news(session.last_symbol)

        resolved = normalize_symbol(command)

        if resolved:
            session.last_symbol = resolved
            return self.analyze_stock(resolved)

        return unsupported_symbol(command)

    # -----------------------------------------------------
    # HistoricalService + Firecrawl
    # -----------------------------------------------------

    def analyze_stock(self, symbol: str) -> str:
        """
        Complete AI analysis for a stock.

        Pipeline

        Symbol
            ↓
        HistoricalService
            ↓
        Firecrawl News
            ↓
        WhatsApp Template

        Returns
        -------
        Formatted WhatsApp message.
        """

        try:

            symbol = self._normalize(symbol)

            logger.info(
                "Starting WhatsApp analysis for %s",
                symbol,
            )

            analysis = self.analysis_service.analyze(symbol)

            news = fetch_news(symbol)

            headlines = self._headline_list(news)

            payload = self._analysis_dict(analysis)

            payload["latest_news"] = headlines

            if analysis.ai_report:

                report = analysis.ai_report.model_dump()

                payload["summary"] = report.get(
                    "summary",
                    "",
                )

                payload["strengths"] = report.get(
                    "strengths",
                    [],
                )

                payload["risks"] = report.get(
                    "risks",
                    [],
                )

                payload["ai_recommendation"] = report.get(
                    "recommendation",
                    "",
                )

            else:

                payload["summary"] = ""

                payload["strengths"] = []

                payload["risks"] = []

                payload["ai_recommendation"] = ""

            logger.info(
                "Completed WhatsApp analysis for %s",
                symbol,
            )

            return stock_analysis(payload)

        except ValueError:

            logger.warning(
                "Unsupported stock requested: %s",
                symbol,
            )

            return unsupported_symbol(symbol)

        except Exception:

            logger.exception(
                "WhatsApp stock analysis failed."
            )

            return internal_error()

    # -----------------------------------------------------

    def latest_stock_news(
        self,
        symbol: str,
    ) -> str:
        """
        Fetch latest news using Firecrawl.

        Falls back automatically because
        fetch_news() already handles:

            Firecrawl
                 ↓
            Yahoo Finance
                 ↓
            Google RSS
        """

        try:

            symbol = self._normalize(symbol)

            logger.info(
                "Fetching news for %s",
                symbol,
            )

            articles = fetch_news(symbol)

            headlines = self._headline_list(articles)

            return latest_news(
                symbol.replace(".NS", ""),
                headlines,
            )

        except ValueError:

            return unsupported_symbol(symbol)

        except Exception:

            logger.exception(
                "News fetch failed."
            )

            return internal_error()

    # -----------------------------------------------------

    def loading_message(
        self,
        symbol: str,
    ) -> str:
        """
        Optional immediate acknowledgement.

        Useful if WhatsApp analysis
        becomes slow (>5 sec).
        """

        return processing(symbol)

    # -----------------------------------------------------

    def health(self) -> Dict:
        """
        Lightweight service health.

        Can be exposed through
        diagnostics if required.
        """

        return {
            "service": "WhatsAppStockService",
            "historical_service": self.analysis_service.__class__.__name__,
            "news_provider": "Firecrawl + Yahoo + RSS",
            "status": "healthy",
        }
        # -----------------------------------------------------
    # TECHNICAL
    # -----------------------------------------------------

    def technical(self, symbol: str) -> str:
        """
        Technical analysis summary.
        """

        try:

            symbol = self._normalize(symbol)

            analysis = self.analysis_service.analyze(symbol)

            lines = [
                "📊 *Technical Analysis*",
                "━━━━━━━━━━━━━━━━━━",
                "",
                f"📈 Stock: {analysis.symbol.replace('.NS','')}",
                "",
                f"Trend: {analysis.trend}",
                f"Overall Score: {analysis.overall_score}",
                f"Risk: {analysis.overall_risk}",
                f"Confidence: {round(analysis.confidence)}%",
                "",
                "Model Agreement",
                f"{analysis.model_agreement}",
                "",
                "Reasoning",
            ]

            for item in analysis.reasoning[:5]:
                lines.append(f"• {item}")

            return "\n".join(lines)

        except Exception:

            logger.exception("Technical analysis failed.")

            return internal_error()

    # -----------------------------------------------------
    # COMPARE
    # -----------------------------------------------------

    def compare(
        self,
        symbol1: str,
        symbol2: str,
    ) -> str:

        try:

            s1 = self._normalize(symbol1)
            s2 = self._normalize(symbol2)

            a1 = self.analysis_service.analyze(s1)
            a2 = self.analysis_service.analyze(s2)

            better = (
                a1.symbol
                if a1.overall_score >= a2.overall_score
                else a2.symbol
            )

            return (
                "⚖ *TradeMind Comparison*\n"
                "━━━━━━━━━━━━━━━━━━\n\n"

                f"{a1.symbol.replace('.NS','')}\n"
                f"Signal: {a1.recommendation}\n"
                f"Score: {a1.overall_score}\n"
                f"Confidence: {round(a1.confidence)}%\n\n"

                f"{a2.symbol.replace('.NS','')}\n"
                f"Signal: {a2.recommendation}\n"
                f"Score: {a2.overall_score}\n"
                f"Confidence: {round(a2.confidence)}%\n\n"

                f"🏆 Better Choice: {better.replace('.NS','')}"
            )

        except Exception:

            logger.exception("Comparison failed.")

            return internal_error()

    # -----------------------------------------------------
    # Conversation Engine
    # -----------------------------------------------------

    def process_message(
        self,
        message: str,
        session: Optional[WhatsAppSession] = None,
    ) -> str:
        """
        Main entry point for WhatsApp webhook.

        Examples

        RELIANCE

        NEWS

        TECHNICAL

        HELP

        COMPARE TCS
        """

        if session is None:
            session = WhatsAppSession()

        text = message.strip()

        upper = text.upper()

        # ---------------- HELP ----------------

        if upper == "HELP":
            return self.help()

        # ---------------- NEWS ----------------

        if upper == "NEWS":

            if not session.last_symbol:

                return (
                    "Please analyze a stock first.\n\n"
                    "Example:\n"
                    "Reliance"
                )

            return self.latest_stock_news(
                session.last_symbol
            )

        # ---------------- TECHNICAL ----------------

        if upper == "TECHNICAL":

            if not session.last_symbol:

                return (
                    "Please analyze a stock first."
                )

            return self.technical(
                session.last_symbol
            )

        # ---------------- COMPARE ----------------

        if upper.startswith("COMPARE"):

            if not session.last_symbol:

                return (
                    "Analyze one stock first.\n"
                    "Then type:\n"
                    "COMPARE TCS"
                )

            parts = text.split()

            if len(parts) != 2:

                return (
                    "Usage:\n"
                    "COMPARE TCS"
                )

            return self.compare(
                session.last_symbol,
                parts[1],
            )

        # ---------------- STOCK ----------------

        if self.supports(text):

            session.last_symbol = text

            return self.analyze_stock(text)

        return unsupported_symbol(text)

    # -----------------------------------------------------
    # Singleton
    # -----------------------------------------------------


_service: Optional[WhatsAppStockService] = None


def get_whatsapp_stock_service() -> WhatsAppStockService:
    """
    Shared singleton instance.
    """

    global _service

    if _service is None:
        _service = WhatsAppStockService()

    return _service