import React from "react";
import { motion } from "framer-motion";
import { Cpu } from "lucide-react";

const STATE_CONFIG = {
  ready: { label: "AI Ready", color: "var(--color-teal)", pulse: false },
  analyzing: { label: "Analyzing…", color: "var(--accent-purple)", pulse: true },
  loading: { label: "Loading…", color: "var(--warning)", pulse: true },
  offline: { label: "AI Offline", color: "var(--danger)", pulse: false },
};

export function AIStatus({ state = "ready" }) {
  const config = STATE_CONFIG[state] ?? STATE_CONFIG.ready;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: "var(--radius-pill)",
        background: `${config.color}14`,
        border: `1px solid ${config.color}30`,
      }}
      aria-label={`AI status: ${config.label}`}
    >
      <motion.div
        animate={
          config.pulse
            ? { opacity: [1, 0.4, 1], scale: [1, 0.85, 1] }
            : { opacity: 1, scale: 1 }
        }
        transition={config.pulse ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
      >
        <Cpu size={12} style={{ color: config.color, display: "block" }} />
      </motion.div>
      <span style={{ fontSize: 11, fontWeight: 600, color: config.color, whiteSpace: "nowrap" }}>
        {config.label}
      </span>
    </div>
  );
}
