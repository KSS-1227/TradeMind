import React, { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Tabs } from "../ui/Tabs";
import { MetricCard } from "../ui/MetricCard";
import { PriceAreaChart } from "../charts/PriceAreaChart";
import { parseConf } from "../../utils/formatters";
import { fetchStockPrices } from "../../services/marketService";
import { SIGNAL_COLORS } from "../../constants/stocks";

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
    return () => {
      isMounted = false;
    };
  }, [signal.symbol]);

  const tabsConfig = [
    { id: "signal", label: "Why This Signal" },
    { id: "chart", label: "Price Chart" },
    { id: "sentiment", label: "Sentiment" },
  ];

  return (
    <div className="fade-in">
      {/* Signal Header Card */}
      <Card style={{ marginBottom: "12px" }}>
        <div className="signal-header">
          <div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "1px", marginBottom: "3px" }}>
              {signal.symbol} · NSE
            </div>
            <div className="mono" style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: "var(--text-primary)" }}>
              {signal.price}
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
              {signal.timestamp}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "flex-start" : "flex-end", gap: "4px" }}>
            <Badge signal={signal.signal} />
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Confidence</div>
            <div className="mono" style={{ fontSize: "15px", fontWeight: 700, color: sigColor.bg }}>
              {conf}%
            </div>
            <div style={{ width: 80, height: 3, background: "var(--text-dim)", borderRadius: 2 }}>
              <div style={{ width: `${conf}%`, height: 3, background: sigColor.bg, borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Risk Metrics */}
      <div className="grid-3" style={{ marginBottom: "12px" }}>
        <MetricCard label="Sharpe" value={signal.risk?.sharpe || "—"} color="var(--color-teal)" />
        <MetricCard label="Drawdown" value={signal.risk?.drawdown || "—"} color="var(--color-danger)" />
        <MetricCard label="VaR 95%" value={signal.risk?.var || "—"} color="var(--color-gold)" />
      </div>

      {/* Navigation Tabs */}
      <Tabs tabs={tabsConfig} activeTab={tab} onChange={setTab} />

      {/* Tab 1: Explainability */}
      {tab === "signal" && (
        <Card className="fade-in">
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-teal)", marginBottom: "10px", letterSpacing: "0.5px" }}>
            🤖 SHAP EXPLANATION
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {signal.reasons?.map((r, i) => (
              <div key={i} className="reason-item">
                {r}
              </div>
            ))}
          </div>
          {signal.risk?.note && (
            <div
              style={{
                marginTop: "12px",
                padding: "9px 12px",
                background: "var(--color-gold-bg)",
                border: "1px solid var(--color-gold-border)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--color-gold)",
              }}
            >
              {signal.risk.note}
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: Interactive Chart */}
      {tab === "chart" && (
        <Card className="fade-in">
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "12px" }}>
            {signal.symbol?.replace(".NS", "")} · Last 90 Days
          </div>
          <PriceAreaChart prices={prices} isMobile={isMobile} />
        </Card>
      )}

      {/* Tab 3: FinBERT Sentiment */}
      {tab === "sentiment" && (
        <Card className="fade-in">
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-teal)", marginBottom: "12px", letterSpacing: "0.5px" }}>
            📰 FINBERT SENTIMENT
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {Object.entries(signal.sentiment?.scores || {}).map(([k, v]) => {
              const color = k === "positive" ? "var(--color-teal)" : k === "negative" ? "var(--color-danger)" : "var(--color-gold)";
              const pct = Math.round(v * 100);
              return (
                <div
                  key={k}
                  style={{
                    flex: 1,
                    background: "var(--bg-raised)",
                    borderRadius: "10px",
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <div className="mono" style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color }}>
                    {pct}%
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px", textTransform: "capitalize" }}>
                    {k}
                  </div>
                  <div style={{ height: 3, background: "var(--text-dim)", borderRadius: 2, marginTop: 8 }}>
                    <div style={{ height: 3, width: `${pct}%`, background: color, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
