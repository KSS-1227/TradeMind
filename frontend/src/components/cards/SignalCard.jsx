import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Tabs } from "../ui/Tabs";
import { MetricCard } from "../ui/MetricCard";
import { PriceAreaChart } from "../charts/PriceAreaChart";
import { parseConf } from "../../utils/formatters";
import { fetchStockPrices } from "../../services/marketService";
import { SIGNAL_COLORS } from "../../constants/stocks";
import { Sparkles, Brain, AlertTriangle, Activity } from "lucide-react";

export function SignalCard({ signal, isMobile }) {
  const [tab, setTab] = useState("signal");
  const [prices, setPrices] = useState([]);

  const sigColor = SIGNAL_COLORS[signal.signal] || SIGNAL_COLORS.HOLD;
  const conf = parseConf(signal.confidence);

  useEffect(() => {
    let isMounted = true;
    const sym = signal.symbol?.replace(".NS", "") || "";
    if (sym) {
      fetchStockPrices(sym)
        .then((r) => {
          const d = r.data || r;
          if (isMounted) setPrices(Array.isArray(d) ? d : []);
        })
        .catch(() => {});
    }
    return () => { isMounted = false; };
  }, [signal.symbol]);

  const tabsConfig = [
    { id: "signal",    label: "SHAP Explanation" },
    { id: "chart",     label: "Price Chart"       },
    { id: "sentiment", label: "Sentiment"         },
  ];

  const signalColors = {
    BUY:       { ring: "rgba(16,185,129,0.25)", glow: "rgba(16,185,129,0.08)" },
    SELL:      { ring: "rgba(239,68,68,0.25)",  glow: "rgba(239,68,68,0.08)" },
    HOLD:      { ring: "rgba(245,158,11,0.25)", glow: "rgba(245,158,11,0.08)" },
    ACCUMULATE:{ ring: "rgba(0,201,167,0.25)",  glow: "rgba(0,201,167,0.08)" },
  };
  const sc = signalColors[signal.signal?.toUpperCase()] || signalColors.HOLD;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="animate-up"
    >
      {/* ── Signal Header Card ── */}
      <Card
        style={{
          marginBottom: "14px",
          borderColor: sc.ring,
          background: `linear-gradient(135deg, var(--bg-surface) 0%, ${sc.glow} 100%)`,
        }}
        hoverLift={false}
      >
        <div className="signal-header">
          {/* Left: price block */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "1px",
                color: "var(--text-muted)",
                marginBottom: 6,
                padding: "2px 8px",
                background: "var(--bg-elevated)",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--border)",
              }}
            >
              <Activity size={10} />
              {signal.symbol?.replace(".NS", "")} · NSE INDIA
            </div>

            <div
              className="mono"
              style={{
                fontSize: isMobile ? 26 : 36,
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                marginBottom: 4,
              }}
            >
              ₹{signal.price?.toLocaleString("en-IN") ?? signal.price}
            </div>

            <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {signal.timestamp}
            </div>
          </div>

          {/* Right: signal badge + confidence ring */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isMobile ? "flex-start" : "flex-end",
              gap: 8,
            }}
          >
            <Badge signal={signal.signal} size="lg" />

            <div style={{ textAlign: isMobile ? "left" : "right" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600, letterSpacing: "0.5px" }}>
                AI CONFIDENCE
              </div>

              {/* Confidence progress bar */}
              <div
                style={{
                  width: 100,
                  height: 5,
                  background: "var(--bg-elevated)",
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${conf}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  style={{
                    height: "100%",
                    background: sigColor.bg,
                    borderRadius: 99,
                  }}
                />
              </div>

              <div
                className="mono"
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: sigColor.bg,
                  marginTop: 3,
                }}
              >
                {conf}%
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Risk Metrics ── */}
      <div className="grid-3" style={{ marginBottom: "14px" }}>
        <MetricCard
          label="Sharpe Ratio"
          value={signal.risk?.sharpe || "—"}
          color="var(--color-teal)"
          sub="Risk-adjusted return"
        />
        <MetricCard
          label="Max Drawdown"
          value={signal.risk?.drawdown || "—"}
          color="var(--danger)"
          sub="Peak-to-trough"
        />
        <MetricCard
          label="VaR 95%"
          value={signal.risk?.var || "—"}
          color="var(--color-gold)"
          sub="Value at Risk"
        />
      </div>

      {/* ── Navigation Tabs ── */}
      <Tabs tabs={tabsConfig} activeTab={tab} onChange={setTab} />

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">

        {/* Tab 1: SHAP Explainability */}
        {tab === "signal" && (
          <motion.div
            key="signal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card hoverLift={false}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-teal)",
                  marginBottom: 14,
                  letterSpacing: "0.6px",
                }}
              >
                <Brain size={14} />
                SHAP FEATURE IMPORTANCE EXPLANATION
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {signal.reasons?.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    className="reason-item"
                    style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--accent-cyan)",
                        minWidth: 18,
                        paddingTop: 1,
                      }}
                    >
                      {i + 1}.
                    </span>
                    <span>{r}</span>
                  </motion.div>
                ))}
              </div>

              {signal.risk?.note && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 14px",
                    background: "var(--color-gold-bg)",
                    border: "1px solid var(--color-gold-border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 12.5,
                    color: "var(--color-gold)",
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {signal.risk.note}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Tab 2: Price Chart */}
        {tab === "chart" && (
          <motion.div
            key="chart"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card hoverLift={false}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                  {signal.symbol?.replace(".NS", "")} · PRICE HISTORY (90 DAYS)
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--color-teal)",
                    background: "var(--color-teal-bg)",
                    border: "1px solid var(--color-teal-border)",
                    borderRadius: "var(--radius-pill)",
                    padding: "2px 8px",
                    fontWeight: 700,
                  }}
                >
                  ● LIVE
                </span>
              </div>
              <PriceAreaChart prices={prices} isMobile={isMobile} />
            </Card>
          </motion.div>
        )}

        {/* Tab 3: FinBERT Sentiment */}
        {tab === "sentiment" && (
          <motion.div
            key="sentiment"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card hoverLift={false}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-teal)",
                  marginBottom: 16,
                  letterSpacing: "0.6px",
                }}
              >
                <Sparkles size={14} />
                FINBERT NLP SENTIMENT ANALYSIS
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                {Object.entries(signal.sentiment?.scores || {}).map(([k, v]) => {
                  const colorMap = {
                    positive: "var(--success)",
                    negative: "var(--danger)",
                    neutral:  "var(--warning)",
                  };
                  const color = colorMap[k] || "var(--text-muted)";
                  const pct = Math.round(v * 100);

                  return (
                    <div
                      key={k}
                      style={{
                        flex: 1,
                        background: "var(--bg-elevated)",
                        borderRadius: "var(--radius-md)",
                        padding: "14px 10px",
                        textAlign: "center",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="mono"
                        style={{
                          fontSize: isMobile ? 20 : 28,
                          fontWeight: 800,
                          color,
                          lineHeight: 1.1,
                        }}
                      >
                        {pct}%
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-muted)",
                          marginTop: 4,
                          textTransform: "capitalize",
                          fontWeight: 600,
                          letterSpacing: "0.4px",
                        }}
                      >
                        {k}
                      </div>
                      <div
                        style={{
                          height: 4,
                          background: "var(--bg-surface)",
                          borderRadius: 99,
                          marginTop: 10,
                          overflow: "hidden",
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          style={{ height: "100%", background: color, borderRadius: 99 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
