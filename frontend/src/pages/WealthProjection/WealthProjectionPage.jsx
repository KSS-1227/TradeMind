import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Calculator, Save, History } from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { MetricCard } from "../../components/ui/MetricCard";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabaseClient";
import { calculateWealthProjection } from "../../services/marketService";
import { fmt } from "../../utils/formatters";
import { toast } from "sonner";

export function WealthProjectionPage() {
  const { isMobile } = useOutletContext();
  const { user, isAuthenticated } = useAuth();

  const [monthlyInvestment, setMonthlyInvestment] = useState(15000);
  const [years, setYears] = useState(15);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [crashEnabled, setCrashEnabled] = useState(false);
  const [crashYear, setCrashYear] = useState(5);
  const [crashPct, setCrashPct] = useState(20);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const { data, error } = await supabase
        .from("wealth_scenarios")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not load saved scenarios:", error.message);
        return;
      }
      setSavedScenarios(data || []);
      if (data && data.length > 0) {
        const latest = data[0];
        setMonthlyInvestment(latest.monthly_investment);
        setYears(latest.years);
        setExpectedReturn(latest.expected_annual_return * 100);
        if (latest.market_crash_year) {
          setCrashEnabled(true);
          setCrashYear(latest.market_crash_year);
          setCrashPct(latest.market_crash_pct * 100);
        }
      }
    })();
  }, [isAuthenticated]);

  const calculate = async () => {
    setLoading(true);
    setSaveStatus(null);
    try {
      const body = {
        monthly_investment: Number(monthlyInvestment),
        years: Number(years),
        expected_annual_return: Number(expectedReturn) / 100,
      };
      if (crashEnabled) {
        body.market_crash_year = Number(crashYear);
        body.market_crash_pct = Number(crashPct) / 100;
      }
      const data = await calculateWealthProjection(body);
      setResult(data);
      toast.success("Wealth projection calculated");
    } catch (e) {
      toast.error(e.message || "Failed to calculate projection");
    } finally {
      setLoading(false);
    }
  };

  const saveScenario = async () => {
    if (!result || !user) return;
    setSaveStatus("saving");
    const { error } = await supabase.from("wealth_scenarios").insert({
      user_id: user.id,
      monthly_investment: result.monthly_investment,
      years: result.years,
      expected_annual_return: result.expected_annual_return,
      market_crash_year: result.market_crash_year,
      market_crash_pct: result.market_crash_pct,
      result: result,
    });

    if (error) {
      setSaveStatus("error");
      toast.error("Failed to save scenario");
    } else {
      setSaveStatus("saved");
      toast.success("Scenario saved to your profile");
      const { data } = await supabase
        .from("wealth_scenarios")
        .select("*")
        .order("created_at", { ascending: false });
      setSavedScenarios(data || []);
    }
  };

  const loadScenario = (s) => {
    setMonthlyInvestment(s.monthly_investment);
    setYears(s.years);
    setExpectedReturn(s.expected_annual_return * 100);
    if (s.market_crash_year) {
      setCrashEnabled(true);
      setCrashYear(s.market_crash_year);
      setCrashPct(s.market_crash_pct * 100);
    } else {
      setCrashEnabled(false);
    }
    setResult(s.result);
    toast.info("Loaded scenario");
  };

  return (
    <PageTransition>
      <div style={{ marginBottom: "20px" }}>
        <h1 className="page-title">Wealth Projection Engine</h1>
        <p className="page-sub">SIP compound interest simulation with stress testing for market crashes.</p>
      </div>

      <Card style={{ marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>
              Monthly investment (₹)
            </label>
            <input
              type="number"
              value={monthlyInvestment}
              onChange={(e) => setMonthlyInvestment(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                padding: "11px 13px",
                color: "var(--text-primary)",
                fontSize: 14,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>
              Investment Horizon (Years)
            </label>
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                padding: "11px 13px",
                color: "var(--text-primary)",
                fontSize: 14,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>
              Expected Annual Return (%)
            </label>
            <input
              type="number"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                padding: "11px 13px",
                color: "var(--text-primary)",
                fontSize: 14,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, paddingBottom: 6 }}>
            <input
              type="checkbox"
              id="crashCheck"
              checked={crashEnabled}
              onChange={(e) => setCrashEnabled(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--color-teal)" }}
            />
            <label htmlFor="crashCheck" style={{ fontSize: 13, color: "var(--text-primary)", cursor: "pointer" }}>
              Stress test market crash
            </label>
          </div>

          {crashEnabled && (
            <>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>
                  Crash Year
                </label>
                <input
                  type="number"
                  value={crashYear}
                  min={1}
                  max={years}
                  onChange={(e) => setCrashYear(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                    padding: "11px 13px",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>
                  Crash Severity (%)
                </label>
                <input
                  type="number"
                  value={crashPct}
                  onChange={(e) => setCrashPct(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                    padding: "11px 13px",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
            </>
          )}
        </div>

        <Button onClick={calculate} loading={loading} icon={Calculator} style={{ marginTop: 16 }} fullWidth>
          Run Projection
        </Button>
      </Card>

      {/* Results View */}
      {result && (
        <Card style={{ marginBottom: "16px" }}>
          <div className="grid-3" style={{ marginBottom: "16px" }}>
            <MetricCard label="Total Invested" value={`₹${fmt(result.total_invested)}`} color="var(--text-primary)" />
            <MetricCard label="Final Wealth" value={`₹${fmt(result.total_value)}`} color="var(--color-teal)" />
            <MetricCard label="Compounded Gains" value={`₹${fmt(result.total_gains)}`} color="var(--color-gold)" />
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={result.yearly_breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="year" stroke="var(--text-muted)" fontSize={12} />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={12}
                tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
              />
              <Tooltip
                contentStyle={{ background: "var(--bg-raised)", border: "1px solid var(--border-color)" }}
                formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
              />
              <Area type="monotone" dataKey="value" stroke="var(--color-teal)" fill="var(--color-teal-bg)" fillOpacity={0.3} />
              <Area type="monotone" dataKey="invested_so_far" stroke="var(--text-muted)" fill="none" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>

          {isAuthenticated ? (
            <Button onClick={saveScenario} variant="outline" icon={Save} style={{ marginTop: 16 }}>
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved ✓" : "Save Scenario"}
            </Button>
          ) : (
            <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--text-muted)" }}>
              Sign in to save this scenario to your dashboard.
            </div>
          )}
        </Card>
      )}

      {/* Saved Scenarios */}
      {isAuthenticated && savedScenarios.length > 0 && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <History size={16} /> Saved Scenarios
          </div>
          {savedScenarios.map((s) => (
            <div
              key={s.id}
              onClick={() => loadScenario(s)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px solid var(--border-color)",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                ₹{s.monthly_investment.toLocaleString("en-IN")}/mo · {s.years}yr · {(s.expected_annual_return * 100).toFixed(0)}%
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {new Date(s.created_at).toLocaleDateString("en-IN")}
              </span>
            </div>
          ))}
        </Card>
      )}
    </PageTransition>
  );
}

export default WealthProjectionPage;
