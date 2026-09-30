"""Versioned, envelope-based API routes.

These routes deliberately coexist with the legacy API during the frontend
migration.  They share business services but never change legacy responses.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from agents.pipeline import run_pipeline
from backend.portfolio_ai import generate_portfolio_report
from backend.screener_explainer import explain_screener_prediction
from data.fetch_prices import (
    SCREENER_UNIVERSE,
    fetch_gold_price_inr,
    fetch_live_commodity_prices_inr,
    fetch_prices,
    fetch_prices_batch,
)
from ml.backtest import run_backtest
from ml.screener import screen_stocks
from ml.strategy_builder import backtest_custom_rule
from ml.wealth_calculator import project_wealth
from notifications.subscriptions import add_subscription
from notifications.whatsapp import send_whatsapp_message
from scam_detector.detector import analyze_message
from scam_detector.models import ScamRequest
from wealth.historical_service import HistoricalService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v2", tags=["v2"])
PROJECT_ROOT = Path(__file__).resolve().parent.parent


class ScreenerAnalyzeRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)


class StrategyBuildRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    symbol: str = Field(min_length=1, max_length=32)


class WealthProjectRequest(BaseModel):
    monthly_investment: float = Field(gt=0)
    years: int = Field(ge=1, le=60)
    expected_annual_return: float = Field(default=0.12, gt=0, lt=1)
    market_crash_year: int | None = Field(default=None, ge=1, le=60)
    market_crash_pct: float = Field(default=0.20, gt=0, lt=1)


class HoldingRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=32)
    quantity: float = Field(gt=0)
    buy_price: float = Field(gt=0)


class PortfolioAnalyzeRequest(BaseModel):
    holdings: list[HoldingRequest] = Field(min_length=1, max_length=50)


class AlertSubscribeRequest(BaseModel):
    phone: str = Field(min_length=8, max_length=32)
    symbol: str = Field(min_length=1, max_length=32)


class ApiSuccessEnvelope(BaseModel):
    """Documented response contract shared by all successful v2 calls."""

    success: bool
    message: str
    data: Any
    timestamp: str
    request_id: str


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unavailable")


def success(request: Request, data: Any, message: str) -> dict[str, Any]:
    """Build the one success contract shared by all v2 endpoints."""

    return {
        "success": True,
        "message": message,
        "data": jsonable_encoder(data),
        "timestamp": _timestamp(),
        "request_id": _request_id(request),
    }


def error(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
) -> JSONResponse:
    """Build a safe, predictable v2 error without exposing tracebacks."""

    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "data": None,
            "error": {"code": code, "message": message},
            "timestamp": _timestamp(),
            "request_id": _request_id(request),
        },
    )


@router.get("/health", response_model=ApiSuccessEnvelope)
def health(request: Request):
    return success(
        request,
        {"status": "ok", "model_available": (PROJECT_ROOT / "ml" / "rf_model.pkl").exists()},
        "Service is healthy.",
    )


@router.get("/signal/full/{symbol}", response_model=ApiSuccessEnvelope)
def signal_full(request: Request, symbol: str, explain_screener: bool = False):
    """Complete HistoricalService analysis — single source of truth for
    AI Screener, Portfolio Doctor, Full Analysis, and WhatsApp."""
    sym = symbol.upper()
    if not sym.endswith(".NS") and sym not in {"GC=F", "SI=F"}:
        sym = sym + ".NS"
    try:
        service = HistoricalService()
        analysis = service.analyze(sym, include_explanation=not explain_screener)
        data = analysis.model_dump()
        # The full-analysis response is the UI contract. Keep nested values
        # intact so clients do not need legacy aliases or local calculations.
        data["sentiment"] = data.pop("sentiment_details", {})
        if explain_screener:
            data["screener_explanation"] = explain_screener_prediction(data)
        return success(request, data, "Full analysis completed successfully.")
    except ValueError as exc:
        return error(request, status_code=404, code="SYMBOL_NOT_FOUND", message=str(exc))
    except (RuntimeError, OSError):
        logger.exception("v2.signal_full.failed", extra={"request_id": _request_id(request)})
        return error(request, status_code=503, code="ANALYSIS_UNAVAILABLE", message="Analysis temporarily unavailable.")


@router.get("/signal/{symbol}", response_model=ApiSuccessEnvelope)
def signal(request: Request, symbol: str):
    sym = symbol.upper()
    if not sym.endswith(".NS") and sym not in {"GC=F", "SI=F"}:
        sym = sym + ".NS"
    try:
        result = run_pipeline(sym)
        if "error" in result:
            return error(request, status_code=404, code="SYMBOL_NOT_FOUND", message=result["error"])
        result["symbol"] = symbol.upper().replace(".NS", "")
        return success(request, result, "Signal generated successfully.")
    except (ValueError, RuntimeError) as exc:
        return error(request, status_code=503, code="SIGNAL_UNAVAILABLE", message=str(exc))


@router.get("/prices/{symbol}", response_model=ApiSuccessEnvelope)
def prices(request: Request, symbol: str):
    import pandas as pd
    sym = symbol.upper()
    if not sym.endswith(".NS") and sym not in {"GC=F", "SI=F"}:
        sym = sym + ".NS"
    df = fetch_prices(sym, period="3mo")
    if df.empty:
        return error(request, status_code=404, code="NO_DATA", message="No price data available.")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    if "Date" not in df.columns:
        df = df.reset_index()
    rows = [{"Date": str(row["Date"])[:10], "Close": round(float(row["Close"]), 2)}
            for _, row in df.iterrows() if "Close" in row and "Date" in row]
    return success(request, {"data": rows}, "Prices fetched successfully.")


@router.get("/market/quotes", response_model=ApiSuccessEnvelope)
def market_quotes(request: Request, symbols: str | None = None):
    tickers = {
        "NIFTY 50": "^NSEI",
        "SENSEX": "^BSESN",
        "BANK NIFTY": "^NSEBANK",
        "BITCOIN (BTC)": "BTC-USD",
        "RELIANCE": "RELIANCE.NS",
        "TCS": "TCS.NS",
        "INFY": "INFY.NS",
        "HDFCBANK": "HDFCBANK.NS",
        "ICICIBANK": "ICICIBANK.NS",
        "TATAMOTORS": "TMPV.NS",
        "WIPRO": "WIPRO.NS",
        "SBIN": "SBIN.NS",
    }
    for raw_symbol in (symbols or "").split(",")[:10]:
        symbol = raw_symbol.strip().upper()
        if symbol.endswith(".NS"):
            symbol = symbol[:-3]
        if not symbol.isascii() or not symbol.isalnum() or len(symbol) > 20:
            continue
        tickers[symbol] = "TMPV.NS" if symbol == "TATAMOTORS" else f"{symbol}.NS"

    frames = fetch_prices_batch(list(dict.fromkeys(tickers.values())), period="3mo")
    quotes: dict[str, dict[str, Any]] = {}

    for name, ticker in tickers.items():
        frame = frames.get(ticker)
        if frame is None or frame.empty or "Close" not in frame:
            continue

        closes = frame["Close"].dropna().tail(5)
        if closes.empty:
            continue

        current = float(closes.iloc[-1])
        previous = float(closes.iloc[-2]) if len(closes) > 1 else None
        change_percent = ((current / previous) - 1) * 100 if previous else None
        date_column = "Date" if "Date" in frame else frame.columns[0]
        history_frame = frame.dropna(subset=["Close"]).tail(60)
        quotes[name] = {
            "price": round(current, 2),
            "change_percent": round(change_percent, 2) if change_percent is not None else None,
            "history": [
                {"date": str(row[date_column])[:10], "price": round(float(row["Close"]), 2)}
                for _, row in history_frame.iterrows()
            ],
            "as_of": str(frame[date_column].iloc[-1]),
            "source": "Yahoo Finance",
        }

    return success(
        request,
        {"quotes": quotes, "fetched_at": datetime.now(timezone.utc).isoformat()},
        "Market quotes fetched successfully.",
    )


@router.get("/backtest/{symbol}", response_model=ApiSuccessEnvelope)
def backtest(request: Request, symbol: str):
    sym = symbol.upper()
    if not sym.endswith(".NS"):
        sym = sym + ".NS"
    try:
        result = run_backtest(sym, period="5y")
        if "error" in result:
            return error(request, status_code=404, code="BACKTEST_FAILED", message=result["error"])
        return success(request, result, "Backtest completed successfully.")
    except (ValueError, RuntimeError) as exc:
        return error(request, status_code=503, code="BACKTEST_UNAVAILABLE", message=str(exc))


@router.post("/screener", response_model=ApiSuccessEnvelope)
def screener(request: Request, payload: ScreenerAnalyzeRequest):
    """Alias matching the frontend's /v2/screener endpoint."""
    return screener_analyze(request, payload)


