# agents/pipeline.py
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.research_agent import research
from agents.signal_agent import generate_signal
from agents.explainer_agent import explain

def run_pipeline(symbol: str) -> dict:
    """
    Full TradeMind pipeline — runs all 3 agents in sequence
    Research → Signal → Explain
    """
    print(f"\n{'='*50}")
    print(f"TradeMind Pipeline — {symbol}")
    print(f"{'='*50}")

    # Agent 1
    research_data = research(symbol)
    if "error" in research_data:
        return {"error": research_data["error"]}

    # Agent 2
    signal_data = generate_signal(research_data)

    # Agent 3
    explanation = explain(signal_data, research_data)

    print(f"\n✅ Pipeline complete for {symbol}")
    return explanation

if __name__ == "__main__":
    result = run_pipeline("RELIANCE.NS")

    print(f"\n{'='*50}")
    print(f"FINAL OUTPUT")
    print(f"{'='*50}")
    print(f"Stock    : {result['symbol']}")
    print(f"Signal   : {result['signal']}")
    print(f"Price    : {result['price']}")
    print(f"Confidence: {result['confidence']}")
    print(f"\nWhy this signal?")
    for i, r in enumerate(result["reasons"], 1):
        print(f"  {i}. {r}")
    print(f"\nRisk Metrics:")
    print(f"  Sharpe Ratio : {result['risk']['sharpe']}")
    print(f"  Max Drawdown : {result['risk']['drawdown']}")
    print(f"  VaR (95%)    : {result['risk']['var']}")
    print(f"  Note         : {result['risk']['note']}")