import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, Shield, Zap, Link, Activity, Layers, Sparkles, Check } from "lucide-react";
import { Card } from "../ui/Card";

export function InvestigationTimeline({ availableModels = [] }) {
  const steps = [
    { title: "Input Received", desc: "Normalized message text & stripped formatting", icon: FileText, color: "var(--text-muted)" },
    { title: "Rule Engine", desc: "Evaluated 24 deterministic fraud red flags", icon: Shield, color: "var(--danger)" },
    { title: "Pump Detector", desc: "Analyzed upper circuit & target price patterns", icon: Zap, color: "var(--color-gold)" },
    { title: "URL Analysis", desc: "Checked domain reputation & unverified links", icon: Link, color: "var(--accent-blue)" },
    { title: "FinBERT Model", desc: "Ran financial sentiment & urgency classification", icon: Activity, color: "var(--color-teal)" },
    { title: "Risk Fusion", desc: "Aggregated model scores into unified risk index", icon: Layers, color: "var(--accent-purple, #8B5CF6)" },
    { title: "AI Explanation", desc: "Generated human-readable audit summary", icon: Sparkles, color: "var(--color-teal)" },
    { title: "Completed", desc: "Final security report ready", icon: CheckCircle2, color: "var(--success)" },
  ];

  return (
    <Card style={{ marginBottom: "24px", padding: "20px" }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "var(--color-teal)",
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <Layers size={16} /> AI INVESTIGATION AUDIT TRAIL
      </div>

      <div className="sd-timeline">
        {steps.map((step, idx) => {
          const IconComp = step.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.25 }}
              className="sd-timeline-node"
            >
              <div className="sd-timeline-dot">
                <Check size={10} color="var(--color-teal)" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <IconComp size={14} color={step.color} />
                <span style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)" }}>
                  {step.title}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0 22px" }}>
                {step.desc}
              </p>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

export default InvestigationTimeline;
