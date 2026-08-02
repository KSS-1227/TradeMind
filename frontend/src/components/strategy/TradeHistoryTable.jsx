import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fmt } from "../../utils/formatters";

const DIRECTION_CONFIG = {
  BUY:  { color: "var(--success)",  bg: "var(--success-bg)",  icon: TrendingUp },
  SELL: { color: "var(--danger)",   bg: "var(--danger-bg)",   icon: TrendingDown },
  HOLD: { color: "var(--warning)",  bg: "var(--warning-bg)",  icon: Minus },
};

export function TradeHistoryTable({ trades = [] }) {
  if (!trades || trades.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: 13 }}>
        No trade history available. Run a backtest simulation to populate trades.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="sb-trade-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Action</th>
            <th>Shares</th>
            <th>Entry Price</th>
            <th>Exit Price</th>
            <th>P / L (₹)</th>
            <th>Return %</th>
          </tr>
        </thead>
        <tbody>
          {trades.slice(0, 50).map((t, i) => {
            const cfg = DIRECTION_CONFIG[t.action?.toUpperCase()] || DIRECTION_CONFIG.HOLD;
            const IconComp = cfg.icon;
            const pnl = t.pnl ?? 0;
            const ret = t.return_pct ?? null;

            return (
              <motion.tr
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.18 }}
              >
                <td style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {i + 1}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                  {t.date || "—"}
                </td>
                <td>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: "var(--radius-pill)",
                      background: cfg.bg,
                      color: cfg.color,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <IconComp size={11} />
                    {t.action?.toUpperCase() || "—"}
                  </span>
                </td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                  {t.shares ?? "—"}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                  {t.entry_price != null ? `₹${fmt(t.entry_price)}` : "—"}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                  {t.exit_price != null ? `₹${fmt(t.exit_price)}` : "—"}
                </td>
                <td
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    textAlign: "right",
                    color: pnl >= 0 ? "var(--success)" : "var(--danger)",
                  }}
                >
                  {pnl >= 0 ? "+" : ""}₹{fmt(pnl)}
                </td>
                <td
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    textAlign: "right",
                    color: ret != null ? (ret >= 0 ? "var(--success)" : "var(--danger)") : "var(--text-muted)",
                  }}
                >
                  {ret != null ? `${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%` : "—"}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
      {trades.length > 50 && (
        <div style={{ textAlign: "center", padding: "10px", fontSize: 12, color: "var(--text-muted)" }}>
          Showing first 50 of {trades.length} trades
        </div>
      )}
    </div>
  );
}

export default TradeHistoryTable;
