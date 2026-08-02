import React from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { Eye, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { STOCK_LABELS } from "../../constants/stocks";

export function WatchlistSection() {
  const navigate = useNavigate();

  const watchlist = [
    {
      symbol: "RELIANCE",
      price: "₹2,950.00",
      change: "+2.40%",
      isPositive: true,
      signal: "BUY",
      confidence: 92,
      data: [{ v: 2880 }, { v: 2900 }, { v: 2890 }, { v: 2920 }, { v: 2950 }],
    },
    {
      symbol: "TCS",
      price: "₹3,820.50",
      change: "+1.80%",
      isPositive: true,
      signal: "ACCUMULATE",
      confidence: 88,
      data: [{ v: 3750 }, { v: 3780 }, { v: 3760 }, { v: 3800 }, { v: 3820 }],
    },
    {
      symbol: "INFY",
      price: "₹1,410.20",
      change: "-0.90%",
      isPositive: false,
      signal: "HOLD",
      confidence: 76,
      data: [{ v: 1430 }, { v: 1425 }, { v: 1420 }, { v: 1415 }, { v: 1410 }],
    },
    {
      symbol: "HDFCBANK",
      price: "₹1,560.00",
      change: "+0.30%",
      isPositive: true,
      signal: "BUY",
      confidence: 85,
      data: [{ v: 1550 }, { v: 1555 }, { v: 1552 }, { v: 1558 }, { v: 1560 }],
    },
    {
      symbol: "GOLD24K",
      price: "₹72,450.00",
      change: "+1.15%",
      isPositive: true,
      signal: "BUY",
      confidence: 94,
      data: [{ v: 71500 }, { v: 71800 }, { v: 72000 }, { v: 72200 }, { v: 72450 }],
    },
  ];

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
            AI WATCHLIST & REAL-TIME SIGNALS
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
                onClick={() => navigate(`/screener?stock=${item.symbol}`)}
                style={{ cursor: "pointer" }}
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
                  <div
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
                  </div>
                </td>

                <td>
                  <Badge signal={item.signal} />
                </td>

                <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-teal)" }}>
                  {item.confidence}%
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
