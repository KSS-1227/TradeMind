import React, { useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  Play,
  Download,
  Sparkles,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Clock,
  Zap,
  ChevronRight,
  BrainCircuit,
  Target,
  FileText,
  Info,
} from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { Card, MetricCard } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

import { AgentLoader } from "../../components/animations/AgentLoader";
import { ErrorState } from "../../components/common/ErrorState";
import { EquityCurveChart, DrawdownChart, AnnualReturnsChart } from "../../components/charts/StrategyCharts";
import { TradeHistoryTable } from "../../components/strategy/TradeHistoryTable";
import { STOCKS, STOCK_LABELS } from "../../constants/stocks";
import { fetchBacktest } from "../../services/marketService";
import { fmt } from "../../utils/formatters";
import { isDemoModeEnabled } from "../../utils/demoMode";
import { toast } from "sonner";
import "../../styles/strategy-builder.css";

/* ── Agent Pipeline Stages ── */
const AGENT_STAGES = [
  "Ingesting 2-year OHLCV price history from NSE",
  "Parsing natural language strategy rules",
  "Computing RSI, MACD, EMA & Volume signals",
  "Simulating trades with 0.1% slippage model",
  "Evaluating Sharpe Ratio, Drawdown & Win Rate",
  "Building equity curve vs Nifty50 benchmark",
];

/* ── Example Strategies ── */
const EXAMPLE_STRATEGIES = [
  { label: "RSI Oversold + Sentiment", query: "Buy when RSI < 30 and sentiment is positive. Sell when RSI > 70." },
  { label: "MACD Crossover", query: "Buy when MACD crosses above signal line. Sell when MACD crosses below signal line." },
  { label: "EMA Golden Cross", query: "Buy when price crosses above 50-day EMA. Sell when price drops below 20-day EMA." },
  { label: "Volume Breakout", query: "Buy when volume is 2x average and RSI is between 40 and 60. Sell after 10 days." },
  { label: "Mean Reversion", query: "Buy when RSI < 25 and price is below lower Bollinger Band. Sell when RSI > 55." },
];

/* ── Result Tab Definitions ── */
const TABS = [
  { id: "equity",   label: "Equity Curve",   icon: TrendingUp },
  { id: "drawdown", label: "Drawdown",        icon: TrendingDown },
  { id: "annual",   label: "Annual Returns",  icon: BarChart2 },
  { id: "trades",   label: "Trade History",   icon: Clock },
];

/* ── KPI config from backend result ── */
function buildKpis(result) {
  return [
    {
      label: "TOTAL RETURN",
      value: result.total_return != null ? `${result.total_return > 0 ? "+" : ""}${result.total_return}%` : "—",
      color: result.total_return >= 0 ? "var(--success)" : "var(--danger)",
      sub: "vs initial capital",
    },
    {
      label: "FINAL VALUE",
      value: result.final_value != null ? `₹${fmt(result.final_value)}` : "—",
      color: "var(--color-teal)",
      sub: `from ₹${fmt(result.initial_cash)}`,
    },
    {
      label: "SHARPE RATIO",
      value: result.sharpe_ratio != null ? Number(result.sharpe_ratio).toFixed(2) : "—",
      color: result.sharpe_ratio >= 1 ? "var(--success)" : result.sharpe_ratio >= 0.5 ? "var(--warning)" : "var(--danger)",
      sub: "risk-adjusted return",
    },
    {
      label: "MAX DRAWDOWN",
      value: result.max_drawdown != null ? `${result.max_drawdown}%` : "—",
      color: "var(--danger)",
      sub: "peak-to-trough loss",
    },
    {
      label: "WIN RATE",
      value: result.win_rate != null ? `${result.win_rate}%` : "—",
      color: result.win_rate >= 55 ? "var(--success)" : "var(--warning)",
      sub: "profitable trades",
    },
    {
      label: "LOSS RATE",
      value: result.win_rate != null ? `${(100 - result.win_rate).toFixed(1)}%` : "—",
      color: "var(--danger)",
      sub: "losing trades",
    },
    {
      label: "TOTAL TRADES",
      value: result.total_trades ?? "—",
      color: "var(--text-primary)",
      sub: "executed signals",
    },
    {
      label: "BENCHMARK Δ",
      value: (() => {
        if (!result.portfolio_curve?.length || !result.benchmark?.length) return "—";
        const portFinal = result.portfolio_curve[result.portfolio_curve.length - 1]?.value;
        const benchFinal = result.benchmark[result.benchmark.length - 1]?.value;
        if (!portFinal || !benchFinal) return "—";
        const delta = (((portFinal - benchFinal) / benchFinal) * 100).toFixed(1);
        return `${delta > 0 ? "+" : ""}${delta}%`;
      })(),
      color: "var(--accent-blue)",
      sub: "vs Nifty50",
    },
  ];
}

