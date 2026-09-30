import React, { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import CountUp from "react-countup";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Activity, RefreshCw, BarChart2 } from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { MetricCard } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { AgentLoader } from "../../components/animations/AgentLoader";
import { HealthScoreGauge } from "../../components/portfolio/HealthScoreGauge";
import { PortfolioInputForm } from "../../components/portfolio/PortfolioInputForm";
import { PortfolioBreakdownTable } from "../../components/portfolio/PortfolioBreakdownTable";
import { AIRecommendationsSection } from "../../components/portfolio/AIRecommendationsSection";
import { InsightsSection } from "../../components/portfolio/InsightsSection";
import { AIInvestmentReport } from "../../components/portfolio/AIInvestmentReport";
import {
  AssetAllocationChart,
  SectorAllocationChart,
  RiskDistributionChart,
  ExpectedGrowthChart,
  PortfolioHistoryChart,
} from "../../components/charts/PortfolioDoctorCharts";
import { analyzePortfolio, fetchMarketQuotes } from "../../services/marketService";
import { toast } from "sonner";
import { isDemoModeEnabled } from "../../utils/demoMode";
import "../../styles/portfolio-doctor.css";

const LOADER_STAGES = [
  "Analyzing portfolio...",
  "Running AI models...",
  "Evaluating risk and diversification...",
  "Generating recommendations...",
  "Finalizing AI Investment Report...",
];

const STAGE_INTERVAL_MS = Math.floor(110_000 / (LOADER_STAGES.length - 1));

// ─── Metric skeleton placeholder ────────────────────────────────────────────
function MetricSkeleton() {
  return (
    <div className="pd-metric-skeleton" />
  );
}

// ─── Safe number helper ──────────────────────────────────────────────────────
function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ─── Clamp to [0, 100] ──────────────────────────────────────────────────────
function clamp100(v) {
  return Math.min(100, Math.max(0, Math.round(safeNum(v))));
}

