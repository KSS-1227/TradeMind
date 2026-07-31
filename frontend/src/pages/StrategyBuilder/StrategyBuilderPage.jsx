import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Play } from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { MetricCard } from "../../components/ui/MetricCard";
import { BacktestChart } from "../../components/charts/BacktestChart";
import { STOCKS } from "../../constants/stocks";
import { fetchBacktest } from "../../services/marketService";
import { fmt } from "../../utils/formatters";
import { toast } from "sonner";

export function StrategyBuilderPage() {
  const { isMobile } = useOutletContext();
  const [selected, setSelected] = useState("RELIANCE");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await fetchBacktest(selected);
      setResult(data);
      toast.success(`Backtest completed for ${selected}`);
    } catch (e) {
      toast.error(e.message || "Backtest simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const nseStocks = STOCKS.filter(
    (s) => !["GOLD24K", "SILVER", "GOLDBEES", "SILVERBEES", "NIFTYBEES"].includes(s)
  );

  return (
    <PageTransition>
      <div style={{ marginBottom: "20px" }}>
        <h1 className="page-title">Strategy Builder & Backtest Engine</h1>
        <p className="page-sub">Run 2-year strategy simulations vs Nifty50 benchmark including 0.1% commission.</p>
      </div>

      <Card style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.8px", marginBottom: "10px", fontWeight: 700 }}>
          SELECT STOCK FOR SIMULATION
        </div>
        <div className="stocks-scroll" style={{ marginBottom: "14px" }}>
          {nseStocks.map((s) => (
            <button
              key={s}
              className={`stock-btn ${selected === s ? "active" : ""}`}
              onClick={() => setSelected(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <Button onClick={runSimulation} loading={loading} icon={Play}>
          Run Backtest Simulation
        </Button>
      </Card>

      {/* Backtest Results View */}
      {result && (
        <div className="fade-in">
          <div className="grid-4" style={{ marginBottom: "16px" }}>
            <MetricCard
              label="Total Return"
              value={`${result.total_return}%`}
              color={result.total_return > 0 ? "var(--color-teal)" : "var(--color-danger)"}
            />
            <MetricCard label="Sharpe Ratio" value={result.sharpe_ratio} color="var(--color-teal)" />
            <MetricCard label="Max Drawdown" value={`${result.max_drawdown}%`} color="var(--color-danger)" />
            <MetricCard label="Win Rate" value={`${result.win_rate}%`} color="var(--color-teal)" />
          </div>

          <Card>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>
              Portfolio vs Nifty50 Benchmark ·{" "}
              <span style={{ color: "var(--color-teal)" }}>₹{fmt(result.initial_cash)}</span> →{" "}
              <span style={{ color: "var(--color-teal)", fontWeight: 700 }}>₹{fmt(result.final_value)}</span> ·{" "}
              <span>{result.total_trades} trades executed</span>
            </div>

            <BacktestChart
              portfolioCurve={result.portfolio_curve}
              benchmarkCurve={result.benchmark}
              isMobile={isMobile}
            />
          </Card>
        </div>
      )}
    </PageTransition>
  );
}

export default StrategyBuilderPage;
