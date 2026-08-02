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
import { parseConf } from "../../utils/formatters";

export function ScreenerStockCard({
  stock,
  isCompared,
  onToggleCompare,
  onCardClick,
}) {
  const [showShap, setShowShap] = useState(false);

  const confPct = parseConf(stock.confidence);
  const signal_label = stock.recommendation ?? "N/A";
  const targetPrice = stock.predicted_price ?? null;
  const expectedReturn = stock.expected_return ?? null;
  const riskLevel = stock.overall_risk ?? "N/A";

  // Technical indicators from backend explainability
  const tech = stock.technical_indicators ?? {};

  // Model agreement from backend
  const modelAgreement = stock.explainability?.available_models;
  const hasModelAgreement = Array.isArray(modelAgreement) && modelAgreement.length > 0;

  // SHAP drivers from backend reasoning
  const shapDrivers = stock.shap?.features ?? [];

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
            signal_label === "BUY" || signal_label === "ACCUMULATE"
              ? "linear-gradient(90deg, var(--color-teal), var(--success))"
              : signal_label === "SELL"
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
              {stock.sector ?? "N/A"}
            </span>
          </div>

          <Typography variant="caption" style={{ color: "var(--text-muted)", fontSize: "12px" }}>
            {stock.trend ?? "N/A"}
          </Typography>
        </div>

        {/* Requirement 2: AI Signal Badge */}
        <Badge signal={signal_label} size="md" />
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
          {stock.current_price != null
            ? <>₹<CountUp end={stock.current_price} decimals={2} duration={1.2} separator="," /></>
            : "N/A"}
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
          {targetPrice != null
            ? <>₹<CountUp end={targetPrice} duration={1.2} separator="," /></>
            : <span style={{ color: "var(--text-muted)" }}>N/A</span>
          }
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
            {confPct != null ? <><CountUp end={confPct} duration={1.2} />%</> : "N/A"}
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
            animate={{ width: confPct != null ? `${confPct}%` : "0%" }}
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
          {hasModelAgreement
            ? modelAgreement.map((model, idx) => (
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
              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{model}</span>
            </div>
          ))
            : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{stock.agreement ?? "N/A"}</span>
          }
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Model agreement: {stock.model_agreement == null ? "N/A" : String(stock.model_agreement)}
        </span>
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
            {expectedReturn != null
              ? <><span>+</span><CountUp end={expectedReturn} decimals={1} duration={1.2} />%</>
              : "N/A"
            }
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
            {targetPrice != null
              ? <>₹<CountUp end={targetPrice} duration={1.2} /></>
              : "N/A"
            }
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
            {riskLevel === "N/A" ? "N/A" : `${riskLevel} RISK`}
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
        <span style={{ fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{tech.rsi ?? "N/A"}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>MACD:</span>
        <span style={{ fontWeight: 700, color: "var(--color-teal)", fontFamily: "var(--font-mono)" }}>{tech.macd ?? "N/A"}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>50 EMA:</span>
        <span style={{ fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{tech.ema_50 ?? "N/A"}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Volume:</span>
        <span style={{ fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{tech.volume ?? "N/A"}</span>
        </div>
      </div>

      {/* Mini Recharts Sparkline */}
      {stock.history?.length > 0 && (
        <div style={{ height: "32px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stock.history}>
              <Area
                type="monotone"
                dataKey="Close"
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

                {shapDrivers.length > 0
                  ? shapDrivers.map((driver, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{driver.name}</span>
                    {driver.value != null && (
                    <span
                      style={{
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {driver.value}
                    </span>
                    )}
                  </div>
                ))
                  : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>N/A</span>
                }
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
