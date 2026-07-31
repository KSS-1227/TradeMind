import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const PIE_COLORS = [
  "var(--color-teal)",
  "var(--color-gold)",
  "#7C3AED",
  "#2563EB",
  "var(--color-danger)",
];

export function PortfolioPieChart({ allocs, isMobile, height = 220 }) {
  const filtered = (allocs || []).filter((a) => a.weight > 0);

  if (filtered.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
        No allocation breakdown available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="weight"
          nameKey="symbol"
          cx="50%"
          cy="50%"
          outerRadius={isMobile ? 65 : 85}
          label={({ symbol, weight }) => `${symbol} ${weight}%`}
          labelLine={false}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            color: "var(--text-primary)",
            fontSize: 11,
          }}
          formatter={(v, n) => [`${v}%`, n]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
