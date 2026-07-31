import React from "react";

export function MetricCard({ label, value, sub, color = "var(--color-teal)" }) {
  return (
    <div className="metric-card">
      <div className="metric-value" style={{ color }}>
        {value}
      </div>
      <div className="metric-label">{label}</div>
      {sub && (
        <div style={{ fontSize: "9.5px", color: "var(--text-muted)", marginTop: "3px" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
