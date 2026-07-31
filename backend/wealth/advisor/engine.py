"""
backend/wealth/advisor/engine.py

Backward-compatibility shim.

``AdvisorEngine`` now lives in ``advisor.py``.
This module re-exports it so that any existing import of the form

    from backend.wealth.advisor.engine import AdvisorEngine

continues to work without modification.
"""

from .advisor import AdvisorEngine

__all__ = ["AdvisorEngine"]