@router.get("/gold", response_model=ApiSuccessEnvelope)
def gold(request: Request):
    result = fetch_gold_price_inr()
    if "error" in result:
        return error(request, status_code=503, code="GOLD_UNAVAILABLE", message=result["error"])
    return success(request, result, "Gold price fetched successfully.")


@router.get("/commodities", response_model=ApiSuccessEnvelope)
def commodities(request: Request):
    try:
        result = fetch_live_commodity_prices_inr()
        return success(request, result, "Commodity prices fetched successfully.")
    except RuntimeError:
        logger.exception("v2.commodities.failed", extra={"request_id": _request_id(request)})
        return error(
            request,
            status_code=503,
            code="COMMODITIES_UNAVAILABLE",
            message="Live commodity prices are temporarily unavailable.",
        )


@router.post("/screener/analyze", response_model=ApiSuccessEnvelope)
def screener_analyze(request: Request, payload: ScreenerAnalyzeRequest):
    try:
        result = screen_stocks(payload.query.strip(), universe=SCREENER_UNIVERSE)
        return success(request, result, "Screener analysis completed successfully.")
    except ValueError as exc:
        return error(request, status_code=400, code="INVALID_QUERY", message=str(exc))
    except RuntimeError:
        logger.exception("v2.screener.failed", extra={"request_id": _request_id(request)})
        return error(request, status_code=503, code="SCREENER_UNAVAILABLE", message="Screener data is temporarily unavailable.")


