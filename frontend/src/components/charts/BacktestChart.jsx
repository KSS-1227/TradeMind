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

export function BacktestChart({ portfolioCurve, benchmarkCurve, isMobile, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart>
        <defs>
          <linearGradient id="backtestGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-teal)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--color-teal)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--text-muted)", fontSize: 8 }}
          tickFormatter={(v) => (v && typeof v === "string" ? v.slice(2, 7) : v)}
          interval={isMobile ? 45 : 30}
          allowDuplicatedCategory={false}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 8 }}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          width={42}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            color: "var(--text-primary)",
            fontSize: 11,
          }}
          formatter={(v, n) => [`₹${fmt(v)}`, n]}
        />
        <Area
          data={portfolioCurve}
          type="monotone"
          dataKey="value"
          stroke="var(--color-teal)"
          strokeWidth={2}
          fill="url(#backtestGrad)"
          dot={false}
          name="TradeMind Strategy"
        />
        <Area
          data={benchmarkCurve}
          type="monotone"
          dataKey="value"
          stroke="var(--text-muted)"
          strokeWidth={1.5}
          fill="none"
          dot={false}
          name="Nifty50 Benchmark"
          strokeDasharray="4 4"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
