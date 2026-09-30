import React from "react";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { Card } from "../ui/Card";
import { toast } from "sonner";
import { fmt } from "../../utils/formatters";

export function MarketHeatmap({ commodities, marketQuotes }) {
  const quotes = marketQuotes?.quotes || {};
  const stocks = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "TATAMOTORS", "WIPRO", "SBIN"]
    .map((symbol) => {
      const quote = quotes[symbol];
      const changePercent = quote?.change_percent;
      return {
        symbol,
        change: changePercent == null ? null : `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%`,
        status: changePercent == null ? "neutral" : changePercent >= 0 ? "green" : "red",
        val: quote ? `₹${fmt(quote.price)}` : "Unavailable",
      };
    });

  stocks.splice(7, 0, {
      symbol: "GOLD / 10g",
      status: "neutral",
      val: commodities?.gold ? `₹${fmt(commodities.gold.price_inr)}` : "Unavailable",
    }, {
      symbol: "SILVER / kg",
      status: "neutral",
      val: commodities?.silver ? `₹${fmt(commodities.silver.price_inr)}` : "Unavailable",
    });

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
              <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)" }}>
                {s.symbol}
              </div>
              {s.change && <div style={{ fontSize: "16px", fontWeight: 800, fontFamily: "var(--font-mono)", marginTop: 2 }}>{s.change}</div>}
              <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 2 }}>
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
