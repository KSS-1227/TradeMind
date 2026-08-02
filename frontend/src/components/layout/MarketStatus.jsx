import React, { useMemo } from "react";
import { motion } from "framer-motion";

function getMarketStatus() {
  const now = new Date();
  // IST offset: UTC+5:30
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);
  const day = ist.getDay(); // 0=Sun, 6=Sat
  const h = ist.getHours();
  const m = ist.getMinutes();
  const minutes = h * 60 + m;

  if (day === 0 || day === 6) return "closed";
  if (minutes >= 555 && minutes < 570) return "opening-soon"; // 9:15–9:30
  if (minutes >= 570 && minutes < 930) return "open"; // 9:30–15:30
  return "closed";
}

const STATUS_CONFIG = {
  open: { label: "Market Open", color: "var(--success)", bg: "var(--success-bg)", pulse: true },
  "opening-soon": { label: "Opening Soon", color: "var(--warning)", bg: "var(--warning-bg)", pulse: true },
  closed: { label: "Market Closed", color: "var(--text-muted)", bg: "transparent", pulse: false },
};

export function MarketStatus() {
  const status = useMemo(() => getMarketStatus(), []);
  const config = STATUS_CONFIG[status];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: "var(--radius-pill)",
        background: config.bg,
        border: `1px solid ${config.color}30`,
      }}
      aria-label={`Market status: ${config.label}`}
    >
      <motion.span
        animate={config.pulse ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
        transition={config.pulse ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: config.color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 11, fontWeight: 600, color: config.color, whiteSpace: "nowrap" }}>
        {config.label}
      </span>
    </div>
  );
}
