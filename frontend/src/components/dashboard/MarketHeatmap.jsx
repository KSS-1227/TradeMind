import React from "react";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { Card } from "../ui/Card";
import { toast } from "sonner";
import { fmt } from "../../utils/formatters";

export function MarketHeatmap({ commodities }) {
  const stocks = [
    { symbol: "RELIANCE", change: "+2.4%", status: "green", val: "₹2,950" },
    { symbol: "TCS", change: "+1.8%", status: "green", val: "₹3,820" },
    { symbol: "INFY", change: "-0.9%", status: "red", val: "₹1,410" },
    { symbol: "HDFCBANK", change: "+0.3%", status: "neutral", val: "₹1,560" },
    { symbol: "ICICIBANK", change: "+1.5%", status: "green", val: "₹1,120" },
    { symbol: "TATAMOTORS", change: "+3.2%", status: "green", val: "₹960" },
    { symbol: "WIPRO", change: "-1.4%", status: "red", val: "₹480" },
    {
      symbol: "GOLD / 10g",
      status: "neutral",
      val: commodities?.gold ? `₹${fmt(commodities.gold.price_inr)}` : "Unavailable",
    },
    {
      symbol: "SILVER / kg",
      status: "neutral",
      val: commodities?.silver ? `₹${fmt(commodities.silver.price_inr)}` : "Unavailable",
    },
    { symbol: "SBIN", change: "-0.5%", status: "red", val: "₹810" },
  ];

  const handleTileClick = (s) => {
    toast.info(`${s.symbol}: ${s.val}${s.change ? ` · Change ${s.change}` : ""}`);
  };

  return (
    <Card style={{ marginBottom: "28px", padding: "20px" }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "var(--color-teal)",
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <Layers size={16} /> NSE & COMMODITY MARKET HEATMAP
      </div>

      <div className="db-heatmap-grid">
        {stocks.map((s, idx) => {
          const className =
            s.status === "green"
              ? "db-heatmap-green"
              : s.status === "red"
              ? "db-heatmap-red"
              : "db-heatmap-neutral";

          return (
            <motion.div
              key={s.symbol}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTileClick(s)}
              className={`db-heatmap-tile ${className}`}
            >
              <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)" }}>
                {s.symbol}
              </div>
              {s.change && <div style={{ fontSize: "14px", fontWeight: 800, fontFamily: "var(--font-mono)", marginTop: 2 }}>{s.change}</div>}
              <div style={{ fontSize: "10.5px", opacity: 0.8, marginTop: 2 }}>
                {s.val}
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

export default MarketHeatmap;
