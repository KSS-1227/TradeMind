from backend.wealth.advisor.risk import RiskEvaluator
from backend.wealth.advisor.opportunity import OpportunityEvaluator
from backend.wealth.advisor.recommendations import RecommendationEvaluator
from backend.wealth.advisor.alerts import AlertEvaluator


def main():
    RiskEvaluator()
    OpportunityEvaluator()
    RecommendationEvaluator()
    AlertEvaluator()
    print("Advisor modules initialized successfully.")


if __name__ == "__main__":
    main()