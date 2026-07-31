"""
backend/wealth/advisor/service.py

AdvisorService — thin async orchestration layer.

Responsibilities
----------------
✓ Accept injected interfaces (not concrete classes)
✓ Call PortfolioAnalysisProvider.analyze_portfolio()
✓ Pass the result to AdviceGenerator.generate()
✓ Return AdvisorResponse

This class MUST NOT:
  - Query repositories
  - Load holdings, transactions, or market data
  - Perform any scoring or analysis
  - Reference concrete implementations directly
"""

from __future__ import annotations

import logging

from .interfaces import AdviceGenerator, PortfolioAnalysisProvider
from .models import AdvisorResponse

logger = logging.getLogger(__name__)


class AdvisorService:
    """Thin async orchestration layer between the portfolio layer and advisor engine.

    Depends exclusively on the ``PortfolioAnalysisProvider`` and
    ``AdviceGenerator`` interfaces — never on concrete classes — satisfying
    the Dependency Inversion Principle.

    Parameters
    ----------
    analyzer:
        Any object implementing ``PortfolioAnalysisProvider``
        (typically ``PortfolioAnalyzer``).
    advisor:
        Any object implementing ``AdviceGenerator``
        (typically ``AdvisorEngine``).
    """

    def __init__(
        self,
        analyzer: PortfolioAnalysisProvider,
        advisor: AdviceGenerator,
    ) -> None:
        self._analyzer = analyzer
        self._advisor  = advisor

    async def advise(
        self,
        portfolio_id: str,
    ) -> AdvisorResponse:
        """Analyse *portfolio_id* and return a complete ``AdvisorResponse``.

        Raises
        ------
        Exception
            Any exception raised by the analyzer or advisor propagates
            unchanged after being logged.
        """

        logger.info(
            "advisor.service.started",
            extra={"portfolio_id": portfolio_id},
        )

        try:
            analysis = await self._analyzer.analyze_portfolio(portfolio_id)
            response = self._advisor.generate(analysis)

        except Exception:
            logger.exception(
                "advisor.service.failed",
                extra={"portfolio_id": portfolio_id},
            )
            raise

        logger.info(
            "advisor.service.completed",
            extra={"portfolio_id": portfolio_id},
        )

        return response
