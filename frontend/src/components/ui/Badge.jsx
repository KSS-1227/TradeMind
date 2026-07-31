import React from "react";
import { SIGNAL_COLORS } from "../../constants/stocks";

export function Badge({ signal = "HOLD", children, className = "" }) {
  const config = SIGNAL_COLORS[signal] || SIGNAL_COLORS.HOLD;

  return (
    <span
      className={`sig-badge ${className}`}
      style={{
        background: config.bg,
        color: config.text,
      }}
    >
      {children || signal}
    </span>
  );
}
