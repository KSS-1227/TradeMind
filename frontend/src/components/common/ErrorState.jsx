import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Hash } from "lucide-react";
import { Button } from "../ui/Button";

export function ErrorState({
  title = "Analysis Encountered an Issue",
  description = "We were unable to complete the analysis. Please check your network connection or try again.",
  code,
  requestId,
  onRetry,
  actionLabel = "Retry Analysis",
  style = {},
}) {
  return (
    <motion.div
      role="alert"
      aria-live="assertive"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: "40px 28px",
        textAlign: "center",
        border: "1px solid var(--danger-border, rgba(239, 68, 68, 0.3))",
        background: "linear-gradient(160deg, rgba(239,68,68,0.05) 0%, var(--bg-surface) 100%)",
        borderRadius: "var(--radius-lg, 16px)",
        maxWidth: "640px",
        margin: "24px auto",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Subtle danger radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(239,68,68,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid var(--danger-border, rgba(239, 68, 68, 0.4))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          color: "var(--danger, #EF4444)",
          position: "relative",
          boxShadow: "0 0 0 8px rgba(239,68,68,0.04)",
        }}
      >
        <AlertTriangle size={28} />
      </div>

      <h3
        style={{
          fontSize: "17px",
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: "8px",
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: "13.5px",
          color: "var(--text-secondary)",
          maxWidth: "460px",
          margin: "0 auto 18px",
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>

      {(code || requestId) && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "12px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "6px 12px",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
            marginBottom: "20px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {code && (
            <span>
              Code: <strong style={{ color: "var(--text-primary)" }}>{code}</strong>
            </span>
          )}
          {requestId && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Hash size={12} color="var(--color-teal)" /> Request ID:{" "}
              <strong style={{ color: "var(--color-teal)" }}>{requestId}</strong>
            </span>
          )}
        </div>
      )}

      {onRetry && (
        <div style={{ marginTop: "8px" }}>
          <Button variant="primary" icon={RefreshCw} onClick={onRetry}>
            {actionLabel}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default ErrorState;
