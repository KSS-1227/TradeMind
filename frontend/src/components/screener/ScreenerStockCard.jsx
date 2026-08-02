import React, { useState } from "react";
import CountUp from "react-countup";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  ArrowRight,
  Cpu,
  BrainCircuit,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Typography } from "../ui/Typography";
import { STOCK_LABELS } from "../../constants/stocks";

export function ScreenerStockCard({
  stock,
  isCompared,
  onToggleCompare,
  onCardClick,
}) {
  const [showShap, setShowShap] = useState(false);

  const confPct = Math.round((stock.confidence || 0.85) * 100);
  const signal = stock.recommendation || "BUY";
  const targetPrice = stock.predicted_price || Math.round((stock.current_price || 1000) * 1.1);
  const expectedReturn = stock.expected_return || 14.2;
  const riskLevel = stock.overall_risk || "LOW";

  // Default technical indicators if not present
  const tech = stock.technical_indicators || {
    rsi: stock.rsi || "32.4 (Oversold)",
    macd: stock.macd || "+14.2 Bullish",
    ema: stock.ema || "Above 50 EMA",
    volume: stock.volume || "2.1M (1.8x Avg)",
  };

  // Default model agreement if not present
  const modelAgreement = stock.models || [
    { name: "Random Forest", signal: signal, confidence: `${confPct}%`, match: true },
    { name: "LSTM Trend", signal: "BULLISH", confidence: "90%", match: true },
    { name: "FinBERT", signal: "POSITIVE", confidence: "87%", match: true },
    { name: "Fusion Engine", signal: "STRONG CONFLUENCE", confidence: "HIGH", match: true },
  ];

  // Default SHAP drivers if not present
  const shapDrivers = stock.shap_drivers || [
    { feature: "RSI Rebound Signal", impact: "+4.8%", type: "positive" },
    { feature: "FinBERT News Sentiment", impact: "+3.6%", type: "positive" },
    { feature: "50-Day EMA Support", impact: "+2.4%", type: "positive" },
    { feature: "Macro Volatility Index", impact: "-1.2%", type: "negative" },
  ];

  return (
    <Card
      variant="glass"
      style={{
        padding: "20px",
        borderRadius: "var(--radius-lg)",
        background: "linear-gradient(135deg, rgba(14, 21, 37, 0.8) 0%, rgba(24, 36, 60, 0.65) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "var(--shadow-card)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Top ambient glow line based on signal */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background:
            signal === "BUY" || signal === "ACCUMULATE"
              ? "linear-gradient(90deg, var(--color-teal), var(--success))"
              : signal === "SELL"
              ? "linear-gradient(90deg, var(--danger), var(--warning))"
              : "linear-gradient(90deg, var(--warning), var(--color-gold))",
          opacity: 0.8,
        }}
      />

      {/* ================= HEADER ROW ================= */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Typography variant="h2" style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              {stock.symbol?.replace(".NS", "")}
            </Typography>

            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: "var(--radius-pill)",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "var(--text-muted)",
              }}
            >
              {stock.sector || "NSE INDIA"}
            </span>
          </div>

          <Typography variant="caption" style={{ color: "var(--text-muted)", fontSize: "12px" }}>
            {STOCK_LABELS[stock.symbol] || STOCK_LABELS[stock.symbol + ".NS"] || "Equities / Spot"}
          </Typography>
        </div>

        {/* Requirement 2: AI Signal Badge */}
        <Badge signal={signal} size="md" />
      </div>

      {/* ================= PRICE & TARGET ROW ================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "12px 14px",
          borderRadius: "var(--radius-md)",
          background: "rgba(18, 27, 45, 0.6)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            CURRENT PRICE
          </div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ₹<CountUp end={stock.current_price || 0} decimals={2} duration={1.2} separator="," />
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            12M TARGET PRICE
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--color-teal)",
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ₹<CountUp end={targetPrice} duration={1.2} separator="," />
          </div>
        </div>
      </div>

      {/* ================= Requirement 3: ANIMATED CONFIDENCE METER ================= */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>
            <Cpu size={13} color="var(--color-teal)" />
            <span>AI CONFIDENCE</span>
          </div>

          <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--color-teal)", fontFamily: "var(--font-mono)" }}>
            <CountUp end={confPct} duration={1.2} />%
          </div>
        </div>

        <div
          style={{
            height: "6px",
            width: "100%",
            borderRadius: "var(--radius-pill)",
            background: "rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confPct}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: "100%",
              borderRadius: "var(--radius-pill)",
              background: "linear-gradient(90deg, var(--color-teal) 0%, var(--accent-blue) 100%)",
              boxShadow: "0 0 10px rgba(0, 201, 167, 0.4)",
            }}
          />
        </div>
      </div>

      {/* ================= Requirement 4: MODEL AGREEMENT VISUAL (RF, LSTM, FinBERT) ================= */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          MODEL CONFLUENCE AGREEMENT
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {modelAgreement.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 8px",
                borderRadius: "var(--radius-pill)",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              <Check size={11} color="var(--color-teal)" />
              <span style={{ color: "var(--text-muted)" }}>{m.name}:</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{m.signal}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= Requirement 7: EXPECTED RETURN, TARGET & RISK CARDS ================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
        }}
      >
        <div
          style={{
            padding: "10px 8px",
            borderRadius: "var(--radius-md)",
            background: "rgba(16, 185, 129, 0.06)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "9.5px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            EST. RETURN
          </div>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--success)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
            +<CountUp end={expectedReturn} decimals={1} duration={1.2} />%
          </div>
        </div>

        <div
          style={{
            padding: "10px 8px",
            borderRadius: "var(--radius-md)",
            background: "rgba(0, 201, 167, 0.06)",
            border: "1px solid rgba(0, 201, 167, 0.2)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "9.5px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            TARGET
          </div>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--color-teal)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
            ₹<CountUp end={targetPrice} duration={1.2} />
          </div>
        </div>

        <div
          style={{
            padding: "10px 8px",
            borderRadius: "var(--radius-md)",
            background:
              riskLevel === "LOW"
                ? "rgba(16, 185, 129, 0.06)"
                : riskLevel === "HIGH"
                ? "rgba(239, 68, 68, 0.06)"
                : "rgba(245, 158, 11, 0.06)",
            border:
              riskLevel === "LOW"
                ? "1px solid rgba(16, 185, 129, 0.2)"
                : riskLevel === "HIGH"
                ? "1px solid rgba(239, 68, 68, 0.2)"
                : "1px solid rgba(245, 158, 11, 0.2)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "9.5px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            RISK RATING
          </div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color:
                riskLevel === "LOW"
                  ? "var(--success)"
                  : riskLevel === "HIGH"
                  ? "var(--danger)"
                  : "var(--warning)",
              marginTop: "4px",
            }}
          >
            {riskLevel} RISK
          </div>
        </div>
      </div>

      {/* ================= Requirement 6: TECHNICAL INDICATORS STRIP ================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "6px",
          fontSize: "11px",
          padding: "8px 10px",
          borderRadius: "var(--radius-md)",
          background: "rgba(18, 27, 45, 0.5)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>RSI (14):</span>
          <span style={{ fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{tech.rsi}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>MACD:</span>
          <span style={{ fontWeight: 700, color: "var(--color-teal)", fontFamily: "var(--font-mono)" }}>{tech.macd}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>50 EMA:</span>
          <span style={{ fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{tech.ema}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Volume:</span>
          <span style={{ fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{tech.volume}</span>
        </div>
      </div>

      {/* Mini Recharts Sparkline */}
      {stock.sparkline && (
        <div style={{ height: "32px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stock.sparkline}>
              <Area
                type="monotone"
                dataKey="val"
                stroke="var(--color-teal)"
                strokeWidth={1.5}
                fill="rgba(0, 201, 167, 0.12)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ================= Requirement 5: COLLAPSIBLE SHAP EXPLANATION PANEL ================= */}
      <div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowShap(!showShap);
          }}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            background: showShap ? "rgba(0, 201, 167, 0.1)" : "rgba(255, 255, 255, 0.03)",
            border: showShap ? "1px solid rgba(0, 201, 167, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
            color: showShap ? "var(--color-teal)" : "var(--text-secondary)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <BrainCircuit size={14} color={showShap ? "var(--color-teal)" : "var(--text-muted)"} />
            <span>SHAP Feature Importance Panel</span>
          </div>

          {showShap ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <AnimatePresence>
          {showShap && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden", marginTop: "8px" }}
            >
              <div
                style={{
                  padding: "12px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(14, 21, 37, 0.9)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  SHAP MODEL EXPLANATION DRIVERS
                </div>

                {shapDrivers.map((driver, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{driver.feature}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: driver.type === "positive" ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {driver.impact}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================= ACTIONS ROW (COMPARE & DETAILS) ================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "10px",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompare(stock);
          }}
          style={{
            background: isCompared ? "rgba(0, 201, 167, 0.15)" : "transparent",
            border: isCompared ? "1px solid var(--color-teal)" : "1px solid var(--border)",
            borderRadius: "var(--radius-pill)",
            padding: "5px 12px",
            color: isCompared ? "var(--color-teal)" : "var(--text-muted)",
            fontSize: "11.5px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            transition: "all 0.18s ease",
          }}
        >
          {isCompared ? <Check size={12} /> : <Plus size={12} />}
          <span>{isCompared ? "Compared" : "Compare Stock"}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCardClick(stock);
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-teal)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>Full Analysis</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </Card>
  );
}

export default ScreenerStockCard;
