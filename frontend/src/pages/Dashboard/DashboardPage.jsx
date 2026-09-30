import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import CountUp from "react-countup";
import {
  Sparkles,
  ArrowRight,
  Briefcase,
  Zap,
} from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { Card, MetricCard } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { DashboardSkeleton } from "../../components/dashboard/DashboardSkeleton";
import { MarketOverviewSection } from "../../components/dashboard/MarketOverviewSection";
import { MarketHeatmap } from "../../components/dashboard/MarketHeatmap";
import { WatchlistSection } from "../../components/dashboard/WatchlistSection";
import { RecentAnalysesTimeline } from "../../components/dashboard/RecentAnalysesTimeline";
import { AIActivityFeed } from "../../components/dashboard/AIActivityFeed";
import { QuickActionsSection } from "../../components/dashboard/QuickActionsSection";
import { AssetAllocationChart } from "../../components/charts/PortfolioDoctorCharts";
import "../../styles/dashboard.css";

export function DashboardPage() {
  const navigate = useNavigate();
  const context = useOutletContext();
  const isMobile = context?.isMobile || false;
  const commodities = context?.commodities;
  const marketQuotes = context?.marketQuotes;
  const loading = context?.commodityLoading ?? true;

  const [timeString, setTimeString] = useState("");
  const [greeting, setGreeting] = useState("Good Morning");

  // Load initial data and time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = now.getHours();
      if (hrs < 12) setGreeting("Good Morning");
      else if (hrs < 17) setGreeting("Good Afternoon");
      else setGreeting("Good Evening");

      setTimeString(
        now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
          " · " +
          now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Portfolio Snapshot Sample Data
  const samplePortfolioHoldings = [
    { symbol: "RELIANCE", weight: 35, current_price: 2950, pnl: 14200, pnl_percent: 18.4, overall_risk: "LOW" },
    { symbol: "TCS", weight: 25, current_price: 3820, pnl: 8400, pnl_percent: 12.1, overall_risk: "LOW" },
    { symbol: "INFY", weight: 20, current_price: 1410, pnl: -1200, pnl_percent: -3.2, overall_risk: "MEDIUM" },
    { symbol: "GOLD24K", weight: 20, current_price: 72450, pnl: 6500, pnl_percent: 9.8, overall_risk: "LOW" },
  ];

  // AI Insights Recommendations
  const aiInsights = [
    {
      title: "Technology Sector Overweight",
      priority: "HIGH PRIORITY",
      variant: "danger",
      reason: "TCS and INFY together account for 45% of equity capital. Recommend diversifying into Banking or Commodities.",
      impact: "-12% Portfolio Volatility",
    },
    {
      title: "Gold 24K Hedge Active",
      priority: "HEALTHY ALLOCATION",
      variant: "teal",
      reason: "20% allocation in MCX Gold provides downside protection against equity drawdown.",
      impact: "+4.5% Risk-Adjusted Yield",
    },
    {
      title: "Defensive Banking Opportunity",
      priority: "OPTIMIZATION",
      variant: "blue",
      reason: "ICICIBANK and HDFCBANK showing 90%+ AI model confidence for long-term accumulation.",
      impact: "+5.2% Expected Return",
    },
  ];

  if (loading) {
    return (
      <PageTransition>
        <DashboardSkeleton />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
        {/* SECTION 1: HERO HEADER */}
        <section className="db-hero-header">
          <div>
            <h1 className="db-greeting-title">{greeting}. Welcome to TradeMind.</h1>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
              AI Financial Operating System • {timeString}
            </p>
          </div>

          <div className="db-hero-meta">
            <span className="db-status-badge db-status-open">
              <span className="live-dot" /> NSE INDIA OPEN
            </span>
            <span className="db-status-badge db-status-ai">
              <Sparkles size={12} /> TRADEMIND AI ONLINE
            </span>
          </div>
        </section>

        {/* SECTION 2: QUICK METRICS */}
        <section style={{ marginBottom: "28px" }}>
          <div className="db-metrics-grid">
            <MetricCard
              label="PORTFOLIO VALUE"
              value={<>₹<CountUp end={425800} duration={1.5} separator="," /></>}
              sub="₹4.25 Lakh Total"
              color="var(--text-primary)"
            />

            <MetricCard
              label="TODAY'S P/L"
              value={<>+₹<CountUp end={6420} duration={1.5} separator="," /> (+1.53%)</>}
              sub="Net Daily Gain"
              color="var(--success)"
            />

            <MetricCard
              label="PORTFOLIO HEALTH"
              value={<><CountUp end={78} duration={1.5} />/100</>}
              sub="Optimal Allocation"
              color="var(--color-teal)"
            />

            <MetricCard
              label="AI CONFIDENCE"
              value={<><CountUp end={92} duration={1.5} />%</>}
              sub="Multi-Model Agreement"
              color="var(--color-teal)"
            />

            <MetricCard
              label="EXPECTED RETURN"
              value={<><CountUp end={14.2} decimals={1} duration={1.5} />%</>}
              sub="Annualized Forecast"
              color="var(--accent-blue)"
            />

            <MetricCard
              label="RISK PROFILE"
              value="LOW-MED"
              sub="Balanced Risk Index"
              color="var(--color-gold)"
            />
          </div>
        </section>

        {/* SECTION 3: MARKET OVERVIEW */}
        <MarketOverviewSection commodities={commodities} marketQuotes={marketQuotes} />

        {/* SECTION 8: QUICK ACTIONS */}
        <QuickActionsSection />

        {/* SECTION 4 & 5: PORTFOLIO SNAPSHOT & AI INSIGHTS */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: "20px", marginBottom: "28px" }}>
          {/* Portfolio Snapshot */}
          <Card style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Briefcase size={16} color="var(--color-teal)" />
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  PORTFOLIO SNAPSHOT
                </h3>
              </div>

              <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right" onClick={() => navigate("/portfolio-doctor")}>
                Full Doctor Report
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 180px", gap: "16px", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.5px", marginBottom: "8px" }}>
                  TOP HOLDINGS (BY WEIGHT)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {samplePortfolioHoldings.map((h, i) => (
                    <div
                      key={i}
                      className="db-holding-row"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        background: "var(--bg-surface)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "12.5px",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{h.symbol}</span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "8px" }}>{h.weight}%</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: h.pnl >= 0 ? "var(--success)" : "var(--danger)" }}>
                        {h.pnl >= 0 ? "+" : ""}{h.pnl_percent}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asset Allocation Donut Mini */}
              <div style={{ height: "150px" }}>
                <AssetAllocationChart data={samplePortfolioHoldings} isMobile={isMobile} height={150} />
              </div>
            </div>
          </Card>

          {/* AI Insights Recommendations */}
          <Card style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Zap size={16} color="var(--color-teal)" />
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                AI COPILOT RECOMMENDATIONS
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {aiInsights.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "10px 12px",
                    background: "var(--bg-surface)",
                    borderRadius: "var(--radius-md)",
                    borderLeft: `3px solid ${item.variant === "danger" ? "var(--danger)" : "var(--color-teal)"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text-primary)" }}>{item.title}</span>
                    <Badge variant={item.variant} size="sm">{item.priority}</Badge>
                  </div>
                  <p style={{ fontSize: "11.5px", color: "var(--text-secondary)", margin: "0 0 4px 0", lineHeight: 1.4 }}>
                    {item.reason}
                  </p>
                  <div style={{ fontSize: "10.5px", color: "var(--color-teal)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    Impact: {item.impact}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* SECTION 7: WATCHLIST */}
        <WatchlistSection commodities={commodities} marketQuotes={marketQuotes} />

        {/* SECTION 9: MARKET HEATMAP */}
        <MarketHeatmap commodities={commodities} marketQuotes={marketQuotes} />

        {/* SECTION 6 & 10: RECENT ANALYSES & AI ACTIVITY FEED */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: "20px" }}>
          <RecentAnalysesTimeline />
          <AIActivityFeed commodities={commodities} />
        </div>
      </div>
    </PageTransition>
  );
}

export default DashboardPage;
