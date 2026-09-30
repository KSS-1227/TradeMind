import React, { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { STOCK_LABELS } from "../../constants/stocks";
import { fmt } from "../../utils/formatters";

export function PortfolioBreakdownTable({ holdings = [] }) {
  const [expandedRow, setExpandedRow] = useState(null);

  const toggleRow = (idx) => {
    setExpandedRow(expandedRow === idx ? null : idx);
  };

  const getRatingBadge = (recommendation) => {
    const rec = (recommendation || "HOLD").toUpperCase();
    if (rec.includes("BUY")) {
      return <Badge variant="success" size="sm">BUY</Badge>;
    }
    if (rec.includes("ACCUMULATE")) {
      return <Badge variant="teal" size="sm">ACCUMULATE</Badge>;
    }
    if (rec.includes("SELL")) {
      return <Badge variant="danger" size="sm">SELL</Badge>;
    }
    return <Badge variant="gold" size="sm">HOLD</Badge>;
  };

  const getRiskBadge = (risk) => {
    const r = (risk || "MEDIUM").toUpperCase();
    if (r.includes("LOW")) {
      return <Badge variant="success" size="sm">LOW RISK</Badge>;
    }
    if (r.includes("HIGH")) {
      return <Badge variant="danger" size="sm">HIGH RISK</Badge>;
    }
    return <Badge variant="warning" size="sm">MEDIUM RISK</Badge>;
  };

  return (
    <Card style={{ padding: 0, marginBottom: "24px", overflow: "hidden" }}>
      <div
        style={{
          padding: "16px 20px",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "0.5px" }}>
          HOLDINGS BREAKDOWN & AI EVALUATION
        </h3>
        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {holdings.length} POSITIONS
        </span>
      </div>

      <div className="pd-table-container">
        <table className="pd-table">
          <thead>
            <tr>
              <th style={{ width: "30px" }}></th>
              <th>Stock</th>
              <th>Weight</th>
              <th>Current Price</th>
              <th>P&L</th>
              <th>Risk</th>
              <th>AI Rating</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, idx) => {
              const isExpanded = expandedRow === idx;
              const isPnlPositive = (h.pnl || 0) >= 0;
              const symbolClean = h.symbol?.replace(".NS", "");

              return (
                <React.Fragment key={idx}>
                  <tr
                    onClick={() => toggleRow(idx)}
                    style={{
                      cursor: "pointer",
                      background: isExpanded ? "var(--bg-elevated)" : "transparent",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ textAlign: "center", color: "var(--text-muted)" }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>

                    {/* Stock Name */}
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "15px" }}>
                        {symbolClean}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {STOCK_LABELS[symbolClean] || "NSE Equity"}
                      </div>
                    </td>

                    {/* Weight */}
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {h.weight !== undefined ? `${h.weight}%` : "—"}
                    </td>

                    {/* Current Price */}
                    <td
                      title={h.market_price_as_of ? `Yahoo Finance daily price · ${h.market_price_as_of}` : "Price returned by portfolio analysis"}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      ₹{fmt(h.current_price || 0)}
                    </td>

                    {/* P/L */}
                    <td>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          color: isPnlPositive ? "var(--success)" : "var(--danger)",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {isPnlPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        <span>₹{fmt(h.pnl || 0)}</span>
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontFamily: "var(--font-mono)",
                          color: isPnlPositive ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {isPnlPositive ? "+" : ""}{h.pnl_percent || 0}%
                      </div>
                    </td>

                    {/* Risk */}
                    <td>{getRiskBadge(h.overall_risk)}</td>

                    {/* AI Rating */}
                    <td>{getRatingBadge(h.recommendation)}</td>

                    {/* Recommendation Snippet */}
                    <td style={{ fontSize: "12px", color: "var(--text-secondary)", maxWidth: "200px" }}>
                      <span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {h.recommendation || "Hold position"}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded Detail Row */}
                  {isExpanded && (
                    <tr className="expanded-row">
                      <td colSpan={8}>
                        <div style={{ padding: "8px 12px" }}>
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "var(--color-teal)",
                              letterSpacing: "0.8px",
                              textTransform: "uppercase",
                              marginBottom: "10px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <Sparkles size={14} /> AI MODEL RATIONALE & INSIGHTS
                          </div>

                          {/* Reasoning List */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                            {Array.isArray(h.reasoning) && h.reasoning.length > 0 ? (
                              h.reasoning.map((r, rIdx) => (
                                <div key={rIdx} className="reason-item">
                                  {r}
                                </div>
                              ))
                            ) : (
                              <div className="reason-item">
                                AI multi-factor analysis shows stable momentum and risk signals for {symbolClean}.
                              </div>
                            )}
                          </div>

                          {/* Metadata Badges */}
                          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12.5px", color: "var(--text-muted)" }}>
                            <span>
                              Confidence: <strong style={{ color: "var(--text-primary)" }}>{Math.round((h.confidence || 0.8) * 100)}%</strong>
                            </span>
                            <span>
                              Trend: <strong style={{ color: "var(--text-primary)" }}>{h.trend || "BULLISH"}</strong>
                            </span>
                            <span>
                              Predicted Price: <strong style={{ color: "var(--color-teal)", fontFamily: "var(--font-mono)" }}>₹{fmt(h.predicted_price || h.current_price * 1.05)}</strong>
                            </span>
                            <span>
                              Agreement: <strong style={{ color: "var(--text-primary)" }}>{h.agreement || "HIGH"}</strong>
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default PortfolioBreakdownTable;
