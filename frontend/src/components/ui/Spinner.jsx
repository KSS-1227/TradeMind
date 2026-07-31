import React from "react";

export function Spinner({ size = 24, color = "var(--color-teal)" }) {
  return (
    <div
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2.5px solid ${color}`,
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
      role="status"
      aria-label="Loading..."
    >
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
