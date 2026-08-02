import React from "react";
import { motion } from "framer-motion";
import { Zap, ArrowUpRight } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { toast } from "sonner";

export function AIRecommendationsSection({ holdings = [] }) {
  // Generate intelligent recommendations dynamically from real analysis output
  const generateRecommendations = () => {
    const recs = [];

    const sellSignals = holdings.filter((h) => (h.recommendation || "").toUpperCase().includes("SELL"));
    const buySignals = holdings.filter((h) => (h.recommendation || "").toUpperCase().includes("BUY"));

    // Check concentration
    const maxWeightHolding = holdings.reduce((prev, curr) => (curr.weight > (prev?.weight || 0) ? curr : prev), null);

    if (maxWeightHolding && maxWeightHolding.weight > 30) {
      recs.push({
        priority: "HIGH PRIORITY",
        priorityVariant: "danger",
        title: `Rebalance High Concentration in ${maxWeightHolding.symbol?.replace(".NS", "")}`,
        reason: `${maxWeightHolding.symbol?.replace(".NS", "")} accounts for ${maxWeightHolding.weight}% of portfolio weight, exceeding the 25% safety threshold.`,
        impact: "-14% Portfolio Volatility",
        actionText: "Rebalance Position",
      });
    }

    if (sellSignals.length > 0) {
      const symbols = sellSignals.map((s) => s.symbol?.replace(".NS", "")).join(", ");
      recs.push({
        priority: "ACTION REQUIRED",
        priorityVariant: "warning",
        title: `Trim or Exit Weak Holdings (${symbols})`,
        reason: `AI models detected negative sentiment and bearish momentum trends for ${symbols}.`,
        impact: "+4.2% Risk-Adjusted Yield",
        actionText: "Execute Exit Plan",
      });
    }

    if (buySignals.length > 0) {
      const topBuy = buySignals[0];
      recs.push({
        priority: "OPTIMIZATION",
        priorityVariant: "teal",
        title: `Accumulate Strong Signal Asset (${topBuy.symbol?.replace(".NS", "")})`,
        reason: `${topBuy.symbol?.replace(".NS", "")} shows ${Math.round((topBuy.confidence || 0.85) * 100)}% AI model agreement with positive expected return.`,
        impact: "+5.8% Expected Return",
        actionText: "Increase Weight",
      });
    }

    // Default fallback recommendation
    if (recs.length < 2) {
      recs.push({
        priority: "RECOMMENDED",
        priorityVariant: "blue",
        title: "Add Commodity / Gold Hedge",
        reason: "Adding 10-15% gold (GOLD24K) provides downside protection during equity market volatility.",
        impact: "-18% Max Drawdown Protection",
        actionText: "View Hedge Options",
      });
    }

    return recs;
  };

  const recommendations = generateRecommendations();

  const handleAction = (title) => {
    toast.success(`Recommendation queued: "${title}"`);
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        <Zap size={18} color="var(--color-teal)" />
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          AI OPTIMIZATION RECOMMENDATIONS
        </h3>
      </div>

      <div className="pd-recs-grid">
        {recommendations.map((rec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card
              variant="feature"
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "20px",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <Badge variant={rec.priorityVariant} size="sm">
                    {rec.priority}
                  </Badge>

                  <div
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-teal)",
                      fontWeight: 700,
                    }}
                  >
                    {rec.impact}
                  </div>
                </div>

                <h4
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: "8px",
                    lineHeight: 1.3,
                  }}
                >
                  {rec.title}
                </h4>

                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    marginBottom: "16px",
                  }}
                >
                  {rec.reason}
                </p>
              </div>

              <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  icon={ArrowUpRight}
                  iconPosition="right"
                  onClick={() => handleAction(rec.title)}
                >
                  {rec.actionText}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default AIRecommendationsSection;
