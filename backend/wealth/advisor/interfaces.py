"""
backend/wealth/advisor/interfaces.py

Abstract interfaces for the Advisor module.

Dependency Inversion — nothing inside AdvisorService or AdvisorEngine
should import a concrete class directly. All dependencies flow through
these contracts.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from backend.wealth.portfolio_analyzer import PortfolioAnalysis

from .models import AdvisorResponse


class PortfolioAnalysisProvider(ABC):
    """Contract implemented by ``PortfolioAnalyzer``.

    ``AdvisorService`` depends on this interface rather than the
    concrete ``PortfolioAnalyzer``, satisfying the Dependency
    Inversion Principle.
    """

    @abstractmethod
    async def analyze_portfolio(
        self,
        portfolio_id: str,
    ) -> PortfolioAnalysis:
        """Return a completed ``PortfolioAnalysis`` for the given portfolio."""
        ...


class AdviceGenerator(ABC):
    """Contract implemented by ``AdvisorEngine``.

    Synchronous by design — ``AdvisorEngine`` performs CPU-bound work
    only and must not be declared ``async``.

    ``AdvisorService`` depends on this interface rather than the
    concrete ``AdvisorEngine``.
    """

    @abstractmethod
    def generate(
        self,
        analysis: PortfolioAnalysis,
    ) -> AdvisorResponse:
        """Generate an ``AdvisorResponse`` from a completed ``PortfolioAnalysis``."""
        ...
