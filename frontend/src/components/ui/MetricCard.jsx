import React from "react";
import { motion } from "framer-motion";

export function MetricCard({
  label,
  value,
  sub,
  color = "var(--color-teal)",
  trend,         // optional: 'up' | 'down' | null
  highlight = false,
}) {
  return (
    <motion.div
      className="metric-card"
      whileHover={{ y: -2, borderColor: "var(--border-hover)" }}
      transition={{ duration: 0.15 }}
      style={{
        background: highlight
          ? "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)"
          : "var(--bg-surface)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle top colour accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: color,
          opacity: 0.6,
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        }}
      />

      <div className="metric-value" style={{ color, marginTop: 8 }}>
        {value}
      </div>

      <div className="metric-label">{label}</div>

      {sub && (
        <div
          style={{
            fontSize: "9.5px",
            color: "var(--text-muted)",
            marginTop: "3px",
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      )}

      {trend && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 10,
            fontWeight: 700,
            color: trend === "up" ? "var(--success)" : "var(--danger)",
          }}
        >
          {trend === "up" ? "▲" : "▼"}
        </div>
      )}
    </motion.div>
  );
}

export default MetricCard;