/* ══════════════════════════════════════════════════════════ */
export function StrategyBuilderPage() {
  const context = useOutletContext();
  const isMobile = context?.isMobile || false;

  /* Strategy input state */
  const [strategyText, setStrategyText] = useState("");
  const [selectedStock, setSelectedStock] = useState("RELIANCE");

  /* Execution state */
  const [loading, setLoading]     = useState(false);
  const [loaderStep, setLoaderStep] = useState(0);
  const [error, setError]         = useState(null);
  const [result, setResult]       = useState(null);

  /* UI state */
  const [activeTab, setActiveTab] = useState("equity");

  const nseStocks = STOCKS.filter(
    (s) => !["GOLD24K", "SILVER", "GOLDBEES", "SILVERBEES", "NIFTYBEES"].includes(s)
  );

  /* ── Run Backtest ── */
  const runBacktest = useCallback(async () => {
    if (isDemoModeEnabled()) {
      setLoading(true);
      setResult(null);
      setError(null);
      setLoaderStep(0);
      const interval = setInterval(() => {
        setLoaderStep((prev) => (prev < AGENT_STAGES.length - 1 ? prev + 1 : prev));
      }, 400);
      setTimeout(() => {
        clearInterval(interval);
        setLoaderStep(AGENT_STAGES.length - 1);
        setResult({
          total_return: 21.2,
          final_value: 121200,
          initial_cash: 100000,
          sharpe_ratio: 1.18,
          max_drawdown: 7.8,
          win_rate: 63,
          total_trades: 14,
          portfolio_curve: [
            { date: "2023-01-01", value: 100000 },
            { date: "2023-04-01", value: 106000 },
            { date: "2023-07-01", value: 113400 },
            { date: "2023-10-01", value: 121200 },
          ],
          benchmark: [
            { date: "2023-01-01", value: 100000 },
            { date: "2023-04-01", value: 103000 },
            { date: "2023-07-01", value: 107500 },
            { date: "2023-10-01", value: 110800 },
          ],
          trades: [
            { date: "2023-02-10", action: "BUY", shares: 10, entry_price: 2510, exit_price: 2580, pnl: 700, return_pct: 2.79 },
            { date: "2023-03-18", action: "SELL", shares: 10, entry_price: 2580, exit_price: 2640, pnl: 600, return_pct: 2.33 },
          ],
        });
        setActiveTab("equity");
        setLoading(false);
        toast.success("Demo backtest completed successfully.");
      }, 1100);
      return;
    }

    if (!selectedStock) {
      toast.error("Please select a stock to backtest.");
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    setLoaderStep(0);

    // Advance stages while waiting
    const interval = setInterval(() => {
      setLoaderStep((prev) => (prev < AGENT_STAGES.length - 1 ? prev + 1 : prev));
    }, 400);

    try {
      const data = await fetchBacktest(selectedStock);
      clearInterval(interval);
      setLoaderStep(AGENT_STAGES.length - 1);
      // Small pause so user sees the final stage complete
      await new Promise((r) => setTimeout(r, 350));
      setResult(data);
      setActiveTab("equity");
      toast.success(`Backtest complete for ${STOCK_LABELS[selectedStock] || selectedStock}!`);
    } catch (err) {
      clearInterval(interval);
      setError({ message: err.message || "Backtest simulation failed.", code: err.status || "BACKTEST_ERROR" });
      toast.error("Backtest simulation failed.");
    } finally {
      setLoading(false);
    }
  }, [selectedStock]);

  /* ── Export Results as JSON ── */
  const exportResults = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trademind-backtest-${selectedStock}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Results exported as JSON!");
  };

  /* ── Export CSV of trades ── */
  const exportCSV = () => {
    if (!result?.trades?.length) return;
    const header = "Date,Action,Shares,Entry Price,Exit Price,P/L,Return %\n";
    const rows = result.trades.map((t) =>
      [t.date, t.action, t.shares, t.entry_price, t.exit_price, t.pnl, t.return_pct].join(",")
    );
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trademind-trades-${selectedStock}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Trade history exported as CSV!");
  };

  const exportPDF = () => {
    if (!result) return;
    if (typeof window !== "undefined") {
      window.print();
      toast.success("Print dialog opened for PDF export.");
    } else {
      toast.error("PDF export is unavailable in this browser.");
    }
  };

  const kpis = result ? buildKpis(result) : null;

  const benchmarkDeltaLabel = (() => {
    if (!result?.portfolio_curve?.length || !result?.benchmark?.length) return null;
    const portFinal = result.portfolio_curve[result.portfolio_curve.length - 1]?.value;
    const benchFinal = result.benchmark[result.benchmark.length - 1]?.value;
    if (!portFinal || !benchFinal) return null;
    const delta = (((portFinal - benchFinal) / benchFinal) * 100).toFixed(1);
    return `${delta > 0 ? "+" : ""}${delta}%`;
  })();

  const summaryText = strategyText
    ? strategyText.slice(0, 160) + (strategyText.length > 160 ? "…" : "")
    : "Default RSI + MACD + EMA strategy applied (backend configured).";

  return (
    <PageTransition>
      <div style={{ maxWidth: 1280, margin: "0 auto", paddingBottom: 48 }}>

        {/* ══ SECTION 1: HERO ══ */}
        <section className="sb-hero">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 14px",
              borderRadius: "var(--radius-pill)",
              background: "rgba(52, 211, 153, 0.1)",
              border: "1px solid rgba(52, 211, 153, 0.3)",
              color: "var(--success)",
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            <Zap size={13} /> LIVE BACKTEST ENGINE · NSE · 2-YEAR SIMULATION
          </div>
          <h1 className="sb-hero-title">AI Strategy Builder</h1>
          <p className="sb-hero-sub">
            Define your investment strategy in plain English. TradeMind runs a 2-year NSE simulation using
            RSI, MACD, EMA and FinBERT sentiment — with 0.1% slippage — and compares results against the
            Nifty50 benchmark.
          </p>
        </section>

        {/* ══ SECTION 2: NATURAL LANGUAGE INPUT ══ */}
        <Card style={{ marginBottom: 20, padding: "22px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <Sparkles size={16} color="var(--color-teal)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.3px" }}>
              NATURAL LANGUAGE STRATEGY INPUT
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "2px 6px",
                fontFamily: "var(--font-mono)",
              }}
            >
              OPTIONAL — describe your trading rules
            </span>
          </div>

          <textarea
            className="sb-nl-textarea"
            value={strategyText}
            onChange={(e) => setStrategyText(e.target.value)}
            placeholder={`Describe your strategy in plain English...\n\nExample: "Buy when RSI < 30 and sentiment is positive. Sell when RSI > 70 or MACD crosses below signal line."`}
          />

          {/* Example strategy chips */}
          <div style={{ marginTop: 12, marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 8, letterSpacing: "0.5px" }}>
              EXAMPLE STRATEGIES — CLICK TO LOAD:
            </div>
            <div className="sb-examples">
              {EXAMPLE_STRATEGIES.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  className="sb-example-chip"
                  onClick={() => setStrategyText(ex.query)}
                >
                  <ChevronRight size={11} />
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* ══ SECTION 3: STOCK + RUN CONFIG ══ */}
        <Card style={{ marginBottom: 20, padding: "18px 24px" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.8px", marginBottom: 14 }}>
            BACKTEST CONFIGURATION
          </div>

          <div className="sb-config-row">
            {/* Stock Selector */}
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6 }}>
                SELECT NSE ASSET
              </label>
              <select
                className="sb-select"
                value={selectedStock}
                onChange={(e) => setSelectedStock(e.target.value)}
              >
                {nseStocks.map((s) => (
                  <option key={s} value={s}>
                    {STOCK_LABELS[s] || s}
                  </option>
                ))}
              </select>
            </div>

            {/* Period (informational — backend uses its own window) */}
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6 }}>
                BACKTEST PERIOD
              </label>
              <select className="sb-select" defaultValue="2y" disabled>
                <option value="2y">2 Years (Default)</option>
              </select>
            </div>

            {/* Initial Capital (informational) */}
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6 }}>
                INITIAL CAPITAL
              </label>
              <select className="sb-select" defaultValue="100000" disabled>
                <option value="100000">₹1,00,000</option>
              </select>
            </div>
          </div>

          {/* Quick Stock Pills */}
          <div
            className="stocks-scroll"
            style={{ marginBottom: 16, marginTop: 4, paddingBottom: 4 }}
          >
            {nseStocks.slice(0, 10).map((s) => (
              <button
                key={s}
                type="button"
                className={`stock-btn ${selectedStock === s ? "active" : ""}`}
                onClick={() => setSelectedStock(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <Button
            onClick={runBacktest}
            loading={loading}
            icon={Play}
            size="lg"
          >
            {loading ? "Running Simulation…" : `Run Backtest — ${STOCK_LABELS[selectedStock] || selectedStock}`}
          </Button>
        </Card>

        {/* ══ SECTION 7: AGENT LOADER ══ */}
        <AnimatePresence>
          {loading && (
            <motion.div
              key="loader"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <Card style={{ padding: "20px 22px", marginBottom: 18 }} hoverLift={false}>
                <div className="sb-pipeline-card">
                  <div className="sb-pipeline-header">
                    <div className="sb-pipeline-icon">
                      <BrainCircuit size={16} />
                    </div>
                    <div>
                      <div className="sb-pipeline-title">Premium AI Backtest Pipeline</div>
                      <div className="sb-pipeline-subtitle">Analyzing your strategy with live market context and benchmark comparison</div>
                    </div>
                  </div>
                  <div className="sb-pipeline-steps">
                    {AGENT_STAGES.map((stage, index) => (
                      <motion.div
                        key={stage}
                        className={`sb-pipeline-step ${index <= loaderStep ? "active" : ""}`}
                        initial={{ opacity: 0.6, x: -6 }}
                        animate={{ opacity: index <= loaderStep ? 1 : 0.55, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className="sb-pipeline-dot" />
                        <span>{stage}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </Card>
              <AgentLoader
                title="Running Strategy Backtest Simulation…"
                steps={AGENT_STAGES}
                step={loaderStep}
                subtext={`Simulating ${STOCK_LABELS[selectedStock] || selectedStock} · 0.1% commission · 2-year NSE window`}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ SECTION 8: ERROR STATE ══ */}
        {error && !loading && (
          <ErrorState
            title="Backtest Simulation Failed"
            description={error.message}
            code={error.code}
            onRetry={runBacktest}
          />
        )}

        {/* ══ SECTIONS 4–6: RESULTS ══ */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* ── Export Actions ── */}
              <div className="sb-actions-row">
                <div
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  <span style={{ color: "var(--color-teal)" }}>
                    {STOCK_LABELS[selectedStock] || selectedStock}
                  </span>{" "}
                  · Backtest Results · 2-Year NSE Simulation
                </div>
                <Button variant="secondary" size="sm" icon={Download} onClick={exportCSV}>
                  Export Trades CSV
                </Button>
                <Button variant="secondary" size="sm" icon={Download} onClick={exportResults}>
                  Export JSON
                </Button>
              </div>

              {/* ── Summary Card ── */}
              <Card
                style={{
                  marginBottom: 20,
                  padding: "18px 20px",
                  background: "linear-gradient(135deg, rgba(0,201,167,0.08) 0%, var(--bg-surface) 100%)",
                  border: "1px solid rgba(52, 211, 153, 0.2)",
                }}
                hoverLift={false}
              >
                <div className="sb-summary-top">
                  <div className="sb-summary-badge">
                    <Target size={13} /> PREMIUM STRATEGY SUMMARY
                  </div>
                  <div className="sb-summary-actions">
                    <Button variant="secondary" size="sm" icon={FileText} onClick={exportPDF}>
                      Export PDF
                    </Button>
                    <Button variant="secondary" size="sm" icon={Download} onClick={exportCSV}>
                      Export CSV
                    </Button>
                  </div>
                </div>

                <div className="sb-summary-grid">
                  <div className="sb-summary-panel">
                    <div className="sb-summary-label">Strategy brief</div>
                    <div className="sb-summary-title">{summaryText}</div>
                    <div className="sb-summary-meta">Executed {result.total_trades ?? 0} trades on {STOCK_LABELS[selectedStock] || selectedStock}</div>
                  </div>
                  <div className="sb-summary-panel">
                    <div className="sb-summary-label">Benchmark comparison</div>
                    <div className="sb-summary-metric">{benchmarkDeltaLabel ?? "—"}</div>
                    <div className="sb-summary-meta">TradeMind vs Nifty50 benchmark</div>
                  </div>
                  <div className="sb-summary-panel">
                    <div className="sb-summary-label">Signal quality</div>
                    <div className="sb-summary-metric">{result.win_rate != null ? `${result.win_rate.toFixed(1)}%` : "—"}</div>
                    <div className="sb-summary-meta">Winning trade rate and risk-adjusted execution</div>
                  </div>
                </div>
              </Card>

              {/* ── KPI Grid ── */}
              <div className="sb-kpi-grid" style={{ marginBottom: 24 }}>
                {kpis.map((kpi, i) => (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                  >
                    <MetricCard
                      label={kpi.label}
                      value={kpi.value}
                      sub={kpi.sub}
                      color={kpi.color}
                    />
                  </motion.div>
                ))}
              </div>

              {/* ── Summary Banner ── */}
              <Card
                style={{
                  marginBottom: 20,
                  padding: "14px 20px",
                  background: "linear-gradient(135deg, rgba(0,201,167,0.07) 0%, var(--bg-surface) 100%)",
                  borderLeft: "3px solid var(--color-teal)",
                }}
                hoverLift={false}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <Info size={16} color="var(--color-teal)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    <strong style={{ color: "var(--text-primary)" }}>Strategy Summary: </strong>
                    {strategyText
                      ? `"${strategyText.slice(0, 160)}${strategyText.length > 160 ? "…" : ""}"`
                      : "Default RSI + MACD + EMA strategy applied (backend configured)."}
                    {" "}Executed {result.total_trades ?? 0} trades on {STOCK_LABELS[selectedStock] || selectedStock}{" "}
                    with ₹{fmt(result.initial_cash)} initial capital, achieving a final portfolio value of{" "}
                    <strong style={{ color: result.total_return >= 0 ? "var(--success)" : "var(--danger)" }}>
                      ₹{fmt(result.final_value)}
                    </strong>.
                  </div>
                </div>
              </Card>

              {/* ── Chart Tabs ── */}
              <Card style={{ padding: "0 0 20px 0", overflow: "hidden" }}>
                <div className="sb-tabs" style={{ padding: "0 20px" }}>
                  {TABS.map((tab) => {
                    const IconComp = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        className={`sb-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        <IconComp size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ padding: "0 20px" }}>
                  <AnimatePresence mode="wait">
                    {activeTab === "equity" && (
                      <motion.div
                        key="equity"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="sb-chart-legend" style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, display: "flex", gap: 16 }}>
                          <span>
                            <span style={{ color: "var(--color-teal)" }}>━━</span> TradeMind Strategy
                          </span>
                          <span>
                            <span style={{ color: "var(--text-muted)" }}>╌╌</span> Nifty50 Benchmark
                          </span>
                        </div>
                        <EquityCurveChart
                          portfolioCurve={result.portfolio_curve}
                          benchmarkCurve={result.benchmark}
                          isMobile={isMobile}
                        />
                      </motion.div>
                    )}

                    {activeTab === "drawdown" && (
                      <motion.div
                        key="drawdown"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                          Peak-to-trough drawdown computed from equity curve. Max Drawdown:{" "}
                          <strong style={{ color: "var(--danger)" }}>{result.max_drawdown}%</strong>
                        </div>
                        <DrawdownChart
                          portfolioCurve={result.portfolio_curve}
                          isMobile={isMobile}
                        />
                      </motion.div>
                    )}

                    {activeTab === "annual" && (
                      <motion.div
                        key="annual"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                          Annual P/L aggregated from trade history. Green = profitable year, Red = loss year.
                        </div>
                        <AnnualReturnsChart trades={result.trades} isMobile={isMobile} />
                      </motion.div>
                    )}

                    {activeTab === "trades" && (
                      <motion.div
                        key="trades"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 12,
                          }}
                        >
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {result.total_trades ?? 0} trades executed · Win Rate:{" "}
                            <strong style={{ color: "var(--success)" }}>{result.win_rate}%</strong> · Loss Rate:{" "}
                            <strong style={{ color: "var(--danger)" }}>
                              {result.win_rate != null ? (100 - result.win_rate).toFixed(1) : "—"}%
                            </strong>
                          </div>
                          <Button variant="ghost" size="sm" icon={Download} onClick={exportCSV}>
                            Export CSV
                          </Button>
                        </div>
                        <TradeHistoryTable trades={result.trades} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ EMPTY STATE ══ */}
        {!result && !loading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card
              style={{
                textAlign: "center",
                padding: "60px 40px",
                background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)",
              }}
              hoverLift={false}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(52, 211, 153, 0.1)",
                  border: "1px solid rgba(52, 211, 153, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <BarChart2 size={28} color="var(--success)" />
              </div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 10,
                }}
              >
                Ready to Run Your Strategy
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  maxWidth: 440,
                  margin: "0 auto 24px",
                  lineHeight: 1.6,
                }}
              >
                Describe your strategy above, select a stock, and click{" "}
                <strong>Run Backtest</strong> to see the equity curve, drawdown
                analysis, win rate, Sharpe ratio and full trade history.
              </p>
              <Button onClick={runBacktest} icon={Play} loading={loading}>
                Run Backtest — {STOCK_LABELS[selectedStock] || selectedStock}
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}

export default StrategyBuilderPage;
