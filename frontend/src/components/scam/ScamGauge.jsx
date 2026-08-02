import React from "react";
import CountUp from "react-countup";
import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export function ScamGauge({
  riskScore = 85,
  classification = "CRITICAL SCAM RISK",
  confidence = 94,
  availableModels = ["Rule Engine", "FinBERT", "Pump Detector", "URL Analyzer"],
  latencyMs = 180,
  isMobile,
}) {
  const normalizedScore = Math.min(Math.max(Math.round(riskScore), 0), 100);

  // SVG gauge circle math
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  const getRiskTheme = (score) => {
    if (score >= 70) {
      return {
        color: "var(--danger, #EF4444)",
        bg: "rgba(239, 68, 68, 0.12)",
        border: "rgba(239, 68, 68, 0.4)",
        label: classification || "CRITICAL SCAM RISK",
        icon: ShieldAlert,
        variant: "danger",
        desc: "High probability of illegal pump & dump or financial fraud.",
      };
    }
    if (score >= 40) {
      return {
        color: "var(--warning, #F59E0B)",
        bg: "rgba(245, 158, 11, 0.12)",
        border: "rgba(245, 158, 11, 0.4)",
        label: classification || "SUSPICIOUS TIP",
        icon: AlertTriangle,
        variant: "warning",
        desc: "Contains promotional language or unverified trading signals.",
      };
    }
    return {
      color: "var(--success, #10B981)",
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.4)",
      label: classification || "LOW FRAUD RISK",
      icon: ShieldCheck,
      variant: "success",
      desc: "No aggressive scam keywords or malicious URLs detected.",
    };
  };

  const theme = getRiskTheme(normalizedScore);
  const IconComp = theme.icon;

  return (
    <Card
      style={{
        padding: "24px",
        background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)",
        border: `1px solid ${theme.border}`,
        boxShadow: "var(--shadow-glass)",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "200px 1fr",
          gap: "24px",
          alignItems: "center",
        }}
      >
        {/* Gauge Container */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: "relative", width: 170, height: 170, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: "rotate(-90deg)" }}>
              <circle
                cx="85"
                cy="85"
                r={radius}
                stroke="var(--bg-elevated, #18243C)"
                strokeWidth="14"
                fill="transparent"
              />
              <motion.circle
                cx="85"
                cy="85"
                r={radius}
                stroke={theme.color}
                strokeWidth="14"
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>

            <div style={{ position: "absolute", textAlign: "center" }}>
              <div style={{ fontSize: "38px", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                <CountUp end={normalizedScore} duration={1.5} />
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.8px", fontWeight: 700, marginTop: "4px" }}>
                RISK SCORE
              </div>
            </div>
          </div>

          <div style={{ marginTop: "12px" }}>
            <Badge variant={theme.variant} size="md">
              <IconComp size={14} style={{ marginRight: 4 }} />
              {theme.label}
            </Badge>
          </div>
        </div>

        {/* Audit Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "4px" }}>
              INVESTIGATION SUMMARY
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px 0" }}>
              {theme.label}
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              {theme.desc}
            </p>
          </div>

          {/* Model Stats Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
              padding: "12px 16px",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md, 10px)",
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>CONFIDENCE</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-teal)", fontFamily: "var(--font-mono)" }}>
                <CountUp end={confidence} duration={1.2} />%
              </div>
            </div>

            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>MODELS ACTIVE</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent-blue)", fontFamily: "var(--font-mono)" }}>
                {availableModels.length} Models
              </div>
            </div>

            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>LATENCY</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-gold)", fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", gap: 3 }}>
                <Clock size={12} /> {latencyMs}ms
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ScamGauge;
