import React from "react";
import { motion } from "framer-motion";

/* Base Card with Motion Hover Lift */
export function Card({
  children,
  variant = "default", // default | glass | dashboard | chart | action | feature
  className = "",
  style = {},
  onClick,
  hoverLift = true,
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case "glass":
        return {
          background: "var(--bg-glass)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "var(--shadow-glass)",
        };
      case "dashboard":
        return {
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-md)",
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
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-hover)",
          borderRadius: "var(--radius-card)",
          cursor: "pointer",
        };
      case "feature":
        return {
          background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)",
          border: "1px solid var(--border-hover)",
          borderRadius: "var(--radius-card)",
        };
      case "default":
      default:
        return {
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
        };
    }
  };

  const baseStyle = {
    padding: "20px",
    transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
    cursor: onClick || variant === "action" ? "pointer" : "default",
    ...getVariantStyles(),
    ...style,
  };

  return (
    <motion.div
      style={baseStyle}
      whileHover={hoverLift && (onClick || variant === "action" || variant === "feature") ? { y: -3, transition: { duration: 0.15 } } : undefined}
      whileTap={onClick || variant === "action" ? { scale: 0.99 } : undefined}
      className={`ui-card card-${variant} ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* Glass Card */
export function GlassCard(props) {
  return <Card variant="glass" {...props} />;
}

/* Dashboard Card */
export function DashboardCard(props) {
  return <Card variant="dashboard" {...props} />;
}

/* Chart Card */
export function ChartCard(props) {
  return <Card variant="chart" {...props} />;
}

/* Action Card */
export function ActionCard(props) {
  return <Card variant="action" {...props} />;
}

/* Feature Card */
export function FeatureCard(props) {
  return <Card variant="feature" {...props} />;
}

/* Metric Card (Phase 8 Requirement) */
export function MetricCard({ label, value, sub, color = "var(--color-teal)", trend }) {
  return (
    <Card style={{ padding: "16px 14px", textAlign: "center" }}>
      <div className="typo-mono" style={{ fontSize: "22px", fontWeight: 700, color, marginBottom: "4px" }}>
        {value}
      </div>
      <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 600 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: "9.5px", color: "var(--text-secondary)", marginTop: "3px" }}>
          {sub}
        </div>
      )}
    </Card>
  );
}

export default Card;
