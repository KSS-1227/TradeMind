import React from "react";
import { CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "../ui/Card";

export function AgentLoader({
  title    = "Analyzing with AI Agents…",
  steps: customSteps,
  step     = 0,
  subtext  = "TradeMind AI models evaluating portfolio health & risk indicators…",
}) {
  const defaultSteps = [
    "Research Agent — fetching price & news data",
    "Signal Agent — running ML ensemble",
    "Explainer Agent — generating SHAP reasons",
  ];

  const stepsList = customSteps || defaultSteps;
  const pct       = Math.round(((step + 1) / stepsList.length) * 100);

  return (
    <Card
      role="status"
      aria-live="polite"
      aria-label="AI analysis in progress"
      style={{
        padding: "24px 24px 20px",
        marginBottom: "20px",
        background: "linear-gradient(135deg, var(--bg-surface) 0%, rgba(0,201,167,0.03) 100%)",
        border: "1px solid var(--color-teal-border)",
        boxShadow: "0 0 0 1px rgba(0,201,167,0.06), var(--shadow-glass)",
        borderRadius: "var(--radius-lg)",
      }}
      hoverLift={false}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          paddingBottom: "14px",
          borderBottom: "1px solid var(--border-subtle, rgba(255,255,255,0.05))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Animated AI icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(0,201,167,0.2) 0%, rgba(0,201,167,0.06) 100%)",
              border: "1px solid var(--color-teal-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-teal)",
              flexShrink: 0,
            }}
          >
            <Sparkles size={17} />
          </motion.div>

          <div>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
                lineHeight: 1.25,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h3>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "3px 0 0" }}>
              {subtext}
            </p>
          </div>
        </div>

        {/* Step counter badge */}
        <div
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            color: "var(--color-teal)",
            background: "var(--color-teal-bg)",
            padding: "4px 10px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--color-teal-border)",
            whiteSpace: "nowrap",
            letterSpacing: "0.4px",
          }}
        >
          {Math.min(step + 1, stepsList.length)} / {stepsList.length}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div
        style={{
          height: 3,
          background: "var(--bg-elevated)",
          borderRadius: 99,
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: "100%",
            background: "linear-gradient(90deg, var(--color-teal) 0%, #38BDF8 100%)",
            borderRadius: 99,
            boxShadow: "0 0 8px rgba(0,201,167,0.5)",
          }}
        />
      </div>

      {/* ── Steps list ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {stepsList.map((s, i) => {
          const isDone   = i < step;
          const isActive = i === step;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.22 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "9px 12px",
                borderRadius: "var(--radius-md)",
                background: isActive
                  ? "rgba(0,201,167,0.07)"
                  : isDone
                  ? "rgba(0,201,167,0.03)"
                  : "transparent",
                border: isActive
                  ? "1px solid var(--color-teal-border)"
                  : "1px solid transparent",
                transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              {/* Status icon */}
              <AnimatePresence mode="wait">
                {isDone ? (
                  <motion.div
                    key="done"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <CheckCircle2 size={17} color="var(--color-teal)" />
                  </motion.div>
                ) : isActive ? (
                  <motion.div
                    key="active"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <Loader2
                      size={17}
                      color="var(--color-teal)"
                      style={{ animation: "premiumSpin 1s linear infinite" }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: "1.5px dashed var(--border-hover)",
                      flexShrink: 0,
                    }}
                  />
                )}
              </AnimatePresence>

              <span
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isDone
                    ? "var(--color-teal)"
                    : isActive
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                  transition: "color 0.2s ease",
                }}
              >
                {s}
              </span>

              {/* Done timestamp placeholder */}
              {isDone && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    color: "var(--color-teal)",
                    fontFamily: "var(--font-mono)",
                    opacity: 0.7,
                  }}
                >
                  ✓
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

export default AgentLoader;
