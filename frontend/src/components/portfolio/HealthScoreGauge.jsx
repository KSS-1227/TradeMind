import React from "react";
import CountUp from "react-countup";
import { motion } from "framer-motion";
import { ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

export function HealthScoreGauge({ score = 78, isMobile }) {
  const normalizedScore = Math.min(Math.max(Math.round(score), 0), 100);

  // SVG Gauge Math
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  const getScoreDetails = (s) => {
    if (s >= 80) {
      return {
        label: "EXCELLENT",
        color: "var(--color-teal, #00C9A7)",
        bg: "rgba(0, 201, 167, 0.12)",
        border: "rgba(0, 201, 167, 0.3)",
        desc: "Optimal risk-reward balance with strong diversification.",
        icon: ShieldCheck,
      };
    }
    if (s >= 65) {
      return {
        label: "HEALTHY",
        color: "var(--success, #10B981)",
        bg: "rgba(16, 185, 129, 0.12)",
        border: "rgba(16, 185, 129, 0.3)",
        desc: "Solid allocation profile with minor tuning opportunities.",
        icon: CheckCircle2,
      };
    }
    if (s >= 50) {
      return {
        label: "MODERATE",
        color: "var(--color-gold, #F6C90E)",
        bg: "rgba(246, 201, 14, 0.12)",
        border: "rgba(246, 201, 14, 0.3)",
        desc: "Average balance; concentration risk identified.",
        icon: AlertCircle,
      };
    }
    return {
      label: "AT RISK",
      color: "var(--danger, #EF4444)",
      bg: "rgba(239, 68, 68, 0.12)",
      border: "rgba(239, 68, 68, 0.3)",
      desc: "High risk exposures detected. Rebalancing recommended.",
      icon: AlertCircle,
    };
  };

  const details = getScoreDetails(normalizedScore);
  const IconComponent = details.icon;

  return (
    <div className="pd-score-card">
      <div style={{ position: "relative", width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: "rotate(-90deg)" }}>
          {/* Background Track Circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="var(--bg-elevated, #18243C)"
            strokeWidth="12"
            fill="transparent"
          />
          {/* Animated Animated Score Ring */}
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            stroke={details.color}
            strokeWidth="12"
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        {/* Center Display */}
        <div style={{ position: "absolute", textAlign: "center" }}>
          <div style={{ fontSize: "36px", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>
            <CountUp end={normalizedScore} duration={1.5} />
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.5px", fontWeight: 600, marginTop: "4px" }}>
            OUT OF 100
          </div>
        </div>
      </div>

      <div style={{ marginTop: "16px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            borderRadius: "var(--radius-pill)",
            background: details.bg,
            border: `1px solid ${details.border}`,
            color: details.color,
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.8px",
            marginBottom: "8px",
          }}
        >
          <IconComponent size={14} />
          <span>HEALTH: {details.label}</span>
        </div>

        <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, maxWidth: "260px" }}>
          {details.desc}
        </p>
      </div>
    </div>
  );
}

export default HealthScoreGauge;
