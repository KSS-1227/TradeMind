import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, ShieldAlert, Search, TrendingUp, Calculator, ArrowUpRight } from "lucide-react";
import { Card } from "../ui/Card";

export function QuickActionsSection() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Analyze Portfolio",
      desc: "Run AI Portfolio Doctor for health, risk, & diversification insights.",
      path: "/portfolio-doctor",
      icon: Briefcase,
      color: "var(--color-teal)",
      badge: "FLAGSHIP",
    },
    {
      title: "Run Scam Detector",
      desc: "Investigate WhatsApp, Telegram, SMS, or Email investment tips.",
      path: "/scam-detector",
      icon: ShieldAlert,
      color: "var(--danger)",
      badge: "NEW AI",
    },
    {
      title: "Open Stock Screener",
      desc: "Filter NSE universe using natural language criteria.",
      path: "/screener",
      icon: Search,
      color: "var(--accent-blue)",
      badge: "SCREENER",
    },
    {
      title: "Create Strategy",
      desc: "Backtest custom technical rules against 2-year NSE market data.",
      path: "/strategy-builder",
      icon: TrendingUp,
      color: "var(--color-gold)",
      badge: "BACKTEST",
    },
    {
      title: "Wealth Projection",
      desc: "Project monthly SIP future value with crash stress-test scenarios.",
      path: "/wealth-projection",
      icon: Calculator,
      color: "var(--accent-purple, #8B5CF6)",
      badge: "PLANNER",
    },
  ];

  return (
    <div style={{ marginBottom: "28px" }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "var(--color-teal)",
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          marginBottom: "14px",
        }}
      >
        AI OPERATING SYSTEM QUICK ACTIONS
      </div>

      <div className="db-actions-grid">
        {actions.map((act, idx) => {
          const IconComp = act.icon;
          return (
            <motion.div
              key={act.title}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(act.path)}
              style={{ cursor: "pointer" }}
            >
              <Card
                variant="feature"
                style={{
                  height: "100%",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
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
                        color: act.color,
                      }}
                    >
                      <IconComp size={20} />
                    </div>

                    <span style={{ fontSize: "10px", fontWeight: 700, color: act.color, letterSpacing: "0.5px" }}>
                      {act.badge}
                    </span>
                  </div>

                  <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                    {act.title}
                  </h4>

                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4, margin: 0 }}>
                    {act.desc}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: act.color,
                  }}
                >
                  <span>Launch Tool</span>
                  <ArrowUpRight size={14} />
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActionsSection;