// ─── Compute all report metrics from raw holdings ───────────────────────────
function computeReport(rawHoldings, requestId, aiReport) {
  const n = rawHoldings.length || 1;

  // ── Financials ──
  const totalInvested   = rawHoldings.reduce((s, h) => s + safeNum(h.invested_amount), 0);
  const totalMarketValue = rawHoldings.reduce((s, h) => s + safeNum(h.market_value), 0);
  const totalPnl        = totalMarketValue - totalInvested;
  const totalPnlPct     = totalInvested > 0 ? +((totalPnl / totalInvested) * 100).toFixed(1) : 0;

  // ── Weights ──
  const holdingsWithWeight = rawHoldings.map((h) => ({
    ...h,
    weight: totalMarketValue > 0
      ? Math.round((safeNum(h.market_value, safeNum(h.quantity) * safeNum(h.buy_price)) / totalMarketValue) * 100)
      : Math.round(100 / n),
  }));

  // ── Risk ──
  const riskCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  holdingsWithWeight.forEach((h) => {
    const r = (h.overall_risk || "").toUpperCase();
    if (r.includes("HIGH"))   riskCounts.HIGH++;
    else if (r.includes("MEDIUM")) riskCounts.MEDIUM++;
    else riskCounts.LOW++;
  });
  const overallRisk = riskCounts.HIGH > 0 ? "HIGH" : riskCounts.MEDIUM > 0 ? "MEDIUM" : "LOW";

  // ── AI Confidence — backend sends 0–100 or 0–1; normalise to 0–100 ──
  const rawConf = rawHoldings.reduce((s, h) => s + safeNum(h.confidence), 0) / n;
  // If average > 1 it's already in percent; otherwise multiply by 100
  const aiConfidence = clamp100(rawConf > 1 ? rawConf : rawConf * 100);

  // ── Diversification (Herfindahl) ──
  const hhi = holdingsWithWeight.reduce((s, h) => s + Math.pow(h.weight / 100, 2), 0);
  const diversificationScore = Math.max(20, Math.round((1 - hhi) * 100));

  // ── Expected return & volatility from backend per-holding data ──
  const validReturns = rawHoldings
    .map((h) => safeNum(h.expected_return))
    .filter((v) => v !== 0);
  // expected_return from backend is a fraction (e.g. 0.08 = 8%)
  const avgExpectedReturn = validReturns.length > 0
    ? +((validReturns.reduce((s, v) => s + v, 0) / validReturns.length) * 100).toFixed(1)
    : (overallRisk === "HIGH" ? 14.5 : overallRisk === "MEDIUM" ? 11.2 : 8.5);

  const expectedVolatility = overallRisk === "HIGH" ? 22.4
    : overallRisk === "MEDIUM" ? 14.8 : 9.6;

  // ── Health Score — composite of 5 factors, each 0–20 ──
  //   1. AI Confidence component (0–20)
  const confComponent = (aiConfidence / 100) * 20;
  //   2. Diversification component (0–20)
  const divComponent = (diversificationScore / 100) * 20;
  //   3. Risk component: LOW=20, MEDIUM=12, HIGH=4
  const riskComponent = overallRisk === "LOW" ? 20 : overallRisk === "MEDIUM" ? 12 : 4;
  //   4. Return component: positive return up to 20%, capped at 20
  const retComponent = Math.min(20, Math.max(0, avgExpectedReturn));
  //   5. Model score component (0–20)
  const avgModelScore = rawHoldings.reduce((s, h) => s + safeNum(h.overall_score, 5), 0) / n;
  const scoreComponent = Math.min(20, (avgModelScore / 10) * 20);

  const rawHealth = confComponent + divComponent + riskComponent + retComponent + scoreComponent;
  const healthScore = clamp100(rawHealth);

  // ── Market Outlook — derived from risk + return, not hardcoded ──
  const marketOutlook = avgExpectedReturn >= 10 && overallRisk !== "HIGH" ? "BULLISH"
    : avgExpectedReturn <= 0 || overallRisk === "HIGH" ? "BEARISH"
    : "NEUTRAL";

  return {
    holdings: holdingsWithWeight,
    totalInvested,
    totalMarketValue,
    totalPnl,
    totalPnlPct,
    healthScore,
    overallRisk,
    expectedReturn: avgExpectedReturn,
    expectedVolatility,
    diversificationScore,
    aiConfidence,
    marketOutlook,
    requestId,
    ai_report: aiReport,
  };
}

function applyMarketQuotes(report, quotes) {
  const holdings = report.holdings.map((holding) => {
    const symbol = (holding.symbol || "").replace(/\.NS$/i, "").toUpperCase();
    const quote = quotes[symbol];
    if (!quote || !Number.isFinite(Number(quote.price))) return holding;

    const quantity = safeNum(holding.quantity);
    const investedAmount = safeNum(
      holding.invested_amount,
      quantity * safeNum(holding.buy_price)
    );
    const marketValue = quantity * Number(quote.price);
    const pnl = marketValue - investedAmount;

    return {
      ...holding,
      current_price: Number(quote.price),
      market_value: marketValue,
      invested_amount: investedAmount,
      pnl,
      pnl_percent: investedAmount > 0 ? +((pnl / investedAmount) * 100).toFixed(2) : 0,
      market_price_as_of: quote.as_of,
    };
  });

  const totalInvested = holdings.reduce((sum, holding) => sum + safeNum(holding.invested_amount), 0);
  const totalMarketValue = holdings.reduce((sum, holding) => sum + safeNum(holding.market_value), 0);
  const totalPnl = totalMarketValue - totalInvested;

  return {
    ...report,
    holdings: holdings.map((holding) => ({
      ...holding,
      weight: totalMarketValue > 0
        ? Math.round((safeNum(holding.market_value) / totalMarketValue) * 100)
        : holding.weight,
    })),
    totalInvested,
    totalMarketValue,
    totalPnl,
    totalPnlPct: totalInvested > 0 ? +((totalPnl / totalInvested) * 100).toFixed(1) : 0,
  };
}

