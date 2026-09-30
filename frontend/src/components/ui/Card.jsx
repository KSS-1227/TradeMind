import React from "react";
import { motion } from "framer-motion";

/* ── Base Card ── */
export function Card({
  children,
  variant = "default",  // default | glass | dashboard | chart | action | feature
  className = "",
  style = {},
  onClick,
  hoverLift = true,
  accent,               // optional accent colour string e.g. "var(--color-teal)"
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case "glass":
        return {
          background: "var(--bg-glass)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.07)",
          boxShadow: "var(--shadow-glass), inset 0 1px 0 rgba(255,255,255,0.06)",
        };
      case "dashboard":
        return {
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-card)",
        };
      case "chart":
        return {
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          padding: "20px",
        };
      case "action":
        return {
          background: "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)",
          border: "1px solid var(--border-hover)",
          borderRadius: "var(--radius-card)",
          cursor: "pointer",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        };
      case "feature":
        return {
          background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)",
          border: "1px solid var(--border-hover)",
          borderRadius: "var(--radius-card)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
        };
      case "default":
      default:
        return {
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-card)",
        };
    }
  };

  const isInteractive = onClick || variant === "action" || variant === "feature";

  const baseStyle = {
    padding: "20px",
    transition: "border-color 0.22s ease, box-shadow 0.22s ease, transform 0.18s ease",
    cursor: isInteractive ? "pointer" : "default",
    position: "relative",
    overflow: "hidden",
    ...getVariantStyles(),
    ...style,
  };

  return (
    <motion.div
      style={baseStyle}
      whileHover={
        hoverLift && isInteractive
          ? { y: -3, boxShadow: "var(--shadow-hover)", borderColor: "var(--border-hover)", transition: { duration: 0.18 } }
          : hoverLift
          ? { borderColor: "var(--border-hover)", transition: { duration: 0.18 } }
          : undefined
      }
      whileTap={isInteractive ? { scale: 0.99 } : undefined}
      className={`ui-card card-${variant} ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {/* Optional left accent border */}
      {accent && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: 3,
            background: accent,
            borderRadius: "var(--radius-card) 0 0 var(--radius-card)",
            opacity: 0.8,
          }}
        />
      )}
      {children}
    </motion.div>
  );
}

/* ── Convenience exports ── */
export function GlassCard(props)     { return <Card variant="glass"     {...props} />; }
export function DashboardCard(props) { return <Card variant="dashboard" {...props} />; }
export function ChartCard(props)     { return <Card variant="chart"     {...props} />; }
export function ActionCard(props)    { return <Card variant="action"    {...props} />; }
export function FeatureCard(props)   { return <Card variant="feature"   {...props} />; }

/* ── MetricCard (re-exported from Card for ergonomics) ── */
export function MetricCard({ label, value, sub, color = "var(--color-teal)", trend, tooltip }) {
  return (
    <Card style={{ padding: "14px 12px", textAlign: "center", minHeight: "110px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: color,
          opacity: 0.65,
          borderRadius: "var(--radius-card) var(--radius-card) 0 0",
        }}
      />

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

      {/* Tooltip icon */}
      {tooltip && (
        <div
          title={tooltip}
          style={{
            position: "absolute",
            top: 8,
            right: trend ? 22 : 8,
            fontSize: 11,
            color: "var(--text-muted)",
            cursor: "help",
            lineHeight: 1,
          }}
        >
          ⓘ
        </div>
      )}

      <div
        className="typo-mono"
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color,
          marginBottom: "3px",
          marginTop: 4,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      {sub && (
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.3 }}>
          {sub}
        </div>
      )}
    </Card>
  );
}

export default Card;
