import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

/* ─── shared tooltip ─── */
const TT = {
  contentStyle: {
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    fontSize: 11,
    color: "var(--text-primary)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },
};

const lakh = (v) => {
  if (!v && v !== 0) return "—";
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000)  return `₹${(v / 100000).toFixed(2)}L`;
  return `₹${Number(v).toLocaleString("en-IN")}`;
};

/* ─── 1. Growth Timeline (Stacked Area: invested vs gains) ─── */
export function GrowthTimelineChart({ data = [], isMobile }) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--color-teal)"         stopOpacity={0.22} />
            <stop offset="95%" stopColor="var(--color-teal)"         stopOpacity={0}    />
          </linearGradient>
          <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--color-gold, #FBBF24)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--color-gold, #FBBF24)" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
        <XAxis
          dataKey="year"
          tick={{ fill: "var(--text-muted)", fontSize: 10 }}
          tickFormatter={(v) => `Yr ${v}`}
          interval={isMobile ? 4 : 2}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 9 }}
          tickFormatter={lakh}
          width={60}
        />
        <Tooltip
          {...TT}
          formatter={(v, n) => [lakh(v), n === "value" ? "Portfolio Value" : "Invested Capital"]}
          labelFormatter={(l) => `Year ${l}`}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
          formatter={(n) => n === "value" ? "Portfolio Value" : "Invested Capital"}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-teal)"
          strokeWidth={2.5}
          fill="url(#wealthGrad)"
          dot={false}
          activeDot={{ r: 5, fill: "var(--color-teal)" }}
        />
        <Area
          type="monotone"
          dataKey="invested_so_far"
          stroke="var(--color-gold, #FBBF24)"
          strokeWidth={1.5}
          fill="url(#investedGrad)"
          dot={false}
          strokeDasharray="5 4"
          activeDot={{ r: 4, fill: "var(--color-gold, #FBBF24)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ─── 2. Contribution vs Profit Donut ─── */
export function ContributionProfitChart({ invested = 0, gains = 0 }) {
  const data = [
    { name: "Your Contributions", value: invested, fill: "var(--color-gold, #FBBF24)" },
    { name: "Compounded Gains",   value: gains,    fill: "var(--color-teal)"           },
  ];
  const total = invested + gains;
  const gainPct = total > 0 ? ((gains / total) * 100).toFixed(1) : 0;

  const renderLabel = ({ cx, cy }) => (
    <>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="var(--text-primary)" fontSize={18} fontWeight={800}>
        {gainPct}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-muted)" fontSize={11}>
        Compound Growth
      </text>
    </>
  );

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
          labelLine={false}
          label={renderLabel}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          {...TT}
          formatter={(v, n) => [lakh(v), n]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ─── 3. Goal Achievement Bar (yearly value vs goal) ─── */
export function GoalAchievementChart({ data = [], goalAmount = 0, isMobile }) {
  if (!data.length) return null;
  const chartData = data.map((d) => ({
    year: `Y${d.year}`,
    value: d.value,
    pct: goalAmount > 0 ? Math.min((d.value / goalAmount) * 100, 100) : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={isMobile ? 200 : 260}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
        <XAxis
          dataKey="year"
          tick={{ fill: "var(--text-muted)", fontSize: 10 }}
          interval={isMobile ? 4 : 2}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 9 }}
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          domain={[0, 100]}
          width={44}
        />
        <Tooltip
          {...TT}
          formatter={(v, n) => [`${Number(v).toFixed(1)}%`, "Goal Progress"]}
          labelFormatter={(l) => `${l}`}
        />
        <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.pct >= 100
                  ? "var(--color-teal)"
                  : entry.pct >= 75
                  ? "var(--color-gold, #FBBF24)"
                  : "var(--accent-blue)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
