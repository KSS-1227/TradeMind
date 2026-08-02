import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { fmt } from "../../utils/formatters";

/* ─── Shared Tooltip Style ─── */
const tooltipStyle = {
  contentStyle: {
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    color: "var(--text-primary)",
    fontSize: 11,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },
};

/* ─── 1. Equity Curve vs Benchmark ─── */
export function EquityCurveChart({ portfolioCurve = [], benchmarkCurve = [], isMobile }) {
  // Merge both series on date
  const dataMap = {};

  (portfolioCurve || []).forEach((p) => {
    if (!dataMap[p.date]) dataMap[p.date] = { date: p.date };
    dataMap[p.date].portfolio = p.value;
  });

  (benchmarkCurve || []).forEach((b) => {
    if (!dataMap[b.date]) dataMap[b.date] = { date: b.date };
    dataMap[b.date].benchmark = b.value;
  });

  const merged = Object.values(dataMap).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return (
    <ResponsiveContainer width="100%" height={isMobile ? 240 : 320}>
      <ComposedChart data={merged} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-teal)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--color-teal)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--text-muted)", fontSize: 9 }}
          tickFormatter={(v) => (typeof v === "string" ? v.slice(2, 7) : v)}
          interval={isMobile ? 60 : 30}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 9 }}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          width={44}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(v, n) => [`₹${fmt(v)}`, n === "portfolio" ? "TradeMind Strategy" : "Nifty50 Benchmark"]}
          labelFormatter={(l) => `Date: ${l}`}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(v) => (v === "portfolio" ? "TradeMind Strategy" : "Nifty50 Benchmark")}
        />
        <Area
          type="monotone"
          dataKey="portfolio"
          stroke="var(--color-teal)"
          strokeWidth={2}
          fill="url(#equityGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--color-teal)" }}
        />
        <Area
          type="monotone"
          dataKey="benchmark"
          stroke="var(--text-muted)"
          strokeWidth={1.5}
          fill="none"
          dot={false}
          strokeDasharray="5 4"
          activeDot={{ r: 3, fill: "var(--text-muted)" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ─── 2. Drawdown Chart ─── */
export function DrawdownChart({ portfolioCurve = [], isMobile }) {
  // Compute running drawdown from portfolio curve
  let peak = -Infinity;
  const ddData = (portfolioCurve || []).map((p) => {
    if (p.value > peak) peak = p.value;
    const dd = peak > 0 ? ((p.value - peak) / peak) * 100 : 0;
    return { date: p.date, drawdown: parseFloat(dd.toFixed(2)) };
  });

  return (
    <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
      <AreaChart data={ddData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--text-muted)", fontSize: 9 }}
          tickFormatter={(v) => (typeof v === "string" ? v.slice(2, 7) : v)}
          interval={isMobile ? 60 : 30}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 9 }}
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          width={44}
        />
        <ReferenceLine y={0} stroke="var(--border)" />
        <Tooltip
          {...tooltipStyle}
          formatter={(v) => [`${v}%`, "Drawdown"]}
          labelFormatter={(l) => `Date: ${l}`}
        />
        <Area
          type="monotone"
          dataKey="drawdown"
          stroke="var(--danger)"
          strokeWidth={1.5}
          fill="url(#ddGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ─── 3. Monthly / Annual Returns Bar Chart ─── */
export function AnnualReturnsChart({ trades = [], isMobile }) {
  // Aggregate P/L by year from trade history
  const yearMap = {};
  (trades || []).forEach((t) => {
    if (!t.date) return;
    const yr = String(t.date).slice(0, 4);
    if (!yearMap[yr]) yearMap[yr] = 0;
    yearMap[yr] += t.pnl || 0;
  });

  const data = Object.entries(yearMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, pnl]) => ({ year, pnl: parseFloat(pnl.toFixed(2)) }));

  if (data.length === 0) {
    // Fallback: generate from portfolio curve annually
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "var(--text-muted)", fontSize: 13 }}>
        Annual returns require trade history data.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
        <XAxis dataKey="year" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 9 }}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          width={44}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(v) => [`₹${fmt(v)}`, "Annual P/L"]}
        />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pnl >= 0 ? "var(--color-teal)" : "var(--danger)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
