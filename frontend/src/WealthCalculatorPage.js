// frontend/src/WealthCalculatorPage.js
import { useState, useEffect } from "react";
import axios from "axios";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { useAuth } from "./AuthContext";
import { supabase } from "./supabaseClient";

const API = "https://kss-1227-trademind.hf.space";

const T = {
  bg:"#080E1A", surface:"#0D1F35", raised:"#132840",
  border:"#1E3A5F", teal:"#00C9A7", tealDim:"#009E84",
  gold:"#F6C90E", danger:"#F25C54", white:"#F0F4F8",
  muted:"#64748B", dim:"#334155",
};

const inputStyle = {
  width: "100%", background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: 8, padding: "11px 13px", color: T.white, fontSize: 14,
  outline: "none", boxSizing: "border-box",
};
const labelStyle = { fontSize: 12, color: T.muted, display: "block", marginBottom: 5 };

export default function WealthCalculatorPage({ isMobile }) {
  const { user, isAuthenticated } = useAuth();

  const [monthlyInvestment, setMonthlyInvestment] = useState(15000);
  const [years, setYears] = useState(15);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [crashEnabled, setCrashEnabled] = useState(false);
  const [crashYear, setCrashYear] = useState(5);
  const [crashPct, setCrashPct] = useState(20);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null);

  // On load, if signed in: fetch saved scenarios and pre-fill the form
  // from the most recent one. This is the real, honest personalization —
  // their own remembered inputs, not any kind of learned/adaptive model.
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
    setError(null);
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
      const res = await axios.post(`${API}/wealth/project`, body);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong — try again.");
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
      console.error(error);
    } else {
      setSaveStatus("saved");
      const { data } = await supabase
        .from("wealth_scenarios").select("*").order("created_at", { ascending: false });
      setSavedScenarios(data || []);
    }
  };

  const loadScenario = (scenario) => {
    setMonthlyInvestment(scenario.monthly_investment);
    setYears(scenario.years);
    setExpectedReturn(scenario.expected_annual_return * 100);
    if (scenario.market_crash_year) {
      setCrashEnabled(true);
      setCrashYear(scenario.market_crash_year);
      setCrashPct(scenario.market_crash_pct * 100);
    } else {
      setCrashEnabled(false);
    }
    setResult(scenario.result);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "16px" : "24px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.white, marginBottom: 6 }}>
        Wealth Projection Calculator
      </div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
        A compound-interest calculator for "what if I invest ₹X/month" — real math,
        not a prediction. {isAuthenticated
          ? "Signed in: your scenarios are saved and remembered."
          : "Sign in to save scenarios across visits."}
      </div>

      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 12, padding: 18, marginBottom: 16,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Monthly investment (₹)</label>
            <input type="number" value={monthlyInvestment}
              onChange={e => setMonthlyInvestment(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Years</label>
            <input type="number" value={years}
              onChange={e => setYears(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Expected annual return (%)</label>
            <input type="number" value={expectedReturn}
              onChange={e => setExpectedReturn(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <input type="checkbox" checked={crashEnabled}
              onChange={e => setCrashEnabled(e.target.checked)}
              style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 13, color: T.white }}>Model a market crash</span>
          </div>
          {crashEnabled && (
            <>
              <div>
                <label style={labelStyle}>Crash in year</label>
                <input type="number" value={crashYear} min={1} max={years}
                  onChange={e => setCrashYear(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Crash size (%)</label>
                <input type="number" value={crashPct}
                  onChange={e => setCrashPct(e.target.value)} style={inputStyle} />
              </div>
            </>
          )}
        </div>

        <button onClick={calculate} disabled={loading} style={{
          background: T.teal, color: "#04241D", border: "none", borderRadius: 8,
          padding: "12px 16px", fontWeight: 700, fontSize: 14, marginTop: 16,
          cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1, width: "100%",
        }}>
          {loading ? "Calculating..." : "Calculate"}
        </button>

        {error && (
          <div style={{
            marginTop: 12, padding: "10px 12px", borderRadius: 8, fontSize: 13,
            background: "rgba(242,92,84,0.1)", border: `1px solid ${T.danger}`, color: T.white,
          }}>{error}</div>
        )}
      </div>

      {result && (
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 12, padding: 18, marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: T.muted }}>Total invested</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.white }}>
                ₹{result.total_invested.toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: T.muted }}>Final value</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.teal }}>
                ₹{result.total_value.toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: T.muted }}>Total gains</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.gold }}>
                ₹{result.total_gains.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={result.yearly_breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="year" stroke={T.muted} fontSize={12} />
              <YAxis stroke={T.muted} fontSize={12}
                tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
              <Tooltip
                contentStyle={{ background: T.raised, border: `1px solid ${T.border}` }}
                formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
              <Area type="monotone" dataKey="value" stroke={T.teal} fill={T.tealDim} fillOpacity={0.3} />
              <Area type="monotone" dataKey="invested_so_far" stroke={T.muted} fill="none" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>

          {isAuthenticated ? (
            <button onClick={saveScenario} style={{
              marginTop: 12, background: "transparent", color: T.teal,
              border: `1px solid ${T.tealDim}`, borderRadius: 8,
              padding: "10px 16px", fontSize: 13, cursor: "pointer",
            }}>
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved ✓" : "Save this scenario"}
            </button>
          ) : (
            <div style={{ marginTop: 12, fontSize: 12.5, color: T.muted }}>
              Sign in to save this scenario for next time.
            </div>
          )}
        </div>
      )}

      {isAuthenticated && savedScenarios.length > 0 && (
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 12, padding: 18,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.white, marginBottom: 10 }}>
            Your saved scenarios
          </div>
          {savedScenarios.map((s) => (
            <div key={s.id} onClick={() => loadScenario(s)} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: `1px solid ${T.border}`, cursor: "pointer",
            }}>
              <span style={{ fontSize: 13, color: T.white }}>
                ₹{s.monthly_investment.toLocaleString("en-IN")}/mo · {s.years}yr · {(s.expected_annual_return*100).toFixed(0)}%
              </span>
              <span style={{ fontSize: 12, color: T.muted }}>
                {new Date(s.created_at).toLocaleDateString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}