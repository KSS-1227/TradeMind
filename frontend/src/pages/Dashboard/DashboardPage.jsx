import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ArrowRight, Briefcase, TrendingUp, Coins } from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { MotionCard } from "../../components/animations/MotionCard";
import { MetricCard } from "../../components/ui/MetricCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { STOCKS, STOCK_LABELS } from "../../constants/stocks";
import { fmt } from "../../utils/formatters";

export function DashboardPage() {
  const navigate = useNavigate();
  const { gold } = useOutletContext();

  const stats = [
    { label: "Assets Watched", value: "13", sub: "NSE + Commodities", color: "var(--color-teal)" },
    { label: "Gold 24K / 10g", value: gold ? `₹${fmt(gold.current_price_10g)}` : "—", sub: "Live MCX", color: "var(--color-gold)" },
    { label: "Backtest Win Rate", value: "90%", sub: "Simulated 2-year", color: "var(--color-teal)" },
    { label: "Model Return", value: "30%+", sub: "Outperformed Nifty", color: "var(--color-teal)" },
  ];

  return (
    <PageTransition>
      <div style={{ marginBottom: "20px" }}>
        <h1 className="page-title">Good morning. Markets are open.</h1>
        <p className="page-sub">TradeMind is monitoring 13 NSE assets with real-time SHAP analysis.</p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid-4" style={{ marginBottom: "16px" }}>
        {stats.map((s) => (
          <MetricCard key={s.label} label={s.label} value={s.value} sub={s.sub} color={s.color} />
        ))}
      </div>

      {/* Quick Analyze Selector */}
      <Card style={{ marginBottom: "16px" }}>
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            letterSpacing: "0.8px",
            marginBottom: "12px",
            fontWeight: 700,
          }}
        >
          QUICK ANALYSE ASSET
        </div>
        <div className="stocks-scroll" style={{ marginBottom: "16px" }}>
          {STOCKS.map((s) => (
            <button
              key={s}
              className="stock-btn"
              onClick={() => navigate(`/screener?stock=${s}`)}
            >
              {STOCK_LABELS[s] || s}
            </button>
          ))}
        </div>
        <Button onClick={() => navigate("/screener")} icon={ArrowRight}>
          Open Full Stock Screener
        </Button>
      </Card>

      {/* Feature Navigation Grid */}
      <div className="grid-3">
        {[
          {
            icon: Briefcase,
            title: "Portfolio Doctor",
            desc: "AI capital allocation model across 2-5 NSE assets based on confidence.",
            path: "/portfolio-doctor",
          },
          {
            icon: TrendingUp,
            title: "Strategy Builder",
            desc: "2-year backtest simulation engine comparing signals against Nifty50.",
            path: "/strategy-builder",
          },
          {
            icon: Coins,
            title: "Commodities Radar",
            desc: "Live MCX Gold 24K and Silver price conversion with FinBERT sentiment.",
            path: "/scam-detector",
          },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <MotionCard key={f.title} onClick={() => navigate(f.path)}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "var(--color-teal-bg)",
                  border: "1px solid var(--color-teal-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-teal)",
                  marginBottom: "12px",
                }}
              >
                <Icon size={20} />
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                {f.title}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                {f.desc}
              </div>
            </MotionCard>
          );
        })}
      </div>
    </PageTransition>
  );
}

export default DashboardPage;