@router.post("/strategy/build", response_model=ApiSuccessEnvelope)
def strategy_build(request: Request, payload: StrategyBuildRequest):
    try:
        result = backtest_custom_rule(payload.query.strip(), payload.symbol.strip())
        if "error" in result:
            return error(request, status_code=404, code="INVALID_SYMBOL", message=result["error"])
        return success(request, result, "Strategy built successfully.")
    except ValueError as exc:
        return error(request, status_code=400, code="INVALID_STRATEGY", message=str(exc))
    except RuntimeError:
        logger.exception("v2.strategy.failed", extra={"request_id": _request_id(request)})
        return error(request, status_code=503, code="MARKET_DATA_UNAVAILABLE", message="Market data is temporarily unavailable.")


@router.post("/wealth/project", response_model=ApiSuccessEnvelope)
def wealth_project(request: Request, payload: WealthProjectRequest):
    try:
        result = project_wealth(**payload.model_dump())
        return success(request, result, "Wealth projection calculated successfully.")
    except ValueError as exc:
        return error(request, status_code=400, code="INVALID_PROJECTION", message=str(exc))


@router.post("/portfolio/analyze", response_model=ApiSuccessEnvelope)
def portfolio_analyze(request: Request, payload: PortfolioAnalyzeRequest):
    service = HistoricalService()
    holdings: list[dict[str, Any]] = []

    for holding in payload.holdings:
        symbol = holding.symbol.strip().upper()
        normalized = symbol if symbol.endswith(".NS") or symbol in {"GC=F", "SI=F"} else f"{symbol}.NS"
        try:
            analysis = service.analyze(normalized, include_explanation=False)
            invested = holding.quantity * holding.buy_price
            market_value = holding.quantity * analysis.current_price
            holdings.append({
                "symbol": symbol,
                "quantity": holding.quantity,
                "buy_price": holding.buy_price,
                "current_price": analysis.current_price,
                "invested_amount": round(invested, 2),
                "market_value": round(market_value, 2),
                "pnl": round(market_value - invested, 2),
                "pnl_percent": round(((market_value - invested) / invested) * 100, 2),
                "recommendation": analysis.recommendation,
                "confidence": analysis.confidence,
                "overall_risk": analysis.overall_risk,
                "overall_score": analysis.overall_score,
                "trend": analysis.trend,
                "sentiment": analysis.sentiment,
                "sentiment_score": analysis.sentiment_score,
                "predicted_price": analysis.predicted_price,
                "expected_return": analysis.expected_return,
                "agreement": analysis.agreement,
                "model_agreement": analysis.model_agreement,
                "reasoning": analysis.reasoning[:3],
                "ai_report": analysis.ai_report.model_dump() if analysis.ai_report else None,
                "status": "analyzed",
            })
        except (ValueError, RuntimeError, OSError):
            logger.exception("v2.portfolio.holding_failed", extra={"request_id": _request_id(request), "symbol": symbol})
            holdings.append({"symbol": symbol, "status": "failed", "error": {"code": "ANALYSIS_UNAVAILABLE", "message": "Could not analyze this holding."}})

    successful_holdings = [item for item in holdings if item["status"] == "analyzed"]
    successful = len(successful_holdings)
    ai_report = None

    if successful_holdings:
        total_invested = sum(item["invested_amount"] for item in successful_holdings)
        total_market_value = sum(item["market_value"] for item in successful_holdings)
        risk_distribution = {
            risk: sum(item["overall_risk"].upper() == risk for item in successful_holdings)
            for risk in ("HIGH", "MEDIUM", "LOW")
        }
        trends = [item["trend"] for item in successful_holdings]
        sentiments = [item["sentiment"] for item in successful_holdings]
        expected_returns = [
            item["expected_return"]
            for item in successful_holdings
            if item["expected_return"] is not None
        ]
        confidence = sum(item["confidence"] for item in successful_holdings) / successful
        overall_risk = next(
            risk for risk in ("HIGH", "MEDIUM", "LOW") if risk_distribution[risk]
        )
        portfolio_analysis = {
            "symbol": "PORTFOLIO",
            "portfolio_summary": {
                "positions": successful,
                "invested_amount": round(total_invested, 2),
                "market_value": round(total_market_value, 2),
                "pnl": round(total_market_value - total_invested, 2),
                "pnl_percent": round(
                    ((total_market_value - total_invested) / total_invested) * 100, 2
                ) if total_invested else 0,
                "risk_distribution": risk_distribution,
            },
            "holdings": [
                {
                    key: item[key]
                    for key in (
                        "symbol", "quantity", "current_price", "pnl", "pnl_percent",
                        "recommendation", "confidence", "overall_risk", "trend",
                        "sentiment", "agreement", "model_agreement", "reasoning",
                    )
                }
                for item in successful_holdings
            ],
            "trend": trends[0] if len(set(trends)) == 1 else "MIXED",
            "sentiment": sentiments[0] if len(set(sentiments)) == 1 else "mixed",
            "recommendation": "; ".join(
                f"{item['symbol']}: {item['recommendation']}" for item in successful_holdings
            ),
            "confidence": round(confidence, 2),
            "overall_score": round(
                sum(item["overall_score"] for item in successful_holdings) / successful, 2
            ),
            "overall_risk": overall_risk,
            "expected_return": (
                sum(expected_returns) / len(expected_returns) if expected_returns else None
            ),
            "agreement": "mixed" if len({item["agreement"] for item in successful_holdings}) > 1
            else successful_holdings[0]["agreement"],
            "model_agreement": all(item["model_agreement"] for item in successful_holdings),
        }
        try:
            ai_report = generate_portfolio_report(analysis=portfolio_analysis)
        except Exception:
            logger.exception("v2.portfolio.explanation_failed", extra={"request_id": _request_id(request)})

    return success(
        request,
        {
            "holdings": holdings,
            "count": len(holdings),
            "successful": successful,
            "failed": len(holdings) - successful,
            "ai_report": ai_report.model_dump() if ai_report else None,
        },
        "Portfolio analyzed successfully." if successful == len(holdings) else "Portfolio analysis completed with some unavailable holdings.",
    )


