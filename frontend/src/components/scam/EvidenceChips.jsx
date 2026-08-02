import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, Zap, Link, Activity, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Card } from "../ui/Card";
import { toast } from "sonner";

export function EvidenceChips({ evidence }) {
  if (!evidence) return null;

  const {
    red_flags = [],
    pump_patterns = [],
    url_findings = [],
    sentiment = "unavailable",
    sentiment_summary = "",
  } = evidence;

  // Build array of evidence chips
  const chips = [];

  // 1. Red Flags from Rule Engine
  red_flags.forEach((flag) => {
    let severity = "chip-critical";
    if (flag.toLowerCase().includes("guarantee") || flag.toLowerCase().includes("urgent")) {
      severity = "chip-critical";
    } else if (flag.toLowerCase().includes("emoji") || flag.toLowerCase().includes("target")) {
      severity = "chip-warning";
    }

    chips.push({
      title: flag,
      category: "Rule Engine",
      icon: AlertCircle,
      severity,
      tooltip: `Detected by Rule Engine: "${flag}" pattern found in text.`,
    });
  });

  // 2. Pump & Dump Patterns
  pump_patterns.forEach((pattern) => {
    chips.push({
      title: pattern,
      category: "Pump Detector",
      icon: Zap,
      severity: "chip-critical",
      tooltip: `Pump & Dump Pattern: Artificial price pump indicator "${pattern}".`,
    });
  });

  // 3. URL Findings
  url_findings.forEach((urlFinding) => {
    chips.push({
      title: urlFinding,
      category: "URL Checker",
      icon: Link,
      severity: "chip-warning",
      tooltip: `URL Security Check: ${urlFinding}`,
    });
  });

  // 4. Sentiment Signal
  if (sentiment && sentiment !== "unavailable") {
    chips.push({
      title: `FinBERT Sentiment: ${sentiment.toUpperCase()}`,
      category: "FinBERT ML",
      icon: Activity,
      severity: sentiment.toLowerCase() === "negative" ? "chip-warning" : "chip-info",
      tooltip: sentiment_summary || `FinBERT financial language model classified text sentiment as ${sentiment}.`,
    });
  }

  const handleChipClick = (chip) => {
    toast.info(`${chip.category}: ${chip.tooltip}`);
  };

  return (
    <Card style={{ marginBottom: "24px", padding: "20px" }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "var(--danger)",
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          marginBottom: "14px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <ShieldAlert size={16} /> EVIDENCE & DETECTED FRAUD SIGNALS ({chips.length})
      </div>

      {chips.length === 0 ? (
        <div
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <CheckCircle2 size={16} color="var(--success)" />
          No suspicious red flags or pump patterns identified by detector models.
        </div>
      ) : (
        <div className="sd-chips-grid">
          {chips.map((chip, idx) => {
            const IconComp = chip.icon;
            return (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleChipClick(chip)}
                className={`sd-chip ${chip.severity}`}
                title={chip.tooltip}
              >
                <IconComp size={14} />
                <span>{chip.title}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default EvidenceChips;
