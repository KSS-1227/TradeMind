import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { Card } from "../ui/Card";

const CHART_COLORS = [
  "#00C9A7", // Teal
  "#3B82F6", // Blue
  "#F6C90E", // Gold
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#10B981", // Green
];

// Common Tooltip Styling matching TradingView / Stripe Dark Aesthetics
const CustomTooltip = ({ active, payload, label, unit = "%" }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div
        style={{
          background: "var(--bg-elevated, #18243C)",
          border: "1px solid var(--border-hover, #334155)",
          borderRadius: "var(--radius-md, 10px)",
          padding: "8px 12px",
          color: "var(--text-primary)",
          fontSize: "13px",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: "2px" }}>{label || data.name || data.payload?.symbol}</div>
        <div style={{ color: data.color || "var(--color-teal)", fontFamily: "var(--font-mono)" }}>
          {data.value}
          {unit}
        </div>
      </div>
    );
  }
  return null;
};

/* 1. Asset Allocation Donut Chart */
export function AssetAllocationChart({ data = [], isMobile, height = 220 }) {
  const chartData = (data || []).map((h) => ({
    name: h.symbol?.replace(".NS", ""),
    value: Math.round(h.weight || 0),
  }));

  return (
    <Card variant="chart" style={{ height: "100%", minHeight: "300px" }}>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "var(--color-teal)",
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          marginBottom: "16px",
        }}
      >
        ASSET ALLOCATION (DONUT)
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={isMobile ? 45 : 55}
            outerRadius={isMobile ? 70 : 85}
            paddingAngle={3}
            label={({ name, value }) => `${name} (${value}%)`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* 2. Sector Allocation Bar Chart */
export function SectorAllocationChart({ data = [], isMobile, height = 220 }) {
  // Derive Sector map
  const sectorMap = {};
  (data || []).forEach((h) => {
    const symbol = (h.symbol || "").toUpperCase();
    let sector = "Other";
    if (symbol.includes("RELIANCE") || symbol.includes("ONGC")) sector = "Energy";
    else if (symbol.includes("TCS") || symbol.includes("INFY") || symbol.includes("WIPRO") || symbol.includes("TECHM")) sector = "IT & Tech";
    else if (symbol.includes("HDFC") || symbol.includes("ICICI") || symbol.includes("SBIN") || symbol.includes("KOTAK")) sector = "Banking & Fin";
    else if (symbol.includes("TATAMOTORS") || symbol.includes("MARUTI") || symbol.includes("M&M")) sector = "Automotive";
    else if (symbol.includes("GC=F") || symbol.includes("GOLD") || symbol.includes("SI=F")) sector = "Commodities";

    sectorMap[sector] = (sectorMap[sector] || 0) + Math.round(h.weight || 0);
  });

  const chartData = Object.keys(sectorMap).map((sector) => ({
    sector,
    weight: sectorMap[sector],
  }));

  return (
    <Card variant="chart" style={{ height: "100%", minHeight: "300px" }}>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "var(--accent-blue)",
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          marginBottom: "16px",
        }}
      >
        SECTOR DIVERSIFICATION
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="sector" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} unit="%" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="weight" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* 3. Risk Distribution Chart */
export function RiskDistributionChart({ data = [], isMobile, height = 220 }) {
  const riskCounts = { Low: 0, Medium: 0, High: 0 };
  (data || []).forEach((h) => {
    const r = (h.overall_risk || "MEDIUM").toUpperCase();
    if (r.includes("LOW")) riskCounts.Low += Math.round(h.weight || 0);
    else if (r.includes("HIGH")) riskCounts.High += Math.round(h.weight || 0);
    else riskCounts.Medium += Math.round(h.weight || 0);
  });

  const chartData = [
    { category: "Low Risk", weight: riskCounts.Low, color: "var(--success)" },
    { category: "Medium Risk", weight: riskCounts.Medium, color: "var(--color-gold)" },
    { category: "High Risk", weight: riskCounts.High, color: "var(--danger)" },
  ];

  return (
    <Card variant="chart" style={{ height: "100%", minHeight: "300px" }}>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "var(--color-gold)",
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          marginBottom: "16px",
        }}
      >
        RISK PROFILE BREAKDOWN
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="category" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} unit="%" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="weight" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function PortfolioHistoryChart({ data = [], quotes = {}, height = 220 }) {
  const histories = (data || []).map((holding) => {
    const symbol = (holding.symbol || "").replace(/\.NS$/i, "").toUpperCase();
    const quoteHistory = quotes[symbol]?.history || [];
    const prices = new Map(quoteHistory
      .filter((point) => point?.date && Number.isFinite(Number(point.price)))
      .map((point) => [point.date, Number(point.price)]));
    return { quantity: Number(holding.quantity) || 0, prices };
  }).filter((holding) => holding.quantity > 0 && holding.prices.size > 0);

  const dates = histories.length
    ? [...histories[0].prices.keys()]
      .filter((date) => histories.every((holding) => holding.prices.has(date)))
      .sort()
    : [];
  const chartData = dates.map((date) => ({
    date,
    value: histories.reduce((total, holding) => total + holding.quantity * holding.prices.get(date), 0),
  }));

  return (
    <Card variant="chart" style={{ height: "100%", minHeight: "300px" }}>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "var(--color-teal)",
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          marginBottom: "16px",
        }}
      >
        3-MONTH HISTORICAL PORTFOLIO VALUE
      </div>
      {chartData.length > 1 ? (
        <>
          <div style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "8px" }}>
            Yahoo Finance daily bars · {histories.length} quoted positions
          </div>
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioHistoryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-teal)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-teal)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} minTickGap={24} />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip unit=" ₹" />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-teal)"
                strokeWidth={2}
                fill="url(#portfolioHistoryGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      ) : (
        <div style={{ minHeight: height, display: "grid", placeItems: "center", color: "var(--text-muted)", fontSize: "14px" }}>
          Historical quotes are not available for these holdings.
        </div>
      )}
    </Card>
  );
}

/* 4. Expected Growth Line / Area Chart (12 Months Trajectory) */
export function ExpectedGrowthChart({ expectedReturnPct = 12.5, initialCapital = 100000, height = 220 }) {
  const monthlyRate = (expectedReturnPct / 100) / 12;
  const chartData = [];

  let currentVal = initialCapital;
  for (let month = 0; month <= 12; month++) {
    chartData.push({
      month: month === 0 ? "Now" : `M${month}`,
      value: Math.round(currentVal),
    });
    currentVal = currentVal * (1 + monthlyRate);
  }

  return (
    <Card variant="chart" style={{ height: "100%", minHeight: "300px" }}>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "var(--color-teal)",
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>PROJECTED 12-MONTH TRAJECTORY</span>
        <span style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: 400 }}>
          Rate: +{expectedReturnPct}% / yr
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-teal)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-teal)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={12}
            tickLine={false}
            tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip unit=" ₹" />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-teal)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#growthGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

const PortfolioDoctorCharts = {
  AssetAllocationChart,
  SectorAllocationChart,
  RiskDistributionChart,
  PortfolioHistoryChart,
  ExpectedGrowthChart,
};

export default PortfolioDoctorCharts;