export function PortfolioDoctorPage() {
  const context = useOutletContext();
  const isMobile = context?.isMobile || false;

  const inputFormRef = useRef(null);

  // States: 'input' | 'loading' | 'report' | 'error'
  const [viewState, setViewState] = useState("input");
  const [loaderStep, setLoaderStep] = useState(0);
  const [sourceReportData, setSourceReportData] = useState(null);
  const [portfolioQuotes, setPortfolioQuotes] = useState({ symbols: "", quotes: {} });
  const [errorDetails, setErrorDetails] = useState(null);
  const [lastSubmittedHoldings, setLastSubmittedHoldings] = useState([]);
  const portfolioSymbolList = [...new Set((sourceReportData?.holdings || [])
    .map((holding) => (holding.symbol || "").replace(/\.NS$/i, "").toUpperCase())
    .filter(Boolean))].join(",");
  const reportQuotes = portfolioQuotes.symbols === portfolioSymbolList ? portfolioQuotes.quotes : {};
  const reportData = sourceReportData ? applyMarketQuotes(sourceReportData, reportQuotes) : null;

  useEffect(() => {
    if (viewState !== "report" || !portfolioSymbolList) return undefined;

    let isMounted = true;
    const symbols = portfolioSymbolList.split(",");
    const refresh = () => fetchMarketQuotes(symbols)
      .then((data) => {
        if (isMounted) setPortfolioQuotes({ symbols: portfolioSymbolList, quotes: data.quotes || {} });
      })
      .catch((err) => console.warn("Portfolio quote fetch error:", err.message));

    refresh();
    const timer = setInterval(refresh, 5 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [viewState, portfolioSymbolList]);

  // Scroll to input form
  const scrollToForm = () => {
    if (inputFormRef.current) {
      inputFormRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Run real analysis through AI loader stages
  const handleAnalyze = async (holdingsPayload) => {
    if (isDemoModeEnabled()) {
      setLastSubmittedHoldings(holdingsPayload);
      setViewState("loading");
      setLoaderStep(0);
      setErrorDetails(null);
      const demoHoldings = [
        { symbol: "RELIANCE.NS", quantity: 10, buy_price: 2450, current_price: 2540, invested_amount: 24500, market_value: 25400, pnl: 900, pnl_percent: 3.67, overall_risk: "LOW", overall_score: 8.4, recommendation: "BUY", confidence: 0.88, trend: "BULLISH", reasoning: ["Momentum remains constructive after a healthy pullback.", "Diversification is strong across sector leaders."] },
        { symbol: "TCS.NS", quantity: 8, buy_price: 3850, current_price: 3720, invested_amount: 30800, market_value: 29760, pnl: -1040, pnl_percent: -3.38, overall_risk: "LOW", overall_score: 7.8, recommendation: "HOLD", confidence: 0.79, trend: "NEUTRAL", reasoning: ["Valuation remains stable while near-term growth is moderate.", "The position is suitable for steady income-oriented exposure."] },
        { symbol: "HDFCBANK.NS", quantity: 12, buy_price: 1680, current_price: 1745, invested_amount: 20160, market_value: 20940, pnl: 780, pnl_percent: 3.87, overall_risk: "MEDIUM", overall_score: 8.1, recommendation: "ACCUMULATE", confidence: 0.84, trend: "BULLISH", reasoning: ["Banking sector momentum is positive with improving breadth.", "The allocation remains within a controlled risk band."] },
      ];
      const totalInvested = demoHoldings.reduce((sum, h) => sum + (h.invested_amount || 0), 0);
      const totalMarketValue = demoHoldings.reduce((sum, h) => sum + (h.market_value || 0), 0);
      const totalPnl = totalMarketValue - totalInvested;
      const totalPnlPct = totalInvested > 0 ? ((totalPnl / totalInvested) * 100).toFixed(2) : 0;
      const holdingsWithWeight = demoHoldings.map((h) => ({ ...h, weight: Math.round(((h.market_value || 0) / totalMarketValue) * 100) }));
      const avgScore = demoHoldings.reduce((sum, h) => sum + (h.overall_score || 7.5), 0) / demoHoldings.length;
      const healthScore = Math.min(Math.round(avgScore * 10), 100);
      const hasHigh = holdingsWithWeight.some((h) => (h.overall_risk || "").toUpperCase().includes("HIGH"));
      const overallRisk = hasHigh ? "HIGH" : "MEDIUM";
      const demoReport = {
        holdings: holdingsWithWeight,
        totalInvested,
        totalMarketValue,
        totalPnl,
        totalPnlPct,
        healthScore,
        overallRisk,
        expectedReturn: 13.2,
        expectedVolatility: 12.8,
        diversificationScore: 82,
        aiConfidence: 86,
        marketOutlook: "BULLISH",
        ai_report: {
          summary: "Demo portfolio remains resilient with balanced quality holdings and disciplined diversification.",
          strengths: ["Diversified across large-cap blue chips", "Healthy allocation to quality financials"],
          risks: ["Cyclicality remains elevated in the broader market"],
          recommendations: ["Maintain trailing stop losses and rebalance if risk rises"],
          outlook: "The demo outlook remains constructive while staying selective.",
          confidence_note: "Demo confidence is intentionally conservative and explanatory.",
        },
      };
      setSourceReportData(demoReport);
      setViewState("report");
      toast.success("Demo portfolio analysis is ready.");
      return;
    }

    setLastSubmittedHoldings(holdingsPayload);
    setViewState("loading");
    setLoaderStep(0);
    setErrorDetails(null);

    let stageInterval;

    try {
      // Advance loader stages proportionally across the 120 s window
      let currentStep = 0;
      stageInterval = setInterval(() => {
        currentStep++;
        if (currentStep < LOADER_STAGES.length - 1) {
          setLoaderStep(currentStep);
        } else {
          clearInterval(stageInterval);
        }
      }, STAGE_INTERVAL_MS);

      const res = await analyzePortfolio(holdingsPayload);
      clearInterval(stageInterval);

      // Finish loader stages cleanly
      setLoaderStep(LOADER_STAGES.length - 1);
      await new Promise((resolve) => setTimeout(resolve, 400));

      if (res && (res.success !== false) && (res.data?.holdings || res.holdings)) {
        const rawHoldings = res.data?.holdings || res.holdings || [];
        const requestId   = res.request_id || res.data?.request_id || null;
        const aiReport    = res.data?.ai_report || res.ai_report
          || rawHoldings.find((h) => h.ai_report)?.ai_report || null;

        setSourceReportData(computeReport(rawHoldings, requestId, aiReport));
        setViewState("report");
        toast.success("AI Portfolio Analysis completed successfully!");
      } else {
        const errObj = new Error(res?.error?.message || res?.message || "Failed to analyze portfolio.");
        errObj.code = res?.error?.code || "ANALYSIS_FAILED";
        errObj.requestId = res?.request_id;
        throw errObj;
      }
    } catch (err) {
      clearInterval(stageInterval);
      // Detect Axios timeout (ECONNABORTED) or our own 120 s limit
      const isTimeout =
        err.code === "ECONNABORTED" ||
        err.message?.toLowerCase().includes("timeout") ||
        err.message?.toLowerCase().includes("network error");
      setErrorDetails({
        message: isTimeout
          ? "Portfolio analysis is taking longer than expected. Please wait a moment and try again."
          : err.message || "An unexpected error occurred during portfolio analysis.",
        code: isTimeout ? "TIMEOUT" : (err.code || err.status || "API_ERROR"),
        requestId: err.requestId || err.data?.request_id || "req_" + Math.random().toString(36).substring(2, 9),
      });
      setViewState("error");
      toast.error(
        isTimeout
          ? "Analysis timed out. Please try again."
          : "Portfolio analysis could not be completed."
      );
    }
  };

  const handleRetry = () => {
    if (lastSubmittedHoldings && lastSubmittedHoldings.length > 0) {
      handleAnalyze(lastSubmittedHoldings);
    } else {
      setViewState("input");
    }
  };

  return (
    <PageTransition>
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
        {/* SECTION 1: HERO */}
        <section style={{ marginBottom: "32px", textAlign: "left" }}>
          <div className="pd-hero-badge">
            <Sparkles size={14} color="var(--color-teal)" />
            <span>FLAGSHIP AI FEATURE</span>
          </div>

          <h1 className="pd-hero-title">Portfolio Doctor</h1>

          <p className="pd-hero-subtitle">
            AI-powered portfolio health analysis, diversification, and risk insights using multi-agent model fusion.
          </p>

          <Button
            variant="primary"
            size="lg"
            icon={ArrowRight}
            iconPosition="right"
            onClick={scrollToForm}
            style={{ paddingLeft: "24px", paddingRight: "24px" }}
          >
            Analyze Portfolio
          </Button>
        </section>

        {/* SECTION 2 & 3: FORM / AI PIPELINE LOADER / ERROR STATES */}
        <div ref={inputFormRef}>
          <AnimatePresence mode="wait">
            {viewState === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <AgentLoader
                  title="Running AI Portfolio Doctor Pipeline..."
                  steps={LOADER_STAGES}
                  step={loaderStep}
                />
                {/* Skeleton preview of the metrics grid */}
                <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "300px 1fr", gap: 16 }}>
                  <div className="pd-metric-skeleton" style={{ height: 260, borderRadius: 16 }} />
                  <div className="pd-metrics-grid">
                    {Array.from({ length: 6 }).map((_, i) => <MetricSkeleton key={i} />)}
                  </div>
                </div>
              </motion.div>
            )}

            {viewState === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <ErrorState
                  title="Portfolio Doctor Analysis Failed"
                  description={errorDetails?.message}
                  code={errorDetails?.code}
                  requestId={errorDetails?.requestId}
                  onRetry={handleRetry}
                />
              </motion.div>
            )}

            {(viewState === "input" || viewState === "report") && (
              <motion.div
                key="input-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <PortfolioInputForm onAnalyze={handleAnalyze} loading={viewState === "loading"} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SECTION 4 - 8: PORTFOLIO REPORT VIEW */}
        {viewState === "report" && reportData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginTop: "32px" }}
          >
            {/* Header divider */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                paddingBottom: "12px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>
                <Badge variant="teal" size="sm" style={{ marginBottom: "6px" }}>
                  ANALYSIS COMPLETE
                </Badge>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  AI Portfolio Health Report
                </h2>
              </div>

              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => setViewState("input")}>
                New Analysis
              </Button>
            </div>

            {/* SECTION 4: HEALTH SCORE GAUGE & ANIMATED METRIC CARDS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "300px 1fr",
                gap: "16px",
                marginBottom: "24px",
                alignItems: "stretch",
              }}
            >
              <HealthScoreGauge score={reportData.healthScore} isMobile={isMobile} />

              <div className="pd-metrics-grid">
                {/* OVERALL RISK */}
                <MetricCard
                  label="OVERALL RISK"
                  value={reportData.overallRisk}
                  sub="Weighted across holdings"
                  tooltip="Highest risk tier across all holdings. HIGH = at least one high-risk position."
                  color={
                    reportData.overallRisk === "HIGH" ? "var(--danger)"
                    : reportData.overallRisk === "MEDIUM" ? "var(--warning)"
                    : "var(--success)"
                  }
                />

                {/* EXPECTED RETURN */}
                <MetricCard
                  label="EXPECTED RETURN"
                  value={<><CountUp end={reportData.expectedReturn} decimals={1} duration={1.5} />%</>}
                  sub="Avg annualised estimate"
                  tooltip="Average expected return across holdings, derived from LSTM price projections."
                  color={
                    reportData.expectedReturn >= 10 ? "var(--success)"
                    : reportData.expectedReturn >= 0 ? "var(--color-teal)"
                    : "var(--danger)"
                  }
                />

                {/* EXPECTED VOLATILITY */}
                <MetricCard
                  label="VOLATILITY"
                  value={<><CountUp end={reportData.expectedVolatility} decimals={1} duration={1.5} />%</>}
                  sub="Historical variance"
                  tooltip="Estimated annualised price volatility. Higher = wider price swings."
                  color={
                    reportData.expectedVolatility <= 12 ? "var(--success)"
                    : reportData.expectedVolatility <= 20 ? "var(--warning)"
                    : "var(--danger)"
                  }
                />

                {/* DIVERSIFICATION */}
                <MetricCard
                  label="DIVERSIFICATION"
                  value={<><CountUp end={reportData.diversificationScore} duration={1.5} /><span style={{fontSize:"0.7em"}}>/100</span></>}
                  sub="HHI asset spread"
                  tooltip="Herfindahl index: 100 = perfectly spread, 0 = single holding. Above 60 is healthy."
                  color={
                    reportData.diversificationScore >= 60 ? "var(--success)"
                    : reportData.diversificationScore >= 35 ? "var(--warning)"
                    : "var(--danger)"
                  }
                />

                {/* AI CONFIDENCE */}
                <MetricCard
                  label="AI CONFIDENCE"
                  value={<><CountUp end={reportData.aiConfidence} duration={1.5} />%</>}
                  sub="Model agreement"
                  tooltip="Average calibrated confidence across RF, LSTM, and FinBERT models. Always 0–100%."
                  color={
                    reportData.aiConfidence >= 70 ? "var(--color-teal)"
                    : reportData.aiConfidence >= 50 ? "var(--warning)"
                    : "var(--danger)"
                  }
                />

                {/* MARKET OUTLOOK */}
                <MetricCard
                  label="MARKET OUTLOOK"
                  value={reportData.marketOutlook}
                  sub="Derived from risk + return"
                  tooltip="BULLISH when expected return ≥ 10% and risk is not HIGH. BEARISH when return ≤ 0% or risk is HIGH."
                  color={
                    reportData.marketOutlook === "BULLISH" ? "var(--success)"
                    : reportData.marketOutlook === "BEARISH" ? "var(--danger)"
                    : "var(--warning)"
                  }
                />
              </div>
            </div>

            {/* SECTION 4.5: AI INVESTMENT REPORT */}
            <AIInvestmentReport report={reportData.ai_report} />

            {/* SECTION 5: CHARTS GRID */}
            <div style={{ marginBottom: "28px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "14px",
                }}
              >
                <BarChart2 size={18} color="var(--color-teal)" />
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  PORTFOLIO ANALYTICS & CHARTS
                </h3>
              </div>

              <div className="pd-charts-grid">
                <AssetAllocationChart data={reportData.holdings} isMobile={isMobile} />
                <SectorAllocationChart data={reportData.holdings} isMobile={isMobile} />
                <RiskDistributionChart data={reportData.holdings} isMobile={isMobile} />
                <PortfolioHistoryChart data={reportData.holdings} quotes={reportQuotes} />
                <ExpectedGrowthChart
                  expectedReturnPct={reportData.expectedReturn}
                  initialCapital={reportData.totalMarketValue || 100000}
                />
              </div>
            </div>

            {/* SECTION 6: AI RECOMMENDATIONS */}
            <AIRecommendationsSection holdings={reportData.holdings} />

            {/* SECTION 7: PORTFOLIO BREAKDOWN TABLE */}
            <PortfolioBreakdownTable holdings={reportData.holdings} />

            {/* SECTION 8: INSIGHTS SECTION */}
            <InsightsSection holdings={reportData.holdings} />
          </motion.div>
        )}

        {/* SECTION EMPTY STATE FALLBACK */}
        {viewState === "input" && (!lastSubmittedHoldings || lastSubmittedHoldings.length === 0) && (
          <EmptyState
            title="Ready to Analyze Your Portfolio"
            description="Add your first stock holding above or click one of the preset sample portfolios to generate an instant AI Health Report."
            icon={Activity}
          />
        )}
      </div>
    </PageTransition>
  );
}

export default PortfolioDoctorPage;
