import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function Button({
  children,
  variant = "primary", // primary | secondary | ghost | danger | success | icon
  size = "md", // sm | md | lg
  loading = false,
  disabled = false,
  onClick,
  className = "",
  type = "button",
  icon: IconComponent,
  iconPosition = "left",
  fullWidth = false,
  style = {},
  ...props
}) {
  const isIconButton = variant === "icon";

  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return {
          background: "var(--bg-elevated)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        };
      case "ghost":
        return {
          background: "transparent",
          color: "var(--text-secondary)",
          border: "1px solid transparent",
        };
      case "danger":
        return {
          background: "var(--danger-bg)",
          color: "var(--danger)",
          border: "1px solid var(--danger-border)",
        };
      case "success":
        return {
          background: "var(--success-bg)",
          color: "var(--success)",
          border: "1px solid var(--success-border)",
        };
      case "icon":
        return {
          background: "var(--bg-surface)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border)",
          padding: "8px",
          borderRadius: "var(--radius-md)",
        };
      case "primary":
      default:
        return {
          background: "var(--color-teal)",
          color: "#04241D",
          border: "1px solid transparent",
        };
    }
  };

  const getSizeStyles = () => {
    if (isIconButton) {
      switch (size) {
        case "sm":
          return { padding: "6px", borderRadius: "var(--radius-sm)" };
        case "lg":
          return { padding: "12px", borderRadius: "var(--radius-md)" };
        case "md":
        default:
          return { padding: "9px", borderRadius: "var(--radius-md)" };
      }
    }

    switch (size) {
      case "sm":
        return { padding: "6px 12px", fontSize: "12px", borderRadius: "var(--radius-sm)" };
      case "lg":
        return { padding: "12px 24px", fontSize: "15px", borderRadius: "var(--radius-md)" };
      case "md":
      default:
        return { padding: "9px 18px", fontSize: "13px", borderRadius: "var(--radius-button)" };
    }
  };

  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontWeight: 700,
    fontFamily: "var(--font-sans)",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : loading ? 0.8 : 1,
    width: fullWidth ? "100%" : "auto",
    boxSizing: "border-box",
    transition: "background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)",
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <motion.button
      type={type}
      style={baseStyle}
      onClick={disabled || loading ? undefined : onClick}
      whileHover={disabled || loading ? undefined : { scale: 1.02 }}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      className={`ui-btn btn-${variant} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === "sm" ? 14 : size === "lg" ? 18 : 16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
      ) : IconComponent && iconPosition === "left" ? (
        <IconComponent size={size === "sm" ? 14 : size === "lg" ? 18 : 16} />
      ) : null}

      {!isIconButton && children}

      {!loading && IconComponent && iconPosition === "right" ? (
        <IconComponent size={size === "sm" ? 14 : size === "lg" ? 18 : 16} />
      ) : null}
    </motion.button>
  );
}

export default Button;