@router.post("/scam/analyze", response_model=ApiSuccessEnvelope)
def scam_analyze(request: Request, payload: ScamRequest):
    try:
        result = analyze_message(payload.message)
        return success(request, result, "Scam analysis completed successfully.")
    except (ValueError, RuntimeError, OSError):
        logger.exception("v2.scam.failed", extra={"request_id": _request_id(request)})
        return error(request, status_code=503, code="SCAM_ANALYSIS_UNAVAILABLE", message="Scam analysis is temporarily unavailable.")


@router.post("/alerts/subscribe", response_model=ApiSuccessEnvelope)
def alerts_subscribe(request: Request, payload: AlertSubscribeRequest):
    try:
        result = add_subscription(payload.phone.strip(), payload.symbol.strip())
    except OSError:
        logger.exception("v2.alerts.subscription_failed", extra={"request_id": _request_id(request)})
        return error(request, status_code=503, code="SUBSCRIPTION_UNAVAILABLE", message="Alert subscriptions are temporarily unavailable.")

    if result["added"]:
        confirmation = send_whatsapp_message(
            payload.phone,
            f"You're subscribed to TradeMind alerts for {payload.symbol.upper()}.",
        )
        result["confirmation_sent"] = confirmation["success"]
        if not confirmation["success"]:
            result["confirmation_error"] = confirmation["error"]

    message = "Alert subscription created successfully." if result["added"] else "Alert subscription already exists."
    return success(request, result, message)
