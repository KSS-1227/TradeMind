import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Sliders, CheckCircle2 } from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { AllocationRow } from "../../components/cards/AllocationRow";
import { PortfolioPieChart } from "../../components/charts/PortfolioPieChart";
import { STOCKS, STOCK_LABELS } from "../../constants/stocks";
import { fetchStockSignal } from "../../services/marketService";
import { parseConf, fmt } from "../../utils/formatters";
import { toast } from "sonner";

export function PortfolioDoctorPage() {
  const { isMobile } = useOutletContext();
  const [selected, setSelected] = useState(["RELIANCE", "TCS", "INFY"]);
  const [capital, setCapital] = useState(100000);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = (s) =>
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 5 ? [...prev, s] : prev
    );

  const generatePortfolio = async () => {
    if (selected.length < 2) {
      toast.error("Please select at least 2 assets");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const signals = await Promise.all(
        selected.map((s) => fetchStockSignal(s))
      );

      const buys = signals.filter((s) => s.signal === "BUY");
      const holds = signals.filter((s) => s.signal === "HOLD");
      const pool = buys.length > 0 ? buys : holds;
      const total = pool.reduce((a, s) => a + parseConf(s.confidence), 0);

      const allocs = pool.map((s) => {
        const c = parseConf(s.confidence);
        return {
          symbol: s.symbol?.replace(".NS", ""),
          signal: s.signal,
          confidence: c,
          weight: total > 0 ? Math.round((c / total) * 100) : Math.round(100 / pool.length),
          amount: total > 0 ? Math.round((capital * c) / total) : Math.round(capital / pool.length),
        };
      });

      const sells = signals
        .filter((s) => s.signal === "SELL")
        .map((s) => ({
          symbol: s.symbol?.replace(".NS", ""),
          signal: "SELL",
          weight: 0,
          amount: 0,
          confidence: parseConf(s.confidence),
        }));

      setResult({ allocs: [...allocs, ...sells], capital });
      toast.success("Portfolio allocation generated");
    } catch (e) {
      toast.error(e.message || "Failed to generate portfolio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div style={{ marginBottom: "20px" }}>
        <h1 className="page-title">Portfolio Doctor</h1>
        <p className="page-sub">Select 2-5 assets — AI suggests optimal capital allocation based on signal confidence.</p>
      </div>

      {/* Asset Selection Form */}
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
          SELECT ASSETS (MAX 5) — {selected.length}/5 SELECTED
        </div>
        <div className="stocks-scroll" style={{ marginBottom: "16px" }}>
          {STOCKS.map((s) => (
            <button
              key={s}
              className={`stock-btn ${selected.includes(s) ? "active" : ""}`}
              onClick={() => toggle(s)}
            >
              {STOCK_LABELS[s] || s}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600 }}>
              CAPITAL INVESTMENT (₹)
            </div>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              style={{
                background: "var(--bg-raised)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                width: "100%",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>
          <Button
            onClick={generatePortfolio}
            loading={loading}
            disabled={selected.length < 2}
            icon={Sliders}
          >
            Generate Portfolio
          </Button>
        </div>
      </Card>

      {/* Results View */}
      {result && (
        <div className="fade-in">
          <Card style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--color-teal)",
                marginBottom: "14px",
                letterSpacing: "0.5px",
              }}
            >
              RECOMMENDED ALLOCATION
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 56px 90px 72px 72px",
                gap: "8px",
                padding: "4px 12px",
                fontSize: "10px",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: "6px",
              }}
            >
              <span>Asset</span>
              <span>Wt.</span>
              <span>Amount</span>
              <span>Signal</span>
              <span>Conf.</span>
            </div>

            {result.allocs.map((a, i) => (
              <AllocationRow key={i} alloc={a} />
            ))}

            <div
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                background: "var(--bg-raised)",
                borderRadius: 8,
                fontSize: "12px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CheckCircle2 size={16} color="var(--color-teal)" />
              <span>
                Total Capital: <strong style={{ color: "var(--text-primary)" }}>₹{fmt(result.capital)}</strong> ·{" "}
                {result.allocs.filter((a) => a.signal === "BUY").length} BUY signals
              </span>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-teal)", marginBottom: "12px" }}>
              PORTFOLIO BREAKDOWN
            </div>
            <PortfolioPieChart allocs={result.allocs} isMobile={isMobile} />
          </Card>
        </div>
      )}
    </PageTransition>
  );
}

export default PortfolioDoctorPage;
