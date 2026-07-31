import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fmt } from "../../utils/formatters";

export function PriceAreaChart({ prices, isMobile, height = 240, color = "var(--color-teal)" }) {
  if (!prices || prices.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>
        Loading price history chart...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={prices}>
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis
          dataKey="Date"
          tick={{ fill: "var(--text-muted)", fontSize: 9 }}
          tickFormatter={(v) => (v && typeof v === "string" ? v.slice(5) : v)}
          interval={isMobile ? 20 : 14}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 9 }}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          domain={["auto", "auto"]}
          width={45}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            color: "var(--text-primary)",
            fontSize: 11,
          }}
          formatter={(v) => [`₹${fmt(v)}`, "Price"]}
          labelFormatter={(l) => `Date: ${l}`}
        />
        <Area
          type="monotone"
          dataKey="Close"
          stroke={color}
          strokeWidth={2}
          fill="url(#priceGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
