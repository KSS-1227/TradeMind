import React from "react";
import { motion } from "framer-motion";
import { Clock, ShieldCheck, Briefcase, Search, TrendingUp } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export function RecentAnalysesTimeline() {
  const analyses = [
    {
      type: "Portfolio Doctor",
      result: "Health Score 78/100 · 3 BUY Signals",
      time: "10 mins ago",
      icon: Briefcase,
      status: "SUCCESS",
      variant: "teal",
    },
    {
      type: "Scam Detector",
      result: "CRITICAL SCAM RISK (85/100) — Urgency & Guaranteed Return Flags",
      time: "25 mins ago",
      icon: ShieldCheck,
      status: "COMPLETED",
      variant: "danger",
    },
    {
      type: "AI Screener",
      result: "Found 4 stocks matching 'RSI below 30 & EMA bullish crossover'",
      time: "1 hour ago",
      icon: Search,
      status: "DONE",
      variant: "blue",
    },
    {
      type: "Strategy Builder",
      result: "RELIANCE 2-Year Backtest Yield: +34.2% vs Nifty +18.1%",
      time: "3 hours ago",
      icon: TrendingUp,
      status: "VERIFIED",
      variant: "gold",
    },
  ];

  return (
    <Card style={{ marginBottom: "28px", padding: "20px" }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "var(--color-teal)",
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <Clock size={16} /> RECENT AI ANALYSES & MODEL AUDITS
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {analyses.map((item, idx) => {
          const IconComp = item.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.25 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-md, 10px)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-teal)",
                  }}
                >
                  <IconComp size={16} />
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {item.type}
                    </span>
                    <Badge variant={item.variant} size="sm">
                      {item.status}
                    </Badge>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {item.result}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                {item.time}
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

export default RecentAnalysesTimeline;
