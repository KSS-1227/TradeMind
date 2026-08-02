"""
TradeMind Portfolio AI

This package provides the AI explanation layer for Portfolio Doctor.

Architecture
------------
Random Forest
        +
LSTM
        +
FinBERT
        +
Fusion Engine
        ↓
Portfolio AI Explanation Engine
        ↓
Investor-Friendly Report

The LLM NEVER performs predictions.

It only explains deterministic outputs produced by the
existing ML pipeline.
"""

from .llm_explainer import (
    generate_portfolio_report,
    llm_available,
)

from .models import PortfolioAIReport

__all__ = [
    "generate_portfolio_report",
    "llm_available",
    "PortfolioAIReport",
]