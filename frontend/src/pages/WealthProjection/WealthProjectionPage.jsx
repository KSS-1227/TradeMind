import React, { useState, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import {
  Calculator,
  Target,
  TrendingUp,
  PieChart,
  Sparkles,
  AlertTriangle,
  Zap,
  CalendarDays,
  Landmark,
  WalletCards,
  ShieldCheck,
} from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { Card, MetricCard } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ErrorState } from "../../components/common/ErrorState";
import { calculateWealthProjection } from "../../services/marketService";
import { isDemoModeEnabled } from "../../utils/demoMode";
import {
  GrowthTimelineChart,
  ContributionProfitChart,
  GoalAchievementChart,
} from "../../components/charts/WealthCharts";
import { toast } from "sonner";
import "../../styles/wealth-projection.css";

/* ── Formatting helpers ── */
const lakh = (v) => {
  if (!v && v !== 0) return "—";
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  return `₹${Number(v).toLocaleString("en-IN")}`;
};

/* ── Goal presets ── */
const GOAL_PRESETS = [
  { label: "🏠 Home Loan",     amount: 5000000,  years: 10 },
  { label: "🎓 Child Education", amount: 2500000, years: 15 },
  { label: "✈️ World Tour",    amount: 1000000,  years: 5  },
  { label: "🏖️ Retirement",    amount: 10000000, years: 25 },
  { label: "💼 Business",      amount: 3000000,  years: 8  },
  { label: "🚗 Dream Car",     amount: 2000000,  years: 6  },
];

/* ── Chart tabs ── */
const TABS = [
  { id: "growth",       label: "Growth Timeline",        icon: TrendingUp  },
  { id: "contribution", label: "Contribution vs Profit", icon: PieChart    },
  { id: "goal",         label: "Goal Achievement",       icon: Target      },
];

