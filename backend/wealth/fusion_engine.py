"""AI decision fusion for TradeMind.

This module consumes existing model outputs only. It does not fetch data,
engineer features, load models, calibrate probabilities, or run inference.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import isfinite
from typing import Any, Mapping, Sequence

from pydantic import BaseModel, ConfigDict, Field

BUY = "BUY"
HOLD = "HOLD"
SELL = "SELL"
LABELS = (SELL, HOLD, BUY)


@dataclass(frozen=True, slots=True)
class FusionConfig:
    """Configurable weights and thresholds for ensemble decisions."""

    RF_WEIGHT: float = 0.30
    XGB_WEIGHT: float = 0.30
    LSTM_WEIGHT: float = 0.20
    FINBERT_WEIGHT: float = 0.20
    STRONG_BUY_THRESHOLD: float = 0.72
    BUY_THRESHOLD: float = 0.55
    SELL_THRESHOLD: float = 0.45
    STRONG_SELL_THRESHOLD: float = 0.28
    DISAGREEMENT_THRESHOLD: float = 0.45
    MODEL_AGREEMENT_THRESHOLD: float = 0.65
    STRONG_CONSENSUS_THRESHOLD: float = 0.75
    MIXED_CONSENSUS_THRESHOLD: float = 0.45
    SINGLE_MODEL_AGREEMENT: float = 0.55
    HOLD_SCORE: float = 0.50
    CONFIDENCE_CERTAINTY_WEIGHT: float = 0.55
    CONFIDENCE_AGREEMENT_WEIGHT: float = 0.45
    VOLATILITY_SCALE: float = 0.06
    EXPECTED_RETURN_SCALE: float = 0.15
    RISK_VOLATILITY_WEIGHT: float = 0.45
    RISK_DISAGREEMENT_WEIGHT: float = 0.30
    RISK_SENTIMENT_WEIGHT: float = 0.15
    RISK_RETURN_WEIGHT: float = 0.10
    MISSING_SENTIMENT_RISK: float = 0.50
    MAD_SCALE: float = 2.0
    DISPERSION_WEIGHT: float = 0.70
    DIRECTIONAL_WEIGHT: float = 0.30
    HIGH_RISK_THRESHOLD: float = 0.60
    MEDIUM_RISK_THRESHOLD: float = 0.30

    def __post_init__(self) -> None:
        weights = (self.RF_WEIGHT, self.XGB_WEIGHT,
                   self.LSTM_WEIGHT, self.FINBERT_WEIGHT)
        if any(weight < 0 for weight in weights) or sum(weights) <= 0:
            raise ValueError("Fusion weights must be non-negative and non-zero")
        if not 0 <= self.STRONG_SELL_THRESHOLD <= self.SELL_THRESHOLD <= self.BUY_THRESHOLD <= self.STRONG_BUY_THRESHOLD <= 1:
            raise ValueError("Fusion thresholds must be ordered between 0 and 1")


class FusionResult(BaseModel):
    """Stable result contract for downstream wealth and advisor services."""

    model_config = ConfigDict(frozen=True)

    ai_score: float
    confidence: float
    recommendation: str
    risk: str
    agreement: str
    model_agreement: bool
    explainability: dict[str, Any] = Field(default_factory=dict)
    reasoning: list[str] = Field(default_factory=list)
    weighted_scores: dict[str, float] = Field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class _Signal:
    name: str
    score: float
    certainty: float
    label: str | None
    available: bool
    expected_return: float | None = None


class FusionEngine:
    """Combine RF, XGBoost, LSTM, and FinBERT outputs into one decision."""

    def __init__(self, config: FusionConfig | None = None) -> None:
        self.config = config or FusionConfig()

    def combine(
        self,
        random_forest: Any,
        lstm: Any,
        finbert: Any,
        xgboost: Any = None,
        *,
        calibrated_rf: Any = None,
        calibrated_xgb: Any = None,
        volatility: float | None = None,
        expected_return: float | None = None,
        **legacy_inputs: Any,
    ) -> FusionResult:
        """Fuse one vote per model; calibrated payloads replace raw payloads."""
        random_forest = random_forest or legacy_inputs.get("rf")
        finbert = finbert or legacy_inputs.get("sentiment")
        signals = [
            self._signal("random_forest", random_forest, calibrated_rf),
            self._signal("xgboost", xgboost, calibrated_xgb),
            self._signal("lstm", lstm),
        ]
        sentiment = self._sentiment(finbert)
        available = [signal for signal in signals if signal.available]
        if not available and not sentiment.available:
            raise ValueError("Fusion requires at least one available output")
        scores = {signal.name: signal.score for signal in available}
        if sentiment.available:
            scores["finbert"] = sentiment.score
        weights = self._weights(available, sentiment)
        weighted_scores = {name: scores[name] * weights[name] for name in scores}
        ai_score = sum(weighted_scores.values()) / sum(weights.values())
        agreement_score = self._agreement(scores, weights)
        expected = expected_return if expected_return is not None else next(
            (signal.expected_return for signal in signals if signal.expected_return is not None),
            None,
        )
        return FusionResult(
            ai_score=round(ai_score * 100, 2),
            confidence=round(self._confidence(available, sentiment, agreement_score) * 100, 2),
            recommendation=self._recommendation(ai_score, agreement_score),
            risk=self._risk(volatility, expected, agreement_score, sentiment),
            agreement=self._agreement_label(agreement_score),
            model_agreement=agreement_score >= self.config.MODEL_AGREEMENT_THRESHOLD,
            explainability={
                "agreement_score": round(agreement_score * 100, 2),
                "available_models": list(scores),
                "consensus": agreement_score >= self.config.MODEL_AGREEMENT_THRESHOLD,
            },
            reasoning=self._reasoning(available, sentiment, agreement_score, expected),
            weighted_scores={name: round(value * 100, 2) for name, value in weighted_scores.items()},
        )

    def _signal(self, name: str, raw: Any, calibrated: Any = None) -> _Signal:
        payload = self._mapping(calibrated if calibrated is not None else raw)
        raw_payload = self._mapping(raw)
        available = bool(payload.get("available", raw_payload.get("available", raw is not None)))
        probabilities = payload.get("probabilities", payload.get("calibrated_probabilities", {}))
        score = self._directional_score(probabilities, payload)
        label = payload.get("signal", payload.get("label", payload.get("prediction")))
        label = str(label).upper() if label is not None else None
        return _Signal(
            name=name,
            score=score,
            certainty=self._probability(payload.get("confidence", payload.get("certainty", 0))),
            label=label if label in LABELS else None,
            available=available,
            expected_return=self._number(payload.get("expected_return")),
        )

    def _sentiment(self, raw: Any) -> _Signal:
        payload = self._mapping(raw)
        scores = payload.get("scores", {})
        positive = self._probability(scores.get("positive", 0)) if isinstance(scores, Mapping) else 0
        negative = self._probability(scores.get("negative", 0)) if isinstance(scores, Mapping) else 0
        total = positive + negative
        dominant = str(payload.get("dominant", payload.get("label", "neutral"))).lower()
        score = positive / total if total else self._probability(payload.get("score", 0))
        if not total and not payload.get("score"):
            score = {"positive": 1.0, "negative": 0.0}.get(dominant, self.config.HOLD_SCORE)
        certainty = self._probability(payload.get("confidence", payload.get("score", 0)))
        return _Signal("finbert", score, certainty, dominant, bool(payload.get("available", raw is not None)))

    def _weights(self, signals: Sequence[_Signal], sentiment: _Signal) -> dict[str, float]:
        configured = {"random_forest": self.config.RF_WEIGHT, "xgboost": self.config.XGB_WEIGHT,
                      "lstm": self.config.LSTM_WEIGHT, "finbert": self.config.FINBERT_WEIGHT}
        return {name: weight for name, weight in configured.items()
                if (name == "finbert" and sentiment.available) or
                any(signal.name == name and signal.available for signal in signals)}

    def _recommendation(self, score: float, agreement: float) -> str:
        if agreement < self.config.DISAGREEMENT_THRESHOLD:
            return HOLD
        if score >= self.config.STRONG_BUY_THRESHOLD and agreement >= self.config.MODEL_AGREEMENT_THRESHOLD:
            return "STRONG BUY"
        if score >= self.config.BUY_THRESHOLD:
            return BUY
        if score <= self.config.STRONG_SELL_THRESHOLD and agreement >= self.config.MODEL_AGREEMENT_THRESHOLD:
            return "STRONG SELL"
        if score <= self.config.SELL_THRESHOLD:
            return SELL
        return HOLD

    def _confidence(self, signals: Sequence[_Signal], sentiment: _Signal, agreement: float) -> float:
        certainties = [signal.certainty for signal in signals]
        if sentiment.available:
            certainties.append(sentiment.certainty)
        base = sum(certainties) / len(certainties) if certainties else 0.0
        return max(0.0, min(1.0, base * self.config.CONFIDENCE_CERTAINTY_WEIGHT + agreement * self.config.CONFIDENCE_AGREEMENT_WEIGHT))

    def _risk(self, volatility: float | None, expected_return: float | None,
              agreement: float, sentiment: _Signal) -> str:
        volatility_score = min(1.0, abs(volatility or 0.0) / self.config.VOLATILITY_SCALE)
        return_score = min(1.0, abs(expected_return or 0.0) / self.config.EXPECTED_RETURN_SCALE)
        sentiment_risk = 1.0 - sentiment.certainty if sentiment.available else self.config.MISSING_SENTIMENT_RISK
        score = (
            volatility_score * self.config.RISK_VOLATILITY_WEIGHT
            + (1 - agreement) * self.config.RISK_DISAGREEMENT_WEIGHT
            + sentiment_risk * self.config.RISK_SENTIMENT_WEIGHT
            + return_score * self.config.RISK_RETURN_WEIGHT
        )
        if score >= self.config.HIGH_RISK_THRESHOLD:
            return "High"
        if score >= self.config.MEDIUM_RISK_THRESHOLD:
            return "Medium"
        return "Low"

    def _reasoning(self, signals: Sequence[_Signal], sentiment: _Signal,
                   agreement: float, expected_return: float | None) -> list[str]:
        reasons = [f"{signal.name.replace('_', ' ').title()} produced a {signal.label or 'directional'} signal."
                   for signal in signals if signal.available]
        if sentiment.available:
            reasons.append(f"Financial news sentiment is {sentiment.label} with {sentiment.certainty * 100:.0f}% certainty.")
        reasons.append("Models are directionally aligned." if agreement >= self.config.MODEL_AGREEMENT_THRESHOLD else "Model outputs are materially divided.")
        if expected_return is not None:
            reasons.append(f"The LSTM expected return is {expected_return * 100:.1f}%.")
        return reasons

    def _agreement(self, scores: Mapping[str, float], weights: Mapping[str, float]) -> float:
        """Calculate consensus using weighted median/MAD and direction support.

        Median absolute deviation limits the influence of a single outlier,
        while directional support preserves the distinction between aligned
        BUY, HOLD, and SELL outputs.
        """
        if not scores:
            return 0.0
        if len(scores) == 1:
            return self.config.SINGLE_MODEL_AGREEMENT
        total_weight = sum(weights.values())
        ordered = sorted(scores.items(), key=lambda item: item[1])
        cumulative = 0.0
        median = ordered[-1][1]
        for name, value in ordered:
            cumulative += weights[name]
            if cumulative >= total_weight / 2:
                median = value
                break
        deviations = sorted((abs(value - median), weights[name]) for name, value in scores.items())
        cumulative = 0.0
        mad = deviations[-1][0]
        for deviation, weight in deviations:
            cumulative += weight
            if cumulative >= total_weight / 2:
                mad = deviation
                break
        dispersion_agreement = max(0.0, min(1.0, 1.0 - self.config.MAD_SCALE * mad))
        buy_support = sum(weights[name] * max(0.0, 2.0 * value - 1.0) for name, value in scores.items())
        sell_support = sum(weights[name] * max(0.0, 1.0 - 2.0 * value) for name, value in scores.items())
        directional_support = max(buy_support, sell_support) / total_weight
        return max(0.0, min(1.0, self.config.DISPERSION_WEIGHT * dispersion_agreement + self.config.DIRECTIONAL_WEIGHT * directional_support))

    def _agreement_label(self, value: float) -> str:
        return "strong" if value >= self.config.STRONG_CONSENSUS_THRESHOLD else "mixed" if value >= self.config.MIXED_CONSENSUS_THRESHOLD else "divided"

    @staticmethod
    def _mapping(value: Any) -> Mapping[str, Any]:
        if value is None:
            return {}
        if isinstance(value, Mapping):
            return value
        if hasattr(value, "model_dump"):
            return value.model_dump()
        if hasattr(value, "dict"):
            return value.dict()
        return {key: getattr(value, key) for key in dir(value)
                if not key.startswith("_") and not callable(getattr(value, key))}

    def _directional_score(self, probabilities: Any, payload: Mapping[str, Any]) -> float:
        if isinstance(probabilities, Mapping):
            values = {label: self._probability(probabilities.get(label, 0)) for label in LABELS}
            total = sum(values.values())
            if total:
                return (values[BUY] + self.config.HOLD_SCORE * values[HOLD]) / total
        legacy_score = payload.get("score", payload.get("technical_score"))
        if legacy_score is not None:
            return self._probability(legacy_score)
        label = str(payload.get("signal", payload.get("label", HOLD))).upper()
        return {SELL: 0.0, HOLD: self.config.HOLD_SCORE, BUY: 1.0}.get(label, self.config.HOLD_SCORE)

    @staticmethod
    def _number(value: Any) -> float | None:
        try:
            number = float(value)
            return number if isfinite(number) else None
        except (TypeError, ValueError):
            return None

    @classmethod
    def _probability(cls, value: Any) -> float:
        number = cls._number(value) or 0.0
        return max(0.0, min(1.0, number / 100 if number > 1 else number))


DecisionFusion = FusionEngine