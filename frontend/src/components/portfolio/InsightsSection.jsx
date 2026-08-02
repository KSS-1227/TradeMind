import React from "react";
import { motion } from "framer-motion";
import { AlertOctagon, PieChart, ShieldCheck, Layers, Activity } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export function InsightsSection({ holdings = [] }) {
  const generateInsights = () => {
    const insights = [];

    // Calculate metrics
    const totalCount = holdings.length;
    const maxHolding = holdings.reduce((prev, curr) => (curr.weight > (prev?.weight || 0) ? curr : prev), null);

    // Tech sector count
    const techCount = holdings.filter((h) => {
      const s = (h.symbol || "").toUpperCase();
      return s.includes("TCS") || s.includes("INFY") || s.includes("WIPRO") || s.includes("TECHM");
    }).length;

    // High concentration insight
    if (maxHolding && maxHolding.weight >= 30) {
      insights.push({
        icon: AlertOctagon,
        iconColor: "var(--danger)",
        severity: "CRITICAL",
        severityVariant: "danger",
        title: "High Concentration Detected",
        explanation: `${maxHolding.symbol?.replace(".NS", "")} accounts for ${maxHolding.weight}% of your total portfolio. Severe single-stock exposure.`,
      });
    }

    // Technology Overweight
    if (techCount >= 2 || (techCount / totalCount) >= 0.5) {
      insights.push({
        icon: PieChart,
        iconColor: "var(--warning)",
        severity: "WARNING",
        severityVariant: "warning",
        title: "Technology Sector Overweight",
        explanation: "Over 40% of capital is deployed in IT services. Portfolio is sensitive to tech index downturns.",
      });
    }

    // Low Diversification
    if (totalCount <= 2) {
      insights.push({
        icon: Layers,
        iconColor: "var(--warning)",
        severity: "ATTENTION",
        severityVariant: "warning",
        title: "Low Asset Diversification",
        explanation: `Portfolio holds only ${totalCount} position(s). Broadening across uncorrelated sectors reduces drawdown risks.`,
      });
    } else {
      insights.push({
        icon: ShieldCheck,
        iconColor: "var(--color-teal)",
        severity: "POSITIVE",
        severityVariant: "teal",
        title: "Multi-Asset Coverage",
        explanation: `Portfolio spans ${totalCount} distinct stock positions across multiple market capitalizations.`,
      });
    }

    // Defensive Allocation Check
    const hasGoldOrDefensive = holdings.some((h) => {
      const s = (h.symbol || "").toUpperCase();
      return s.includes("GOLD") || s.includes("GC=F") || s.includes("HDFCBANK");
    });

    if (hasGoldOrDefensive) {
      insights.push({
        icon: Activity,
        iconColor: "var(--success)",
        severity: "HEALTHY",
        severityVariant: "success",
        title: "Strong Defensive Allocation",
        explanation: "Presence of defensive bluechips or commodity assets helps cushion against sharp market pullbacks.",
      });
    } else {
      insights.push({
        icon: Activity,
        iconColor: "var(--accent-blue)",
        severity: "INFO",
        severityVariant: "blue",
        title: "Growth Heavy Allocation",
        explanation: "Portfolio is tilted heavily towards equity capital appreciation without cash/commodity buffers.",
      });
    }

    return insights;
  };

  const insightsList = generateInsights();

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
        <Activity size={18} color="var(--accent-blue)" />
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          PORTFOLIO HEALTH INSIGHTS
        </h3>
      </div>

      <div className="pd-insights-grid">
        {insightsList.map((item, idx) => {
          const IconComp = item.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.08, duration: 0.25 }}
            >
              <Card
                style={{
                  padding: "16px",
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start",
                  background: "var(--bg-surface)",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "var(--radius-md, 10px)",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: item.iconColor,
                    flexShrink: 0,
                  }}
                >
                  <IconComp size={20} />
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      {item.title}
                    </h4>
                    <Badge variant={item.severityVariant} size="sm">
                      {item.severity}
                    </Badge>
                  </div>

                  <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                    {item.explanation}
                  </p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default InsightsSection;