/* ── Slider field component ── */
function SliderField({ label, value, min, max, step, onChange, format }) {
  return (
    <div className="wp-field-row">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <label className="wp-field-label">{label}</label>
        <span className="wp-slider-val">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        className="wp-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--color-teal) 0%, var(--color-teal) ${((value - min) / (max - min)) * 100}%, var(--bg-elevated) ${((value - min) / (max - min)) * 100}%, var(--bg-elevated) 100%)`,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
export function WealthProjectionPage() {
  const context = useOutletContext();
  const isMobile = context?.isMobile || false;

  /* ── Form state ── */
  const [goalAmount, setGoalAmount]       = useState(5000000);
  const [monthly, setMonthly]             = useState(15000);
  const [lumpsum, setLumpsum]             = useState(0);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [inflation, setInflation]         = useState(6);
  const [years, setYears]                 = useState(15);
  const [currentAge, setCurrentAge]       = useState(30);
  const [crashEnabled, setCrashEnabled]   = useState(false);
  const [crashYear, setCrashYear]         = useState(5);
  const [crashPct, setCrashPct]           = useState(20);
  const [activePreset, setActivePreset]   = useState(null);

  /* ── Result state ── */
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [activeTab, setActiveTab] = useState("growth");

  /* ── Goal preset handler ── */
  const applyPreset = (preset, idx) => {
    setGoalAmount(preset.amount);
    setYears(preset.years);
    setActivePreset(idx);
  };

  /* ── Real-time pre-calculation for AI recommendation ── */
  const projectedFV = useMemo(() => {
    const r = expectedReturn / 100 / 12;
    const n = years * 12;
    const sipFV = monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    const lumpFV = lumpsum * Math.pow(1 + expectedReturn / 100, years);
    return sipFV + lumpFV;
  }, [monthly, lumpsum, expectedReturn, years]);

  const goalProgress = goalAmount > 0 ? Math.min((projectedFV / goalAmount) * 100, 100) : 0;
  const totalInvested = monthly * years * 12 + lumpsum;
  const realReturn = expectedReturn - inflation;
  const inflationAdjustedCorpus = projectedFV / Math.pow(1 + inflation / 100, years);
  const estimatedMonthlyIncome = (inflationAdjustedCorpus * 0.04) / 12;
  const retirementAge = currentAge + years;
  const planStatus = goalProgress >= 100 ? "On track" : goalProgress >= 75 ? "Within reach" : "Needs attention";

  /* ── Submit handler ── */
  const runProjection = useCallback(async () => {
    if (isDemoModeEnabled()) {
      setLoading(true);
      setError(null);
      setTimeout(() => {
        setResult({
          summary: {
            invested_amount: monthly * years * 12,
            projected_value: 3150000,
            estimated_gain: 1650000,
            inflation_adjusted_value: 2210000,
            real_return: 8.6,
            wealth_multiple: 2.8,
          },
          yearly_breakdown: Array.from({ length: 15 }, (_, index) => ({
            year: index + 1,
            opening_balance: 0,
            yearly_contribution: monthly * 12,
            yearly_interest: 28000 + index * 1800,
            invested: monthly * 12 * (index + 1),
            corpus: 220000 + index * 180000,
            gain: 120000 + index * 14000,
          })),
          metadata: { annual_return: expectedReturn, inflation, years, generated_at: new Date().toISOString() },
          historical_analysis: { recommendation: "BUY", confidence: 83, trend: "BULLISH" },
          goal_probability: { probability: 0.83 },
          advisor_context: { note: "Demo wealth projection shows strong compounding potential." },
        });
        setLoading(false);
        setActiveTab("growth");
        toast.success("Demo wealth projection is ready.");
      }, 900);
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    const body = {
      monthly_investment: monthly,
      years,
      expected_annual_return: expectedReturn / 100,
    };
    if (lumpsum > 0) body.lump_sum = lumpsum;
    if (crashEnabled) {
      body.market_crash_year = crashYear;
      body.market_crash_pct  = crashPct / 100;
    }

    try {
      const data = await calculateWealthProjection(body);
      setResult(data);
      setActiveTab("growth");
      toast.success("Wealth projection complete!");
    } catch (err) {
      setError({ message: err.message || "Failed to calculate projection.", code: err.status || "WP_ERROR" });
      toast.error("Projection failed.");
    } finally {
      setLoading(false);
    }
  }, [monthly, lumpsum, expectedReturn, years, crashEnabled, crashYear, crashPct, inflation]);

  /* ── AI Insight text ── */
  const getAIInsight = () => {
    if (goalProgress >= 100)
      return `✅ Your current SIP of ${lakh(monthly)}/month will exceed your goal of ${lakh(goalAmount)} by ${lakh(projectedFV - goalAmount)}. Consider increasing equity allocation for even higher returns.`;
    if (goalProgress >= 75)
      return `📈 You are ${goalProgress.toFixed(0)}% of the way to your goal. Increase monthly SIP by ${lakh((goalAmount - projectedFV) / (years * 12))} to close the gap.`;
    return `⚠️ Current plan reaches only ${goalProgress.toFixed(0)}% of your ${lakh(goalAmount)} goal. Consider increasing SIP to ${lakh(Math.ceil(goalAmount / ((Math.pow(1 + expectedReturn/1200, years*12)-1)/(expectedReturn/1200)) / 1000) * 1000)}/month.`;
  };

  return (
    <PageTransition>
      <div style={{ maxWidth: 1280, margin: "0 auto", paddingBottom: 48 }}>

        {/* ══ HERO ══ */}
        <section className="wp-hero">
          <div className="wp-hero-eyebrow">
            <Zap size={13} /> AI WEALTH PROJECTION ENGINE · COMPOUND GROWTH SIMULATOR
          </div>
          <h1 className="wp-hero-title">Wealth Projection</h1>
          <p className="wp-hero-sub">
            Simulate your SIP and lumpsum compound growth with inflation-adjusted real returns,
            market crash stress tests, and AI-powered goal achievement analysis.
          </p>
        </section>

        {/* ══ GOAL PRESETS ══ */}
        <div style={{ marginBottom: 24 }}>
          <div className="wp-field-label" style={{ marginBottom: 10 }}>CHOOSE YOUR FINANCIAL GOAL</div>
          <div className="wp-goal-grid">
            {GOAL_PRESETS.map((preset, i) => (
              <button
                key={i}
                type="button"
                className={`wp-goal-chip ${activePreset === i ? "active" : ""}`}
                onClick={() => applyPreset(preset, i)}
              >
                <div style={{ fontSize: 15, marginBottom: 3 }}>{preset.label.split(" ")[0]}</div>
                <div style={{ fontWeight: 700 }}>{preset.label.split(" ").slice(1).join(" ")}</div>
                <div style={{ fontSize: 10, color: "inherit", opacity: 0.7, marginTop: 2 }}>
                  {lakh(preset.amount)} · {preset.years}yr
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Retirement outlook: keeps long-term purchasing power visible while planning any goal. */}
        <section className="wp-retirement-section" aria-label="Retirement outlook">
          <div className="wp-section-heading">
            <div>
              <span className="wp-field-label">RETIREMENT READINESS</span>
              <h2>Your future, in today&apos;s money</h2>
            </div>
            <div className={`wp-plan-status ${goalProgress >= 100 ? "is-on-track" : goalProgress >= 75 ? "is-close" : "needs-work"}`}>
              <span /> {planStatus}
            </div>
          </div>
          <div className="wp-retirement-grid">
            <article className="wp-retirement-card">
              <div className="wp-retirement-icon blue"><CalendarDays size={17} /></div>
              <div>
                <span>Retirement window</span>
                <strong>Age {retirementAge}</strong>
                <small>{years} years from today</small>
              </div>
            </article>
            <article className="wp-retirement-card">
              <div className="wp-retirement-icon teal"><Landmark size={17} /></div>
              <div>
                <span>Corpus in today&apos;s value</span>
                <strong><CountUp key={`real-corpus-${inflationAdjustedCorpus.toFixed(0)}`} end={inflationAdjustedCorpus} duration={0.65} formattingFn={lakh} /></strong>
                <small>Adjusted for {inflation}% inflation</small>
              </div>
            </article>
            <article className="wp-retirement-card">
              <div className="wp-retirement-icon gold"><WalletCards size={17} /></div>
              <div>
                <span>Potential monthly income</span>
                <strong><CountUp key={`income-${estimatedMonthlyIncome.toFixed(0)}`} end={estimatedMonthlyIncome} duration={0.65} formattingFn={lakh} /></strong>
                <small>Based on a 4% annual withdrawal</small>
              </div>
            </article>
          </div>
        </section>

        {/* ══ MAIN 2-COLUMN LAYOUT ══ */}
        <div className="wp-layout">

          {/* ── LEFT: FORM PANEL ── */}
          <div className="wp-form-panel">
            <Card style={{ padding: "22px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <Calculator size={16} color="var(--color-gold, #FBBF24)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  PROJECTION PARAMETERS
                </span>
              </div>

              {/* Goal Amount Input */}
              <div className="wp-field-row">
                <label className="wp-field-label">TARGET GOAL AMOUNT (₹)</label>
                <input
                  type="number"
                  className="wp-input"
                  value={goalAmount}
                  onChange={(e) => { setGoalAmount(Number(e.target.value)); setActivePreset(null); }}
                  placeholder="50,00,000"
                />
                <div style={{ fontSize: 11, color: "var(--color-gold, #FBBF24)", marginTop: 5, fontWeight: 600 }}>
                  {lakh(goalAmount)}
                </div>
              </div>

              {/* Monthly SIP Slider */}
              <SliderField
                label="MONTHLY SIP (₹)"
                value={monthly}
                min={1000}
                max={200000}
                step={1000}
                onChange={setMonthly}
                format={(v) => `₹${v.toLocaleString("en-IN")}`}
              />

              {/* Lumpsum Input */}
              <div className="wp-field-row">
                <label className="wp-field-label">LUMPSUM INVESTMENT (₹) — OPTIONAL</label>
                <input
                  type="number"
                  className="wp-input"
                  value={lumpsum}
                  onChange={(e) => setLumpsum(Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              {/* Expected Return Slider */}
              <SliderField
                label="EXPECTED ANNUAL RETURN (%)"
                value={expectedReturn}
                min={4}
                max={30}
                step={0.5}
                onChange={setExpectedReturn}
                format={(v) => `${v}%`}
              />

              {/* Inflation Slider */}
              <SliderField
                label="INFLATION RATE (%)"
                value={inflation}
                min={2}
                max={12}
                step={0.5}
                onChange={setInflation}
                format={(v) => `${v}%`}
              />

              {/* Years Slider */}
              <SliderField
                label="INVESTMENT HORIZON (YEARS)"
                value={years}
                min={1}
                max={40}
                step={1}
                onChange={(value) => {
                  setYears(value);
                  setCrashYear((activeCrashYear) => Math.min(activeCrashYear, value));
                }}
                format={(v) => `${v} yrs`}
              />

              <SliderField
                label="CURRENT AGE"
                value={currentAge}
                min={18}
                max={60}
                step={1}
                onChange={setCurrentAge}
                format={(v) => `${v} years`}
              />

              {/* Real Return Summary */}
              <div
                style={{
                  padding: "10px 14px",
                  background: realReturn >= 0 ? "rgba(0,201,167,0.07)" : "rgba(239,68,68,0.07)",
                  border: `1px solid ${realReturn >= 0 ? "var(--color-teal-border)" : "var(--danger-border)"}`,
                  borderRadius: "var(--radius-md)",
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>Real Return (After Inflation)</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    color: realReturn >= 0 ? "var(--color-teal)" : "var(--danger)",
                  }}
                >
                  {realReturn >= 0 ? "+" : ""}{realReturn.toFixed(1)}%
                </span>
              </div>

              <div className="wp-sip-note">
                <ShieldCheck size={14} />
                <span>Your plan compounds at <strong>{expectedReturn.toFixed(1)}%</strong>; its estimated purchasing-power return is <strong>{realReturn.toFixed(1)}%</strong>.</span>
              </div>

              {/* Crash Stress Test Toggle */}
              <div
                className="wp-toggle-row"
                onClick={() => setCrashEnabled((v) => !v)}
              >
                <AlertTriangle
                  size={16}
                  color={crashEnabled ? "var(--danger)" : "var(--text-muted)"}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                    Market Crash Stress Test
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Simulate a market downturn in your projection
                  </div>
                </div>
                <div
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    background: crashEnabled ? "var(--danger)" : "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    position: "relative",
                    transition: "background 0.2s",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#fff",
                      top: 2,
                      left: crashEnabled ? 18 : 2,
                      transition: "left 0.2s",
                    }}
                  />
                </div>
              </div>

              {/* Crash params */}
              <AnimatePresence>
                {crashEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <SliderField
                      label="CRASH YEAR"
                      value={crashYear}
                      min={1}
                      max={years}
                      step={1}
                      onChange={setCrashYear}
                      format={(v) => `Year ${v}`}
                    />
                    <SliderField
                      label="CRASH SEVERITY (%)"
                      value={crashPct}
                      min={5}
                      max={60}
                      step={5}
                      onChange={setCrashPct}
                      format={(v) => `-${v}%`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                onClick={runProjection}
                loading={loading}
                icon={Calculator}
                size="lg"
                fullWidth
              >
                {loading ? "Calculating…" : "Project My Wealth"}
              </Button>
            </Card>
          </div>

          {/* ── RIGHT: RESULTS PANEL ── */}
          <div>
            {/* Live Pre-calculation Summary (always visible) */}
            <Card style={{ marginBottom: 20, padding: "18px 22px" }} hoverLift={false}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <Zap size={14} color="var(--color-gold, #FBBF24)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                  LIVE ESTIMATE (BEFORE BACKEND CALCULATION)
                </span>
              </div>

              <div className="wp-kpi-strip">
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-teal)", fontFamily: "var(--font-mono)" }}>
                    <CountUp
                      key={`pv-${projectedFV.toFixed(0)}`}
                      end={projectedFV}
                      duration={0.8}
                      separator=","
                      formattingFn={(n) => lakh(n)}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginTop: 3, textTransform: "uppercase" }}>
                    Projected Value
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-gold, #FBBF24)", fontFamily: "var(--font-mono)" }}>
                    <CountUp
                      key={`ti-${totalInvested}`}
                      end={totalInvested}
                      duration={0.8}
                      formattingFn={(n) => lakh(n)}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginTop: 3, textTransform: "uppercase" }}>
                    Total Invested
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      fontFamily: "var(--font-mono)",
                      color: projectedFV - totalInvested >= 0 ? "var(--success)" : "var(--danger)",
                    }}
                  >
                    <CountUp
                      key={`gains-${(projectedFV - totalInvested).toFixed(0)}`}
                      end={projectedFV - totalInvested}
                      duration={0.8}
                      formattingFn={(n) => lakh(n)}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginTop: 3, textTransform: "uppercase" }}>
                    Est. Gains
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  {/* Goal Progress Ring */}
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <svg width="56" height="56" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="var(--bg-elevated)" strokeWidth="5" />
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        fill="none"
                        stroke={goalProgress >= 100 ? "var(--color-teal)" : "var(--color-gold, #FBBF24)"}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${(goalProgress / 100) * 138.2} 138.2`}
                        transform="rotate(-90 28 28)"
                        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)" }}
                      />
                      <text x="28" y="32" textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="800">
                        {Math.round(goalProgress)}%
                      </text>
                    </svg>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginTop: 2, textTransform: "uppercase" }}>
                    Goal Progress
                  </div>
                </div>
              </div>
            </Card>

            {/* AI Recommendation Card */}
            <div className="wp-ai-card">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Sparkles size={18} color="var(--color-gold, #FBBF24)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-gold, #FBBF24)", marginBottom: 6, letterSpacing: "0.5px" }}>
                    AI WEALTH COPILOT RECOMMENDATION
                  </div>
                  <p style={{ fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.65, margin: 0 }}>
                    {getAIInsight()}
                  </p>
                  <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Real return after inflation:{" "}
                      <strong style={{ color: realReturn >= 0 ? "var(--color-teal)" : "var(--danger)" }}>
                        {realReturn >= 0 ? "+" : ""}{realReturn.toFixed(1)}%
                      </strong>
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Wealth multiplier:{" "}
                      <strong style={{ color: "var(--color-gold, #FBBF24)" }}>
                        {totalInvested > 0 ? (projectedFV / totalInvested).toFixed(1) : "—"}×
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error State */}
            {error && !loading && (
              <ErrorState
                title="Projection Failed"
                description={error.message}
                code={error.code}
                onRetry={runProjection}
              />
            )}

            {/* Backend Result Cards + Charts */}
            <AnimatePresence>
              {result && !loading && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* KPI Grid */}
                  <div className="wp-kpi-strip" style={{ marginBottom: 20 }}>
                    <MetricCard
                      label="Total Invested"
                      value={lakh(result.total_invested)}
                      sub={`${years} year horizon`}
                      color="var(--color-gold, #FBBF24)"
                    />
                    <MetricCard
                      label="Final Wealth"
                      value={lakh(result.total_value)}
                      sub="Projected corpus"
                      color="var(--color-teal)"
                    />
                    <MetricCard
                      label="Compounded Gains"
                      value={lakh(result.total_gains)}
                      sub="Pure compound growth"
                      color="var(--success)"
                    />
                    <MetricCard
                      label="Goal Achievement"
                      value={goalAmount > 0 ? `${Math.min(((result.total_value / goalAmount) * 100), 999).toFixed(0)}%` : "—"}
                      sub={lakh(goalAmount) + " target"}
                      color={result.total_value >= goalAmount ? "var(--success)" : "var(--warning)"}
                    />
                  </div>

                  {/* Milestone Timeline */}
                  <Card style={{ padding: "18px 22px", marginBottom: 20 }} hoverLift={false}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <Target size={15} color="var(--color-teal)" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                        WEALTH MILESTONES
                      </span>
                    </div>
                    {(result.yearly_breakdown || [])
                      .filter((_, i) => i % 5 === 4 || i === 0)
                      .map((d, i) => {
                        const pct = goalAmount > 0 ? Math.min((d.value / goalAmount) * 100, 100) : 0;
                        return (
                          <div key={i} className="wp-milestone">
                            <div className="wp-milestone-dot" style={{ background: pct >= 100 ? "var(--color-teal)" : "var(--color-gold, #FBBF24)" }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                                Year {d.year}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                Portfolio Value: <strong style={{ color: "var(--color-teal)" }}>{lakh(d.value)}</strong>
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                fontFamily: "var(--font-mono)",
                                fontWeight: 700,
                                color: pct >= 100 ? "var(--success)" : "var(--color-gold, #FBBF24)",
                              }}
                            >
                              {pct.toFixed(0)}% of goal
                            </div>
                          </div>
                        );
                      })}
                  </Card>

                  {/* Tabbed Charts */}
                  <Card style={{ padding: "0 0 20px 0", overflow: "hidden" }} hoverLift={false}>
                    <div className="wp-tabs" style={{ padding: "0 22px" }}>
                      {TABS.map((tab) => {
                        const IconComp = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            className={`wp-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                            onClick={() => setActiveTab(tab.id)}
                          >
                            <IconComp size={12} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ padding: "0 22px" }}>
                      <AnimatePresence mode="wait">
                        {activeTab === "growth" && (
                          <motion.div
                            key="growth"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.22 }}
                          >
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                              <span style={{ color: "var(--color-teal)" }}>━━</span> Portfolio Value &nbsp;
                              <span style={{ color: "var(--color-gold, #FBBF24)" }}>╌╌</span> Capital Invested
                            </div>
                            <GrowthTimelineChart
                              data={result.yearly_breakdown}
                              isMobile={isMobile}
                            />
                          </motion.div>
                        )}

                        {activeTab === "contribution" && (
                          <motion.div
                            key="contribution"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.22 }}
                          >
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                              How much is your money working for you vs. how much you put in.
                            </div>
                            <ContributionProfitChart
                              invested={result.total_invested}
                              gains={result.total_gains}
                            />
                          </motion.div>
                        )}

                        {activeTab === "goal" && (
                          <motion.div
                            key="goal"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.22 }}
                          >
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                              Year-by-year progress toward your goal of{" "}
                              <strong style={{ color: "var(--color-gold, #FBBF24)" }}>{lakh(goalAmount)}</strong>
                            </div>
                            <GoalAchievementChart
                              data={result.yearly_breakdown}
                              goalAmount={goalAmount}
                              isMobile={isMobile}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {!result && !loading && !error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Card
                  style={{
                    textAlign: "center",
                    padding: "56px 32px",
                    background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)",
                  }}
                  hoverLift={false}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "rgba(251,191,36,0.1)",
                      border: "1px solid rgba(251,191,36,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 20px",
                    }}
                  >
                    <TrendingUp size={28} color="var(--color-gold, #FBBF24)" />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
                    Configure &amp; Project Your Wealth
                  </h2>
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--text-secondary)",
                      maxWidth: 400,
                      margin: "0 auto 24px",
                      lineHeight: 1.6,
                    }}
                  >
                    Select a goal preset above, adjust your SIP amount and time horizon using the sliders,
                    then click <strong>Project My Wealth</strong> to see charts and AI analysis.
                  </p>
                  <Button onClick={runProjection} icon={Calculator} loading={loading}>
                    Project My Wealth
                  </Button>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default WealthProjectionPage;
