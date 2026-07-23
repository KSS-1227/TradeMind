"""Historical-analysis orchestration for TradeMind.

This module coordinates the existing research, prediction, sentiment, and
fusion APIs. It intentionally contains no feature engineering, model loading,
calibration, prediction math, recommendation logic, or risk calculations.
"""

from __future__ import annotations

import logging
import time
from dataclasses import asdict, is_dataclass
from typing import Any, Callable, Mapping, Protocol

from pydantic import BaseModel, Field

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
    explainability: dict[str, Any] = Field(default_factory=dict)
    reasoning: list[str] = Field(default_factory=list)


class HistoricalServiceError(RuntimeError):
    """Base error for historical-analysis integration failures."""


class InvalidSymbolError(HistoricalServiceError, ValueError):
    """Raised when a symbol cannot be accepted by the market-data pipeline."""


class PredictionPipelineError(HistoricalServiceError):
    """Raised when a required prediction provider cannot produce a result."""


class HistoricalService:
    """Coordinate the current TradeMind pipeline through injected adapters.

    ``research`` is the repository's existing entry point that fetches market
    data, calls ``technical.py``, and calls ``market_relative.py``. RF defaults
    to the existing ``ml.rf_model.predict_signal`` API. XGBoost and LSTM have
    no public prediction functions in this checkout, so their deployed
    adapters must be injected by the caller rather than reimplemented here.
    """

    def __init__(
        self,
        research_provider: ResearchProvider | None = None,
        rf_provider: PredictionProvider | None = None,
        xgb_provider: PredictionProvider | None = None,
        lstm_provider: PredictionProvider | None = None,
        sentiment_provider: SentimentProvider | None = None,
        fusion_engine: FusionEngine | None = None,
    ) -> None:
        self._research = research_provider or self._default_research_provider()
        self._rf = rf_provider or self._default_rf_provider()
        self._xgb = xgb_provider
        self._lstm = lstm_provider
        self._sentiment = sentiment_provider or self._default_sentiment_provider()
        self._fusion = fusion_engine or FusionEngine()

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
            fusion = self._run_fusion(predictions, sentiment)
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
        providers = {
            "random_forest": self._rf,
            "xgboost": self._xgb,
            "lstm": self._lstm,
        }
        missing = [name for name, provider in providers.items() if provider is None]
        if missing:
            raise PredictionPipelineError(
                "Missing prediction provider(s): " + ", ".join(missing)
            )
        return {
            name: self._run_provider(name, provider, symbol, research_data)
            for name, provider in providers.items()
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
    ) -> FusionResult:
        try:
            result = self._fusion.combine(
                random_forest=predictions["random_forest"],
                xgboost=predictions["xgboost"],
                lstm=predictions["lstm"],
                finbert=sentiment,
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
        return HistoricalAnalysis(
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
            explainability=dict(fusion.explainability),
            reasoning=list(fusion.reasoning),
        )

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
        for name in ("lstm", "xgboost", "random_forest"):
            result = predictions[name]
            label = result.get("signal") or result.get("label") or result.get("prediction")
            if label:
                return str(label).upper()
        return "UNKNOWN"

