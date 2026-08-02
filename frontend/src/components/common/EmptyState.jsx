import React from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

export function EmptyState({
  title = "No data found",
  description = "Try searching for a different stock symbol or adjust your filters.",
  icon: Icon = Search,
  action,
}) {
  return (
    <motion.div
      role="region"
      aria-label={title}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: "64px 32px",
        textAlign: "center",
        background: "linear-gradient(160deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        margin: "16px 0",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle ambient radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,201,167,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Animated icon container */}
      <div
        className="empty-state-icon"
        aria-hidden="true"
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)",
          border: "1px solid var(--border-hover)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          color: "var(--text-muted)",
          position: "relative",
          boxShadow: "0 0 0 8px rgba(255,255,255,0.02)",
        }}
      >
        {/* Outer glow ring */}
        <div
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            opacity: 0.35,
          }}
        />
        <Icon size={26} />
      </div>

      <h3
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 8,
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: 13.5,
          color: "var(--text-secondary)",
          maxWidth: 380,
          margin: "0 auto",
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>

      {action && (
        <div style={{ marginTop: 24 }}>
          {action}
        </div>
      )}
    </motion.div>
  );
}

export default EmptyState;
