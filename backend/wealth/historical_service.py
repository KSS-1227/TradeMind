"""Historical-analysis orchestration for TradeMind.

This module coordinates the existing research, prediction, sentiment, and
fusion APIs. It intentionally contains no feature engineering, model loading,
calibration, prediction math, recommendation logic, or risk calculations.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable, Mapping
from dataclasses import asdict, is_dataclass
from typing import Any, Protocol

from pydantic import BaseModel, Field

from backend.portfolio_ai import generate_portfolio_report
from backend.portfolio_ai.models import PortfolioAIReport
from backend.wealth.fusion_engine import FusionEngine, FusionResult

logger = logging.getLogger(__name__)


class ResearchProvider(Protocol):
    """Existing research pipeline: fetches data and builds features."""

    def __call__(self, symbol: str) -> Mapping[str, Any]: ...


class PredictionProvider(Protocol):
    """Adapter for an existing model prediction entry point."""

    def __call__(self, symbol: str, research_data: Mapping[str, Any]) -> Mapping[str, Any]: ...


class SentimentProvider(Protocol):
    """Adapter for the existing FinBERT sentiment entry point."""

    def __call__(self, symbol: str, research_data: Mapping[str, Any]) -> Mapping[str, Any]: ...


class HistoricalAnalysis(BaseModel):
    """Public historical-analysis response; raw model objects stay internal."""

    symbol: str
    current_price: float
    predicted_price: float | None = None
    expected_return: float | None = None
    trend: str = "UNKNOWN"
    confidence: float
    recommendation: str
    overall_score: float
    overall_risk: str
    sentiment: str = "neutral"
    sentiment_score: float = 0.0
    screener_score: float = 0.0
    technical_score: float = 0.0
    agreement: str = "unknown"
    model_agreement: bool = False
    risk: dict[str, Any] = Field(default_factory=dict)
    technical_indicators: dict[str, Any] = Field(default_factory=dict)
    shap: dict[str, Any] = Field(default_factory=lambda: {"features": []})
    history: list[dict[str, Any]] = Field(default_factory=list)
    sentiment_details: dict[str, Any] = Field(default_factory=dict)
    explainability: dict[str, Any] = Field(default_factory=dict)
    reasoning: list[str] = Field(default_factory=list)
    ai_report: PortfolioAIReport | None = None


class HistoricalServiceError(RuntimeError):
    """Base error for historical-analysis integration failures."""


class InvalidSymbolError(HistoricalServiceError, ValueError):
    """Raised when a symbol cannot be accepted by the market-data pipeline."""


class PredictionPipelineError(HistoricalServiceError):
    """Raised when a required prediction provider cannot produce a result."""


class HistoricalService:
    """Coordinate the TradeMind pipeline: Research → RF → LSTM → FinBERT → Fusion.

    XGBoost is not part of this stack. The pipeline combines:
      - Random Forest  (primary signal)
      - LSTM           (sequential price-trend prediction)
      - FinBERT        (news sentiment)
    """

    def __init__(
        self,
        research_provider: ResearchProvider | None = None,
        rf_provider: PredictionProvider | None = None,
        lstm_provider: PredictionProvider | None = None,
        sentiment_provider: SentimentProvider | None = None,
        fusion_engine: FusionEngine | None = None,
    ) -> None:
        self._research  = research_provider  or self._default_research_provider()
        self._rf        = rf_provider        or self._default_rf_provider()
        self._lstm      = lstm_provider      or self._default_lstm_provider()
        self._sentiment = sentiment_provider or self._default_sentiment_provider()
        self._fusion    = fusion_engine      or FusionEngine()

    def analyze(self, symbol: str) -> HistoricalAnalysis:
        """Run research, predictions, fusion, and response mapping for a symbol."""
        normalized_symbol = self._validate_symbol(symbol)
        started_at = time.perf_counter()
        try:
            research_data = self._fetch_market_data(normalized_symbol)
            predictions = self._run_predictions(normalized_symbol, research_data)
            sentiment = self._run_provider(
                "finbert", self._sentiment, normalized_symbol, research_data
            )
            current_price = self._current_price(research_data)
            predicted_price = self._optional_float(
                predictions["lstm"].get("predicted_price")
            )
            fusion = self._run_fusion(
                predictions, sentiment,
                current_price=current_price,
                predicted_price=predicted_price,
            )
            analysis = self._build_analysis(
                normalized_symbol, research_data, predictions, sentiment, fusion
            )
        except HistoricalServiceError:
            raise
        except Exception as exc:
            logger.exception(
                "historical_analysis_failed", extra={"ticker": normalized_symbol}
            )
            raise HistoricalServiceError(
                f"Historical analysis failed for {normalized_symbol}: {exc}"
            ) from exc

        logger.info(
            "historical_analysis_completed",
            extra={
                "ticker": normalized_symbol,
                "prediction_duration_ms": round(
                    (time.perf_counter() - started_at) * 1000, 2
                ),
                "models_executed": list(predictions) + ["finbert"],
                "fusion_completed": True,
            },
        )
        return analysis

    def _fetch_market_data(self, symbol: str) -> Mapping[str, Any]:
        try:
            data = self._research(symbol)
        except Exception as exc:
            logger.exception("market_data_fetch_failed", extra={"ticker": symbol})
            raise HistoricalServiceError(
                f"Market data pipeline failed for {symbol}: {exc}"
            ) from exc
        if not data or data.get("error"):
            detail = data.get("error", "empty research result") if data else "empty research result"
            raise HistoricalServiceError(f"No market data available for {symbol}: {detail}")
        if self._current_price(data) <= 0:
            raise HistoricalServiceError(f"Market data has no valid closing price for {symbol}")
        return data

    def _run_predictions(
        self, symbol: str, research_data: Mapping[str, Any]
    ) -> dict[str, Mapping[str, Any]]:
        """Run RF and LSTM providers. LSTM model-not-trained errors surface as
        a structured dict so the endpoint can return a clear message instead of
        crashing the whole request."""
        from ml.lstm_model import LSTMModelNotTrainedError

        rf_result = self._run_provider("random_forest", self._rf, symbol, research_data)

        try:
            lstm_result = self._run_provider("lstm", self._lstm, symbol, research_data)
        except PredictionPipelineError as exc:
            if isinstance(exc.__cause__, LSTMModelNotTrainedError):
                # Graceful fallback: mark LSTM unavailable, keep RF result
                logger.warning(
                    "lstm_model_not_trained",
                    extra={"ticker": symbol, "reason": str(exc.__cause__)},
                )
                lstm_result = {
                    "available": False,
                    "error": str(exc.__cause__),
                    "signal": None,
                    "confidence": 0.0,
                    "predicted_price": None,
                    "expected_return": None,
                }
            else:
                raise

        return {
            "random_forest": rf_result,
            "lstm":          lstm_result,
        }

    def _run_provider(
        self,
        name: str,
        provider: Callable[[str, Mapping[str, Any]], Any] | None,
        symbol: str,
        research_data: Mapping[str, Any],
    ) -> Mapping[str, Any]:
        if provider is None:
            raise PredictionPipelineError(f"No provider configured for {name}")
        try:
            result = provider(symbol, research_data)
        except Exception as exc:
            logger.exception(
                "prediction_provider_failed",
                extra={"ticker": symbol, "model": name},
            )
            raise PredictionPipelineError(
                f"{name} prediction failed for {symbol}: {exc}"
            ) from exc
        normalized = self._as_mapping(result, name)
        if normalized.get("error"):
            raise PredictionPipelineError(
                f"{name} prediction failed for {symbol}: {normalized['error']}"
            )
        return normalized

    def _run_fusion(
        self,
        predictions: Mapping[str, Mapping[str, Any]],
        sentiment: Mapping[str, Any],
        current_price: float | None = None,
        predicted_price: float | None = None,
    ) -> FusionResult:
        try:
            result = self._fusion.combine(
                random_forest=predictions["random_forest"],
                lstm=predictions["lstm"],
                finbert=sentiment,
                current_price=current_price,
                predicted_price=predicted_price,
            )
        except Exception as exc:
            logger.exception("fusion_failed")
            raise HistoricalServiceError(f"Prediction fusion failed: {exc}") from exc
        logger.info("fusion_completed", extra={"fusion_completed": True})
        return result

    def _build_analysis(
        self,
        symbol: str,
        research_data: Mapping[str, Any],
        predictions: Mapping[str, Mapping[str, Any]],
        sentiment: Mapping[str, Any],
        fusion: FusionResult,
    ) -> HistoricalAnalysis:
        lstm = predictions["lstm"]
        rf = predictions["random_forest"]
        predicted_price = self._optional_float(lstm.get("predicted_price"))
        expected_return = self._optional_float(lstm.get("expected_return"))
        analysis = HistoricalAnalysis(
            symbol=symbol,
            current_price=round(self._current_price(research_data), 2),
            predicted_price=(None if predicted_price is None else round(predicted_price, 2)),
            expected_return=expected_return,
            trend=self._trend(predictions),
            confidence=float(fusion.confidence),
            recommendation=fusion.recommendation,
            overall_score=float(fusion.ai_score),
            overall_risk=fusion.risk,
            sentiment=str(sentiment.get("dominant", sentiment.get("label", "neutral"))),
            sentiment_score=float(sentiment.get("confidence", 0.0) or 0.0),
            screener_score=float(rf.get("confidence", 0.0) or 0.0),
            technical_score=float(rf.get("technical_score", 0.0) or 0.0),
            agreement=fusion.agreement,
            model_agreement=fusion.model_agreement,
            risk=self._risk_metrics(research_data),
            technical_indicators=self._technical_indicators(research_data),
            history=self._history(research_data),
            sentiment_details=dict(sentiment),
            shap=self._shap_features(symbol, fusion.recommendation),
            explainability=dict(fusion.explainability),
            reasoning=list(fusion.reasoning),
        )

        try:
            analysis.ai_report = generate_portfolio_report(
                analysis=self._analysis_payload(analysis)
            )
        except Exception as exc:
            logger.warning(
                "portfolio_ai_report_failed",
                extra={"ticker": symbol, "error": str(exc)},
            )
            analysis.ai_report = PortfolioAIReport(
                summary="Portfolio analysis completed using deterministic AI models.",
                strengths=[
                    f"Detected market trend: {analysis.trend}.",
                    f"Overall sentiment: {analysis.sentiment}.",
                ],
                risks=[
                    "AI explanation service unavailable.",
                    "Only deterministic analysis is shown.",
                ],
                recommendations=[analysis.recommendation],
                outlook="Future outlook follows the deterministic prediction generated by TradeMind.",
                confidence_note=f"Model confidence is {analysis.confidence}%.",
            )

        return analysis

    @staticmethod
    def _risk_metrics(research_data: Mapping[str, Any]) -> dict[str, Any]:
        """Expose the backend's canonical risk values for the full response."""
        frame = research_data.get("df")
        if frame is None or frame.empty or "Close" not in frame:
            return {}
        close = frame["Close"].astype(float)
        returns = close.pct_change().dropna()
        if returns.empty:
            return {}
        deviation = returns.std()
        sharpe = float(returns.mean() / deviation * (252 ** 0.5)) if deviation else 0.0
        drawdown = (close - close.cummax()) / close.cummax()
        import numpy as np
        return {
            "sharpe": round(sharpe, 3),
            "drawdown": f"{round(float(drawdown.min()) * 100, 2)}%",
            "var": f"{round(float(np.percentile(returns, 5)) * 100, 2)}%",
        }

    @staticmethod
    def _technical_indicators(research_data: Mapping[str, Any]) -> dict[str, Any]:
        latest = research_data.get("latest", {})
        fields = {"rsi": "RSI", "macd": "MACD", "ema_20": "EMA_20", "ema_50": "EMA_50", "volume": "Volume"}
        return {name: latest[source] for name, source in fields.items() if latest.get(source) is not None}

    @staticmethod
    def _history(research_data: Mapping[str, Any]) -> list[dict[str, Any]]:
        frame = research_data.get("df")
        if frame is None or frame.empty or "Close" not in frame:
            return []
        return [
            {"Date": str(index)[:10], "Close": round(float(row["Close"]), 2)}
            for index, row in frame.tail(90).iterrows()
        ]

    @staticmethod
    def _shap_features(symbol: str, recommendation: str) -> dict[str, Any]:
        """Return the explainer's SHAP features in the full-response contract."""
        try:
            from ml.explain import explain_signal

            explanation = explain_signal(symbol, recommendation)
            return {
                "features": [
                    {"name": name, "value": value}
                    for name, value in explanation.get("top_features", [])
                ],
            }
        except Exception:
            logger.exception("full_analysis_shap_unavailable", extra={"ticker": symbol})
            return {"features": []}

    @staticmethod
    def _default_research_provider() -> ResearchProvider:
        from agents.research_agent import research

        return research

    @staticmethod
    def _default_rf_provider() -> PredictionProvider:
        from ml.rf_model import predict_signal

        def predict(symbol: str, _: Mapping[str, Any]) -> Mapping[str, Any]:
            return predict_signal(symbol)

        return predict

    @staticmethod
    def _default_lstm_provider() -> PredictionProvider:
        from ml.lstm_model import predict_signal as lstm_predict_signal

        def predict(symbol: str, research_data: Mapping[str, Any]) -> Mapping[str, Any]:
            return lstm_predict_signal(symbol, research_data)

        return predict

    @staticmethod
    def _default_sentiment_provider() -> SentimentProvider:
        from data.news_enrichment import enrich_articles_for_stock
        from ml.sentiment import analyze_sentiment

        def analyze(_: str, research_data: Mapping[str, Any]) -> Mapping[str, Any]:
            articles = enrich_articles_for_stock(list(research_data.get("headlines", [])))
            return analyze_sentiment(articles)

        return analyze

    @staticmethod
    def _validate_symbol(symbol: str) -> str:
        if not isinstance(symbol, str) or not symbol.strip():
            raise InvalidSymbolError("symbol must be a non-empty string")
        normalized = symbol.strip().upper()
        if any(character in normalized for character in " /\\\t\n"):
            raise InvalidSymbolError(f"invalid ticker: {symbol!r}")
        if not normalized.endswith(".NS") and normalized not in {"GC=F", "SI=F"}:
            normalized += ".NS"
        return normalized

    @staticmethod
    def _analysis_payload(analysis: HistoricalAnalysis) -> dict[str, Any]:
        payload = analysis.model_dump()
        payload["ai_report"] = None
        return payload

    @staticmethod
    def _as_mapping(result: Any, provider_name: str) -> Mapping[str, Any]:
        if isinstance(result, Mapping):
            return dict(result)
        if is_dataclass(result):
            return asdict(result)
        if hasattr(result, "model_dump"):
            return result.model_dump()
        if hasattr(result, "dict"):
            return result.dict()
        raise PredictionPipelineError(
            f"{provider_name} returned unsupported result type {type(result).__name__}"
        )

    @staticmethod
    def _current_price(research_data: Mapping[str, Any]) -> float:
        frame = research_data.get("df")
        if frame is not None and not frame.empty and "Close" in frame:
            return float(frame["Close"].iloc[-1])
        latest = research_data.get("latest", {})
        return float(latest.get("Close", 0.0))

    @staticmethod
    def _optional_float(value: Any) -> float | None:
        try:
            return None if value is None else float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _trend(predictions: Mapping[str, Mapping[str, Any]]) -> str:
        for name in ("lstm", "random_forest"):
            result = predictions[name]
            label = result.get("signal") or result.get("label") or result.get("prediction")
            if label:
                return str(label).upper()
        return "UNKNOWN"

