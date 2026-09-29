import React from "react";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import { Card } from "../ui/Card";

export function AIActivityFeed({ commodities }) {
  const feed = [
    { title: "Portfolio Doctor Analysis Completed", detail: "Scanned 4 holdings with FinBERT + Random Forest model agreement", time: "Just now", color: "var(--color-teal)" },
    { title: "Scam Risk Alert Flagged", detail: "Detected 85/100 Pump & Dump pattern in WhatsApp tip", time: "2m ago", color: "var(--danger)" },
    { title: "Signal Generated for RELIANCE", detail: "Signal upgraded to BUY with 92% Random Forest confidence", time: "5m ago", color: "var(--success)" },
    { title: "Strategy Backtest Simulation Finished", detail: "2-year RSI + MACD rule executed cleanly against Nifty 50", time: "12m ago", color: "var(--color-gold)" },
    ...(commodities ? [{
      title: "Commodity quotes refreshed",
      detail: `Gold ₹${Number(commodities.gold?.price_inr || 0).toLocaleString("en-IN")} / 10g · Silver ₹${Number(commodities.silver?.price_inr || 0).toLocaleString("en-IN")} / kg · indicative futures feed`,
      time: commodities.fetched_at ? new Date(commodities.fetched_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Recently",
      color: "var(--color-gold)",
    }] : []),
  ];

  return (
    <Card style={{ marginBottom: "28px", padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Radio size={16} color="var(--color-teal)" className="pulse" />
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            LIVE AI COPILOT ACTIVITY FEED
          </h3>
        </div>
        <span style={{ fontSize: "11px", color: "var(--color-teal)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
          ● LIVE STREAM
        </span>
      </div>

      <div className="db-activity-list">
        {feed.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.2 }}
            className="db-activity-item"
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: item.color,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>{item.title}</div>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                {item.detail}
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
              {item.time}
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

export default AIActivityFeed;
