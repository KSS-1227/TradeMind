import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.wealth.advisor.risk import RiskEvaluator
from backend.wealth.advisor.opportunity import OpportunityEvaluator
from backend.wealth.advisor.recommendations import RecommendationEvaluator
from backend.wealth.advisor.alerts import AlertEvaluator

def main():

    RiskEvaluator()

    OpportunityEvaluator()

    RecommendationEvaluator()

    AlertEvaluator()

    print("All engines initialized successfully.")

if __name__ == "__main__":
    main()