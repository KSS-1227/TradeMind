import React from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { Eye, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { STOCK_LABELS } from "../../constants/stocks";
import { fmt } from "../../utils/formatters";

export function WatchlistSection({ commodities, marketQuotes }) {
  const navigate = useNavigate();
  const quotes = marketQuotes?.quotes || {};

  const watchlist = ["RELIANCE", "TCS", "INFY", "HDFCBANK"].map((symbol) => {
    const quote = quotes[symbol];
    const changePercent = quote?.change_percent;
    return {
      symbol,
      price: quote ? `₹${fmt(quote.price)}` : "Unavailable",
      change: changePercent == null ? null : `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%`,
      isPositive: changePercent == null ? null : changePercent >= 0,
      signal: "—",
      confidence: null,
      data: quote?.history?.map((point) => ({ v: point.price })) || [],
    };
  }).concat([
    {
      symbol: "GOLD24K",
      quoteOnly: true,
      price: commodities?.gold ? `₹${fmt(commodities.gold.price_inr)} / 10g` : "Unavailable",
      change: null,
      signal: "—",
      confidence: null,
      data: commodities?.gold?.history?.map((point) => ({ v: point.price_inr })) || [],
    },
    {
      symbol: "SILVER",
      quoteOnly: true,
      price: commodities?.silver ? `₹${fmt(commodities.silver.price_inr)} / kg` : "Unavailable",
      change: null,
      signal: "—",
      confidence: null,
      data: commodities?.silver?.history?.map((point) => ({ v: point.price_inr })) || [],
    },
  ]);

  return (
    <Card style={{ marginBottom: "28px", padding: 0, overflow: "hidden" }}>
      <div
        style={{
          padding: "16px 20px",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Eye size={16} color="var(--color-teal)" />
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            WATCHLIST & MARKET QUOTES
          </h3>
        </div>

        <button
          type="button"
          onClick={() => navigate("/screener")}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-teal)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          View Full Screener →
        </button>
      </div>

      <div className="pd-table-container">
        <table className="pd-table">
          <thead>
            <tr>
              <th>Stock</th>
              <th>Price</th>
              <th>24h Change</th>
              <th>AI Signal</th>
              <th>Confidence</th>
              <th style={{ width: "120px" }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {watchlist.map((item, idx) => (
              <tr
                key={idx}
                onClick={() => !item.quoteOnly && navigate(`/screener?stock=${item.symbol}`)}
                style={{ cursor: item.quoteOnly ? "default" : "pointer" }}
              >
                <td>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{item.symbol}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {STOCK_LABELS[item.symbol] || "Asset"}
                  </div>
                </td>

                <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  {item.price}
                </td>

                <td>
                  {item.change ? <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      color: item.isPositive ? "var(--success)" : "var(--danger)",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    {item.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {item.change}
                  </div> : "—"}
                </td>

                <td>
                  <Badge signal={item.signal} />
                </td>

                <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-teal)" }}>
                  {item.confidence == null ? "—" : `${item.confidence}%`}
                </td>

                <td>
                  <div style={{ height: "26px", width: "100px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={item.data}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke={item.isPositive ? "var(--success)" : "var(--danger)"}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default WatchlistSection;
