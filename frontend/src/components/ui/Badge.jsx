import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Radio,
} from "lucide-react";

export const BADGE_VARIANTS = {
  BUY: {
    icon: TrendingUp,
    bg: "var(--success-bg)",
    color: "var(--success)",
    border: "1px solid var(--success-border)",
    label: "BUY",
  },
  SELL: {
    icon: TrendingDown,
    bg: "var(--danger-bg)",
    color: "var(--danger)",
    border: "1px solid var(--danger-border)",
    label: "SELL",
  },
  HOLD: {
    icon: Minus,
    bg: "var(--warning-bg)",
    color: "var(--warning)",
    border: "1px solid var(--warning-border)",
    label: "HOLD",
  },
  HIGH_RISK: {
    icon: ShieldAlert,
    bg: "var(--danger-bg)",
    color: "var(--danger)",
    border: "1px solid var(--danger-border)",
    label: "HIGH RISK",
  },
  LOW_RISK: {
    icon: ShieldCheck,
    bg: "var(--success-bg)",
    color: "var(--success)",
    border: "1px solid var(--success-border)",
    label: "LOW RISK",
  },
  SUCCESS: {
    icon: CheckCircle2,
    bg: "var(--success-bg)",
    color: "var(--success)",
    border: "1px solid var(--success-border)",
    label: "SUCCESS",
  },
  ERROR: {
    icon: AlertCircle,
    bg: "var(--danger-bg)",
    color: "var(--danger)",
    border: "1px solid var(--danger-border)",
    label: "ERROR",
  },
  AI: {
    icon: Sparkles,
    bg: "rgba(139, 92, 246, 0.15)",
    color: "var(--accent-purple)",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    label: "AI INSIGHT",
  },
  LIVE: {
    icon: Radio,
    bg: "rgba(6, 182, 212, 0.15)",
    color: "var(--accent-cyan)",
    border: "1px solid rgba(6, 182, 212, 0.3)",
    label: "LIVE",
    pulse: true,
  },
};

export function Badge({
  variant,
  signal,
  children,
  size = "md", // sm | md | lg
  icon: CustomIcon,
  showIcon = true,
  pulse = false,
  className = "",
  style = {},
  ...props
}) {
  const activeKey = (variant || signal || "HOLD").toUpperCase();
  const config = BADGE_VARIANTS[activeKey] || BADGE_VARIANTS.HOLD;

  const IconComponent = CustomIcon || (showIcon ? config.icon : null);
  const shouldPulse = pulse || config.pulse;

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          padding: "2px 8px",
          fontSize: "10px",
          iconSize: 12,
          gap: "4px",
        };
      case "lg":
        return {
          padding: "6px 14px",
          fontSize: "13px",
          iconSize: 16,
          gap: "8px",
        };
      case "md":
      default:
        return {
          padding: "4px 10px",
          fontSize: "11px",
          iconSize: 14,
          gap: "6px",
        };
    }
  };

  const sizeSpec = getSizeStyles();

  return (
    <span
      className={`ui-badge badge-${activeKey.toLowerCase()} ${className}`.trim()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: sizeSpec.gap,
        padding: sizeSpec.padding,
        fontSize: sizeSpec.fontSize,
        fontWeight: 700,
        fontFamily: "var(--font-sans)",
        letterSpacing: "0.03em",
        borderRadius: "var(--radius-pill)",
        background: config.bg,
        color: config.color,
        border: config.border,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        ...style,
      }}
      {...props}
    >
      {shouldPulse && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: config.color,
            boxShadow: `0 0 8px ${config.color}`,
            display: "inline-block",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
      )}

      {IconComponent && !shouldPulse && (
        <IconComponent size={sizeSpec.iconSize} style={{ flexShrink: 0 }} />
      )}

      {children || config.label}
    </span>
  );
}

export default Badge;
