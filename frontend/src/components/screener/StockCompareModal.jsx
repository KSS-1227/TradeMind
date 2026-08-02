import React from "react";
import { motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { STOCK_LABELS } from "../../constants/stocks";
import { fmt } from "../../utils/formatters";

export function StockCompareModal({ selectedStocks = [], onClose, onRemoveStock }) {
  if (!selectedStocks || selectedStocks.length === 0) return null;

  const rows = [
    { label: "Asset Name", key: "symbol", format: (val) => STOCK_LABELS[val] || val },
    { label: "Current Price", key: "current_price", format: (val) => `₹${fmt(val)}` },
    { label: "AI Rating / Signal", key: "recommendation", format: (val) => <Badge signal={val || "HOLD"} /> },
    { label: "Confidence Score", key: "confidence", format: (val) => `${Math.round((val || 0.8) * 100)}%` },
    { label: "Expected Return", key: "expected_return", format: (val) => `+${val || 12.5}%` },
    { label: "12M Target Price", key: "predicted_price", format: (val) => `₹${fmt(val || 3000)}` },
    { label: "Risk Rating", key: "overall_risk", format: (val) => <Badge variant={(val || "MEDIUM").includes("LOW") ? "success" : (val || "").includes("HIGH") ? "danger" : "warning"} size="sm">{val || "MEDIUM"}</Badge> },
    { label: "Technical Trend", key: "trend", format: (val) => val || "BULLISH" },
    { label: "FinBERT Sentiment", key: "sentiment", format: (val) => val || "POSITIVE" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="sc-compare-panel"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={18} color="var(--color-teal)" />
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            SIDE-BY-SIDE STOCK COMPARISON ({selectedStocks.length})
          </h3>
        </div>

        <Button variant="ghost" size="sm" icon={X} onClick={onClose}>
          Close Compare
        </Button>
      </div>

      <div className="pd-table-container">
        <table className="pd-table">
          <thead>
            <tr>
              <th style={{ width: "160px" }}>Metric</th>
              {selectedStocks.map((stock, i) => (
                <th key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{stock.symbol?.replace(".NS", "")}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveStock(stock.symbol)}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                <td style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: "12px" }}>
                  {row.label}
                </td>
                {selectedStocks.map((stock, sIdx) => {
                  const rawVal = stock[row.key];
                  return (
                    <td key={sIdx} style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                      {row.format ? row.format(rawVal, stock) : rawVal}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export default StockCompareModal;
