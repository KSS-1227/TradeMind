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

from data.fetch_prices import SCREENER_UNIVERSE
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
            analysis = service.analyze(normalized)
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
                "status": "analyzed",
            })
        except (ValueError, RuntimeError, OSError):
            logger.exception("v2.portfolio.holding_failed", extra={"request_id": _request_id(request), "symbol": symbol})
            holdings.append({"symbol": symbol, "status": "failed", "error": {"code": "ANALYSIS_UNAVAILABLE", "message": "Could not analyze this holding."}})

    successful = sum(item["status"] == "analyzed" for item in holdings)
    return success(
        request,
        {"holdings": holdings, "count": len(holdings), "successful": successful, "failed": len(holdings) - successful},
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
