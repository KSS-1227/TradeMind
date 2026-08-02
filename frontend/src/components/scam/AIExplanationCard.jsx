import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Bot, CheckCircle2, ShieldAlert } from "lucide-react";

export function AIExplanationCard({ explanation }) {
  if (!explanation) return null;

  const { summary = "", reasoning = [], recommendation = "" } = explanation;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <Sparkles size={18} color="var(--color-teal)" />
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          AI SECURITY ASSISTANT INVESTIGATION
        </h3>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="sd-ai-card"
      >
        {/* Assistant Header */}
        <motion.div variants={itemVariants} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(0, 201, 167, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)",
              border: "1px solid rgba(0, 201, 167, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-teal)",
            }}
          >
            <Bot size={18} />
          </div>
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              TradeMind AI Security Copilot
            </h4>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              Multi-model Risk Synthesis • Real-Time Audit
            </span>
          </div>
        </motion.div>

        {/* 1. Summary Section */}
        {summary && (
          <motion.div variants={itemVariants} style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-teal)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "6px" }}>
              EXECUTIVE SUMMARY
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
              {summary}
            </p>
          </motion.div>
        )}

        {/* 2. Reasoning Bullets */}
        {Array.isArray(reasoning) && reasoning.length > 0 && (
          <motion.div variants={itemVariants} style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-blue)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "8px" }}>
              KEY REASONING & EVIDENCE BULLETS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {reasoning.map((r, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "10px 14px",
                    background: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md, 10px)",
                    borderLeft: "3px solid var(--accent-blue)",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  <ShieldAlert size={16} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{r}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 3. Recommendation */}
        {recommendation && (
          <motion.div
            variants={itemVariants}
            style={{
              padding: "14px 16px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--radius-md, 10px)",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--danger)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "4px" }}>
              FINAL AI RECOMMENDATION
            </div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} color="var(--danger)" />
              {recommendation}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default AIExplanationCard;
