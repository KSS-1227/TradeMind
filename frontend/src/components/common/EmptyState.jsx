import React from "react";
import { Search } from "lucide-react";

export function EmptyState({ title = "No data found", description = "Try searching for a different stock symbol or filter.", icon: Icon = Search }) {
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderRadius: "12px",
        margin: "16px 0",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--bg-raised)",
          border: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          color: "var(--text-muted)",
        }}
      >
        <Icon size={24} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 360, margin: "0 auto" }}>
        {description}
      </div>
    </div>
  );
}
