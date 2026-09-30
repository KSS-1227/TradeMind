import React from "react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { fmt } from "../../utils/formatters";

export function MarketOverviewSection({ commodities, marketQuotes }) {
  const goldQuote = commodities?.gold;
  const silverQuote = commodities?.silver;
  const stockQuotes = marketQuotes?.quotes || {};
  const quoteHistory = (quote, priceKey = "price") => quote?.history?.map((point) => ({
    val: typeof point === "number" ? point : point[priceKey],
  })).filter((point) => Number.isFinite(point.val)) || [];
  const quoteTime = (quote) => quote?.as_of
    ? new Date(quote.as_of).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
    : "Waiting for quote";
  const formatPrice = (value, currency = "") => `${currency}${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const marketCard = (name, quote, currency = "") => ({
    name,
    value: quote ? formatPrice(quote.price, currency) : "Unavailable",
    change: quote?.change_percent == null ? null : `${quote.change_percent > 0 ? "+" : ""}${quote.change_percent.toFixed(2)}%`,
    isPositive: quote?.change_percent == null ? null : quote.change_percent >= 0,
    trend: quote?.change_percent == null ? null : quote.change_percent >= 0 ? "UP" : "DOWN",
    sparkline: quoteHistory(quote),
    status: quote ? `Yahoo Finance · ${quoteTime(quote)}` : "Waiting for quote",
  });
  const commodityCard = (name, quote, color) => ({
    name,
    value: quote ? `₹${fmt(quote.price_inr)}` : "Unavailable",
    change: null,
    isPositive: null,
    trend: null,
    sparkline: quoteHistory(quote, "price_inr"),
    status: quote ? `${quote.source || "Yahoo Finance"} · ${quoteTime(quote)}` : "Waiting for quote",
    color,
  });

  const markets = [
    marketCard("NIFTY 50", stockQuotes["NIFTY 50"]),
    marketCard("SENSEX", stockQuotes.SENSEX),
    marketCard("BANK NIFTY", stockQuotes["BANK NIFTY"]),
    commodityCard("GOLD FUTURES (INR / 10g)", goldQuote, "var(--color-gold)"),
    commodityCard("SILVER FUTURES (INR / kg)", silverQuote),
    marketCard("BITCOIN (BTC)", stockQuotes["BITCOIN (BTC)"], "$"),
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
          MARKET & COMMODITY OVERVIEW
        </h3>
      </div>

      <div className="db-market-grid">
        {markets.map((m, i) => {
          const strokeColor = m.color || (m.isPositive == null ? "var(--text-muted)" : m.isPositive ? "var(--success)" : "var(--danger)");
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
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.5px" }}>
                      {m.name}
                    </span>
                    {m.change && <Badge variant={m.isPositive ? "success" : "danger"} size="sm">{m.change}</Badge>}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                    <div style={{ fontSize: "23px", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {m.value}
                    </div>

                    {m.trend && (
                      <div style={{ fontSize: "12px", fontWeight: 600, color: strokeColor, display: "flex", alignItems: "center", gap: 3 }}>
                        {m.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {m.trend}
                      </div>
                    )}
                  </div>
                  {m.status && <div title={m.status} style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.status}</div>}
                </div>

                {/* Mini Recharts Sparkline */}
                {m.sparkline.length > 0 && <div style={{ height: "42px", width: "100%", marginTop: "4px" }}>
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
                </div>}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default MarketOverviewSection;
