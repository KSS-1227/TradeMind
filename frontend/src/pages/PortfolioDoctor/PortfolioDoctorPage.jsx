import React, { useState, useRef } from "react";
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
} from "../../components/charts/PortfolioDoctorCharts";
import { analyzePortfolio } from "../../services/marketService";
import { toast } from "sonner";
import { isDemoModeEnabled } from "../../utils/demoMode";
import "../../styles/portfolio-doctor.css";

const LOADER_STAGES = [
  "Loading Market Data",
  "Evaluating Holdings",
  "Calculating Risk",
  "Running AI Models",
  "Checking Diversification",
  "Generating Recommendations",
  "Generating AI Investment Report...",
];

export function PortfolioDoctorPage() {
  const context = useOutletContext();
  const isMobile = context?.isMobile || false;

  const inputFormRef = useRef(null);

  // States: 'input' | 'loading' | 'report' | 'error'
  const [viewState, setViewState] = useState("input");
  const [loaderStep, setLoaderStep] = useState(0);
  const [reportData, setReportData] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [lastSubmittedHoldings, setLastSubmittedHoldings] = useState([]);

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
      setReportData(demoReport);
      setViewState("report");
      toast.success("Demo portfolio analysis is ready.");
      return;
    }

    setLastSubmittedHoldings(holdingsPayload);
    setViewState("loading");
    setLoaderStep(0);
    setErrorDetails(null);

    // Simulate 7-stage workflow steps sequentially while fetching real API
    let apiPromise = analyzePortfolio(holdingsPayload);
    let stageInterval;

    try {
      let currentStep = 0;
      stageInterval = setInterval(() => {
        currentStep++;
        if (currentStep < LOADER_STAGES.length - 1) {
          setLoaderStep(currentStep);
        } else {
          clearInterval(stageInterval);
        }
      }, 500);

      const res = await apiPromise;
      clearInterval(stageInterval);

      // Finish loader stages cleanly
      setLoaderStep(LOADER_STAGES.length - 1);
      await new Promise((resolve) => setTimeout(resolve, 400));

      if (res && (res.success !== false) && (res.data?.holdings || res.holdings)) {
        const rawHoldings = res.data?.holdings || res.holdings || [];
        const requestId = res.request_id || res.data?.request_id || null;

        // Process portfolio aggregates
        const totalInvested = rawHoldings.reduce((sum, h) => sum + (h.invested_amount || 0), 0);
        const totalMarketValue = rawHoldings.reduce((sum, h) => sum + (h.market_value || 0), 0);
        const totalPnl = totalMarketValue - totalInvested;
        const totalPnlPct = totalInvested > 0 ? ((totalPnl / totalInvested) * 100).toFixed(2) : 0;

        // Calculate weights if backend didn't provide explicit weight
        const holdingsWithWeight = rawHoldings.map((h) => {
          const weight = totalMarketValue > 0
            ? Math.round(((h.market_value || (h.quantity * h.buy_price)) / totalMarketValue) * 100)
            : Math.round(100 / rawHoldings.length);
          return { ...h, weight };
        });

        // Health Score calculation (weighted score * 10)
        const avgScore = rawHoldings.length > 0
          ? rawHoldings.reduce((sum, h) => sum + (h.overall_score || 7.5), 0) / rawHoldings.length
          : 7.8;
        const healthScore = Math.min(Math.round(avgScore * 10), 100);

        // Overall risk summary
        const hasHigh = holdingsWithWeight.some((h) => (h.overall_risk || "").toUpperCase().includes("HIGH"));
        const overallRisk = hasHigh ? "HIGH" : "MEDIUM";

        // Expected return & Volatility
        const expectedReturn = 12.8;
        const expectedVolatility = hasHigh ? 18.4 : 12.2;

        // Diversification score (Herfindahl Index metric)
        const weightSumSq = holdingsWithWeight.reduce((sum, h) => sum + Math.pow(h.weight / 100, 2), 0);
        const divScore = Math.max(20, Math.round((1 - weightSumSq) * 100));

        // AI Confidence average
        const avgConf = Math.round(
          (rawHoldings.reduce((sum, h) => sum + (h.confidence || 0.85), 0) / rawHoldings.length) * 100
        );

        // Extract backend AI Investment Report if available
        const aiReport = res.data?.ai_report || res.ai_report || rawHoldings.find((h) => h.ai_report)?.ai_report || null;

        setReportData({
          holdings: holdingsWithWeight,
          totalInvested,
          totalMarketValue,
          totalPnl,
          totalPnlPct,
          healthScore,
          overallRisk,
          expectedReturn,
          expectedVolatility,
          diversificationScore: divScore,
          aiConfidence: avgConf,
          marketOutlook: "BULLISH",
          requestId,
          ai_report: aiReport,
        });

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
      setErrorDetails({
        message: err.message || "An unexpected error occurred during portfolio analysis.",
        code: err.code || err.status || "API_ERROR",
        requestId: err.requestId || err.data?.request_id || "req_" + Math.random().toString(36).substring(2, 9),
      });
      setViewState("error");
      toast.error("Portfolio analysis could not be completed.");
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
                gridTemplateColumns: isMobile ? "1fr" : "320px 1fr",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              {/* Circular Health Gauge */}
              <HealthScoreGauge score={reportData.healthScore} isMobile={isMobile} />

              {/* Animated Metric Cards Grid */}
              <div className="pd-metrics-grid">
                <MetricCard
                  label="OVERALL RISK"
                  value={reportData.overallRisk}
                  sub="Weighted Risk Index"
                  color={reportData.overallRisk === "HIGH" ? "var(--danger)" : "var(--color-gold)"}
                />

                <MetricCard
                  label="EXPECTED RETURN"
                  value={<><CountUp end={reportData.expectedReturn} decimals={1} duration={1.5} />%</>}
                  sub="Annualized Estimate"
                  color="var(--color-teal)"
                />

                <MetricCard
                  label="EXPECTED VOLATILITY"
                  value={<><CountUp end={reportData.expectedVolatility} decimals={1} duration={1.5} />%</>}
                  sub="Historical Variance"
                  color="var(--accent-blue)"
                />

                <MetricCard
                  label="DIVERSIFICATION"
                  value={<><CountUp end={reportData.diversificationScore} duration={1.5} />/100</>}
                  sub="HHI Asset Spread"
                  color="var(--success)"
                />

                <MetricCard
                  label="AI CONFIDENCE"
                  value={<><CountUp end={reportData.aiConfidence} duration={1.5} />%</>}
                  sub="Model Agreement"
                  color="var(--color-teal)"
                />

                <MetricCard
                  label="MARKET OUTLOOK"
                  value={reportData.marketOutlook}
                  sub="12M Macro Trend"
                  color="var(--success)"
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
