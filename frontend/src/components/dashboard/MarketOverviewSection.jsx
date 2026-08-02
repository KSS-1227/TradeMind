import React from "react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { fmt } from "../../utils/formatters";

export function MarketOverviewSection({ goldData }) {
  // Mini sparkline data generators
  const generateSparkline = (base, isPositive = true) => {
    const points = [];
    let current = base;
    for (let i = 0; i < 10; i++) {
      const change = (Math.random() - (isPositive ? 0.4 : 0.6)) * (base * 0.005);
      current += change;
      points.push({ val: current });
    }
    return points;
  };

  const markets = [
    {
      name: "NIFTY 50",
      value: "24,850.40",
      change: "+0.85%",
      isPositive: true,
      trend: "BULLISH",
      sparkline: generateSparkline(24850, true),
      status: "LIVE",
    },
    {
      name: "SENSEX",
      value: "81,320.15",
      change: "+0.72%",
      isPositive: true,
      trend: "BULLISH",
      sparkline: generateSparkline(81320, true),
      status: "LIVE",
    },
    {
      name: "BANK NIFTY",
      value: "51,240.80",
      change: "-0.35%",
      isPositive: false,
      trend: "BEARISH",
      sparkline: generateSparkline(51240, false),
      status: "LIVE",
    },
    {
      name: "GOLD 24K (MCX)",
      value: goldData ? `₹${fmt(goldData.current_price_10g)}` : "₹72,450",
      change: "+1.15%",
      isPositive: true,
      trend: "STRONG BUY",
      sparkline: goldData?.history?.length > 0
        ? goldData.history.map((h) => ({ val: h.Close || h.val || 72000 }))
        : generateSparkline(72450, true),
      status: "MCX INDIA",
      color: "var(--color-gold)",
    },
    {
      name: "SILVER (MCX)",
      value: "₹84,200",
      change: "+1.65%",
      isPositive: true,
      trend: "ACCUMULATE",
      sparkline: generateSparkline(84200, true),
      status: "MCX INDIA",
    },
    {
      name: "BITCOIN (BTC)",
      value: "$64,280",
      change: "-1.20%",
      isPositive: false,
      trend: "NEUTRAL",
      sparkline: generateSparkline(64280, false),
      status: "CRYPTO",
    },
  ];

  return (
    <div style={{ marginBottom: "28px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        <Activity size={18} color="var(--color-teal)" />
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          LIVE MARKET & COMMODITY OVERVIEW
        </h3>
      </div>

      <div className="db-market-grid">
        {markets.map((m, i) => {
          const strokeColor = m.color || (m.isPositive ? "var(--success)" : "var(--danger)");
          const gradientId = `marketGrad-${i}`;

          return (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
            >
              <Card
                style={{
                  padding: "16px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  background: "var(--bg-surface)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.5px" }}>
                      {m.name}
                    </span>
                    <Badge variant={m.isPositive ? "success" : "danger"} size="sm">
                      {m.change}
                    </Badge>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {m.value}
                    </div>

                    <div style={{ fontSize: "11px", fontWeight: 600, color: strokeColor, display: "flex", alignItems: "center", gap: 3 }}>
                      {m.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {m.trend}
                    </div>
                  </div>
                </div>

                {/* Mini Recharts Sparkline */}
                <div style={{ height: "42px", width: "100%", marginTop: "4px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={m.sparkline} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="val"
                        stroke={strokeColor}
                        strokeWidth={1.8}
                        fillOpacity={1}
                        fill={`url(#${gradientId})`}
                        isAnimationActive={true}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default MarketOverviewSection;
