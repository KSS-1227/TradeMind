import React from "react";
import { Badge } from "../ui/Badge";
import { fmt } from "../../utils/formatters";

export function AllocationRow({ alloc }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.5fr 56px 90px 72px 72px",
        alignItems: "center",
        gap: "8px",
        padding: "10px 12px",
        borderRadius: "8px",
        background: "var(--bg-raised)",
        marginBottom: "6px",
        fontSize: "12.5px",
      }}
    >
      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
        {alloc.symbol}
      </span>
      <span className="mono" style={{ color: "var(--color-teal)" }}>
        {alloc.weight}%
      </span>
      <span className="mono" style={{ color: "var(--text-primary)", fontSize: "11px" }}>
        ₹{fmt(alloc.amount)}
      </span>
      <Badge signal={alloc.signal} />
      <span className="mono" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
        {alloc.confidence ? `${alloc.confidence}%` : "—"}
      </span>
    </div>
  );
}
