import React from "react";
import { motion } from "framer-motion";
import { Card } from "../ui/Card";
import { Typography } from "../ui/Typography";
import { Badge } from "../ui/Badge";
import { Icon } from "../ui/Icon";
import { MotionCard } from "../animations/MotionCard";

export function AIInvestmentReport({ report }) {
  // Requirement 8: If ai_report is missing or invalid, hide gracefully without impacting layout
  if (!report || (!report.summary && (!report.strengths || report.strengths.length === 0))) {
    return null;
  }

  // Requirement 10: Check if backend returned deterministic fallback explanation
  const isDeterministic = Boolean(
    report.is_fallback ||
      report.is_deterministic ||
      report.summary?.toLowerCase().includes("deterministic") ||
      (Array.isArray(report.risks) &&
        report.risks.some(
          (r) =>
            typeof r === "string" &&
            (r.toLowerCase().includes("deterministic") ||
              r.toLowerCase().includes("ai explanation service unavailable"))
        ))
  );

  // Requirement 4: Pipeline source tags
  const pipelineModels = [
    "Random Forest",
    "LSTM",
    "FinBERT",
    "Fusion Engine",
    isDeterministic ? "Deterministic Fallback" : "Gemini Explanation",
  ];

  // Requirement 5: Framer Motion animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.08,
      },
    },
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const listItemVariants = {
    hidden: { opacity: 0, x: -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.25, ease: "easeOut" },
    },
  };

  return (
    <Card
      variant="glass"
      style={{
        marginBottom: "28px",
        padding: "24px",
        borderRadius: "var(--radius-lg)",
        background: "linear-gradient(135deg, rgba(14, 21, 37, 0.85) 0%, rgba(24, 36, 60, 0.75) 100%)",
        border: "1px solid rgba(0, 201, 167, 0.2)",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 201, 167, 0.08)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top ambient glow accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: "linear-gradient(90deg, var(--color-teal) 0%, var(--accent-blue) 50%, var(--accent-purple) 100%)",
          opacity: 0.8,
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: "flex", flexDirection: "column", gap: "24px" }}
      >
        {/* ================= HEADER & PIPELINE MODEL TAGS ================= */}
        <motion.div variants={sectionVariants} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(0, 201, 167, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)",
                  border: "1px solid rgba(0, 201, 167, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 12px rgba(0, 201, 167, 0.25)",
                }}
              >
                <Icon name="Bot" color="var(--color-teal)" size={22} />
              </div>

              <div>
                <Typography variant="h2" style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  🤖 AI Investment Report
                </Typography>
                <Typography variant="caption" style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                  Multi-Agent Financial Copilot Engine
                </Typography>
              </div>
            </div>

            {/* Requirement 10: Subtle badge for Deterministic vs AI Generated */}
            {isDeterministic ? (
              <Badge
                variant="HOLD"
                showIcon={false}
                style={{
                  background: "rgba(245, 158, 11, 0.12)",
                  color: "var(--warning)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                }}
              >
                Deterministic Report
              </Badge>
            ) : (
              <Badge variant="AI">AI Generated</Badge>
            )}
          </div>

          {/* Requirement 4: Pipeline source tags */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              background: "rgba(18, 27, 45, 0.6)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <Typography
              variant="caption"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Generated from:
            </Typography>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {pipelineModels.map((model, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 10px",
                    borderRadius: "var(--radius-pill)",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  <Icon name="Check" color="var(--color-teal)" size={13} />
                  <span>{model}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ================= SUMMARY SECTION ================= */}
        {report.summary && (
          <motion.div variants={sectionVariants}>
            <MotionCard
              style={{
                padding: "18px 20px",
                background: "rgba(18, 27, 45, 0.7)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <Icon name="Sparkles" color="var(--color-teal)" size={18} />
                <Typography variant="h3" style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Summary
                </Typography>
              </div>

              <Typography variant="body" style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.65 }}>
                {report.summary}
              </Typography>
            </MotionCard>
          </motion.div>
        )}

        {/* ================= STRENGTHS, RISKS, RECOMMENDATIONS GRID ================= */}
        <motion.div
          variants={sectionVariants}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {/* STRENGTHS */}
          {Array.isArray(report.strengths) && report.strengths.length > 0 && (
            <MotionCard
              style={{
                padding: "18px",
                background: "rgba(16, 185, 129, 0.04)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name="CheckCircle2" color="var(--success)" size={18} />
                <Typography variant="h3" style={{ fontSize: "15px", fontWeight: 700, color: "var(--success)", margin: 0 }}>
                  Strengths
                </Typography>
              </div>

              <motion.div variants={listContainerVariants} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {report.strengths.map((item, idx) => (
                  <motion.div
                    key={idx}
                    variants={listItemVariants}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      fontSize: "13px",
                      color: "var(--text-primary)",
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: "var(--success)", fontWeight: 800, flexShrink: 0, marginTop: "1px" }}>✓</span>
                    <span>{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </MotionCard>
          )}

          {/* RISKS */}
          {Array.isArray(report.risks) && report.risks.length > 0 && (
            <MotionCard
              style={{
                padding: "18px",
                background: "rgba(245, 158, 11, 0.04)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name="AlertTriangle" color="var(--warning)" size={18} />
                <Typography variant="h3" style={{ fontSize: "15px", fontWeight: 700, color: "var(--warning)", margin: 0 }}>
                  Risks
                </Typography>
              </div>

              <motion.div variants={listContainerVariants} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {report.risks.map((item, idx) => (
                  <motion.div
                    key={idx}
                    variants={listItemVariants}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      fontSize: "13px",
                      color: "var(--text-primary)",
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: "var(--warning)", fontWeight: 800, flexShrink: 0, marginTop: "1px" }}>⚠</span>
                    <span>{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </MotionCard>
          )}

          {/* RECOMMENDATIONS */}
          {Array.isArray(report.recommendations) && report.recommendations.length > 0 && (
            <MotionCard
              style={{
                padding: "18px",
                background: "rgba(0, 201, 167, 0.04)",
                border: "1px solid rgba(0, 201, 167, 0.2)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name="ArrowRight" color="var(--color-teal)" size={18} />
                <Typography variant="h3" style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-teal)", margin: 0 }}>
                  Recommendations
                </Typography>
              </div>

              <motion.div variants={listContainerVariants} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {report.recommendations.map((item, idx) => (
                  <motion.div
                    key={idx}
                    variants={listItemVariants}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      fontSize: "13px",
                      color: "var(--text-primary)",
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: "var(--color-teal)", fontWeight: 800, flexShrink: 0, marginTop: "1px" }}>→</span>
                    <span>{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </MotionCard>
          )}
        </motion.div>

        {/* ================= MARKET OUTLOOK & CONFIDENCE NOTE GRID ================= */}
        {(report.outlook || report.confidence_note) && (
          <motion.div
            variants={sectionVariants}
            style={{
              display: "grid",
              gridTemplateColumns:
                report.outlook && report.confidence_note ? "repeat(auto-fit, minmax(300px, 1fr))" : "1fr",
              gap: "16px",
            }}
          >
            {report.outlook && (
              <MotionCard
                style={{
                  padding: "18px",
                  background: "rgba(59, 130, 246, 0.04)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <Icon name="TrendingUp" color="var(--accent-blue)" size={18} />
                  <Typography variant="h3" style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-blue)", margin: 0 }}>
                    Market Outlook
                  </Typography>
                </div>

                <Typography variant="body" style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.6 }}>
                  {report.outlook}
                </Typography>
              </MotionCard>
            )}

            {report.confidence_note && (
              <MotionCard
                style={{
                  padding: "18px",
                  background: "rgba(139, 92, 246, 0.04)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <Icon name="ShieldCheck" color="var(--accent-purple)" size={18} />
                  <Typography variant="h3" style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-purple)", margin: 0 }}>
                    Confidence Note
                  </Typography>
                </div>

                <Typography variant="body" style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.6 }}>
                  {report.confidence_note}
                </Typography>
              </MotionCard>
            )}
          </motion.div>
        )}
      </motion.div>
    </Card>
  );
}

export default AIInvestmentReport;
