import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { AgentLoader } from "../../components/animations/AgentLoader";
import { SignalCard } from "../../components/cards/SignalCard";
import { ScreenerFilterBar } from "../../components/screener/ScreenerFilterBar";
import { StockCompareModal } from "../../components/screener/StockCompareModal";
import { ScreenerStockCard } from "../../components/screener/ScreenerStockCard";
import { STOCKS } from "../../constants/stocks";
import { fetchFullStockSignal, runScreener } from "../../services/marketService";
import { isDemoModeEnabled } from "../../utils/demoMode";
import { parseConf } from "../../utils/formatters";
import { toast } from "sonner";
import "../../styles/screener.css";

const SCREENER_AGENT_STAGES = [
  "Fetching NSE Market Data & Technical Indicators",
  "Evaluating RSI, MACD, and EMA Moving Averages",
  "Running Random Forest & FinBERT Sentiment Analysis",
  "Calculating SHAP Feature Importance Drivers",
  "Synthesizing Model Confidence & Risk Ratings",
];

export function ScreenerPage() {
  const [searchParams] = useSearchParams();
  const context = useOutletContext();
  const isMobile = context?.isMobile || false;
  const initialStockParam = searchParams.get("stock");

  // States
  const [searchQuery, setSearchQuery] = useState(initialStockParam || "");
  const [searchHistory, setSearchHistory] = useState([
    "RELIANCE",
    "RSI below 30 and price above 50 day EMA",
    "TCS",
    "INFY",
  ]);

  const [filters, setFilters] = useState({
    sector: "ALL",
    marketCap: "ALL",
    risk: "ALL",
    rating: "ALL",
    minConfidence: "0",
  });

  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'details' | 'compare'
  const [loading, setLoading] = useState(false);
  const [loaderStep, setLoaderStep] = useState(0);
  const [errorDetails, setErrorDetails] = useState(null);

  const [screenedStocks, setScreenedStocks] = useState([]);
  const [selectedStockSignal, setSelectedStockSignal] = useState(null);
  const [compareList, setCompareList] = useState([]);

  const normalizeAnalysis = (analysis) => analysis;

  // Run Screener Query or Fetch Stock Signal
  const executeScreener = useCallback(async (queryStr) => {
    if (isDemoModeEnabled()) {
      setLoading(true);
      setLoaderStep(0);
      setErrorDetails(null);
      setTimeout(() => {
        const demoMatches = [
          { symbol: "RELIANCE", score: 87, sentiment: "bullish", price: 2520, signal: "BUY", rationale: "Momentum and relative strength remain supporting the setup." },
          { symbol: "TCS", score: 81, sentiment: "neutral", price: 3720, signal: "HOLD", rationale: "Stable quality name with moderate upside and lower volatility." },
          { symbol: "HDFCBANK", score: 84, sentiment: "bullish", price: 1745, signal: "BUY", rationale: "Strong sector breadth and improving short-term trend." },
        ];
        setScreenedStocks(demoMatches);
        setSelectedStockSignal(null);
        setLoading(false);
        setLoaderStep(SCREENER_AGENT_STAGES.length - 1);
        setViewMode("cards");
        toast.success("Demo screener results are ready.");
      }, 900);
      return;
    }

    const q = (queryStr !== undefined ? queryStr : searchQuery).trim();
    setLoading(true);
    setLoaderStep(0);
    setErrorDetails(null);

    let stageInterval = setInterval(() => {
      setLoaderStep((prev) => (prev < SCREENER_AGENT_STAGES.length - 1 ? prev + 1 : prev));
    }, 350);

    try {
      if (q && !searchHistory.includes(q)) {
        setSearchHistory((prev) => [q, ...prev.slice(0, 4)]);
      }

      // Check if user entered a specific single stock symbol
      const cleanUpper = q.toUpperCase();
      const matchedSymbol = STOCKS.find((s) => s === cleanUpper || s.replace(".NS", "") === cleanUpper);

      if (matchedSymbol) {
        const analysis = await fetchFullStockSignal(matchedSymbol);
        clearInterval(stageInterval);
        setLoaderStep(SCREENER_AGENT_STAGES.length - 1);
        await new Promise((resolve) => setTimeout(resolve, 300));

        const cardItem = normalizeAnalysis(analysis);
        setSelectedStockSignal(analysis);
        setScreenedStocks([cardItem]);
        setViewMode("details");
      } else {
        // Run NLP screener then fetch full analysis for each match
        const screenerRes = await runScreener(q || "RSI below 50 and bullish trend");
        clearInterval(stageInterval);
        setLoaderStep(SCREENER_AGENT_STAGES.length - 1);
        await new Promise((resolve) => setTimeout(resolve, 300));

        const matches = screenerRes?.matches ?? [];
        if (matches.length > 0) {
          const cards = await Promise.all(
            matches.map(async (m) => {
              const sym = (m.symbol || "").replace(".NS", "");
              try {
                const analysis = await fetchFullStockSignal(sym);
                return normalizeAnalysis(analysis);
              } catch {
                // Screener match but analysis unavailable — use screener data only
                return {
                  symbol: sym,
                  current_price: m.price || null,
                  recommendation: null,
                  confidence: null,
                  expected_return: null,
                  predicted_price: null,
                  overall_risk: null,
                  sector: getSectorForSymbol(sym),
                  matched_conditions: m.matched_conditions,
                };
              }
            })
          );
          setScreenedStocks(cards);
        } else {
          setScreenedStocks([]);
        }
        setViewMode("cards");
      }
      toast.success("AI Stock Screener execution complete!");
    } catch (err) {
      clearInterval(stageInterval);
      setErrorDetails({
        message: err.message || "Unable to complete stock screening.",
        code: err.status || "SCREENER_ERROR",
      });
      toast.error("Stock screening failed.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchHistory]);

  const getSectorForSymbol = (sym = "") => {
    const s = sym.toUpperCase();
    if (s.includes("RELIANCE")) return "Energy";
    if (s.includes("TCS") || s.includes("INFY")) return "IT & Tech";
    if (s.includes("HDFC") || s.includes("ICICI")) return "Banking & Fin";
    if (s.includes("TATAMOTORS")) return "Automotive";
    if (s.includes("GOLD") || s.includes("GC=F")) return "Commodities";
    return "Energy";
  };


  // Initial load
  useEffect(() => {
    executeScreener(initialStockParam || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (key, val) => {
    setFilters({ ...filters, [key]: val });
  };

  const handleResetFilters = () => {
    setFilters({
      sector: "ALL",
      marketCap: "ALL",
      risk: "ALL",
      rating: "ALL",
      minConfidence: "0",
    });
    setSearchQuery("");
  };

  // Filter screened stocks based on filter criteria
  const filteredStocks = screenedStocks.filter((s) => {
    if (filters.sector !== "ALL" && s.sector !== filters.sector) return false;
    if (filters.risk !== "ALL" && !s.overall_risk?.includes(filters.risk)) return false;
    if (filters.rating !== "ALL" && !s.recommendation?.includes(filters.rating)) return false;
    if (Number(filters.minConfidence) > 0 && parseConf(s.confidence) < Number(filters.minConfidence)) return false;
    return true;
  });

  const handleCardClick = async (stock) => {
    setLoading(true);
    try {
      const analysis = await fetchFullStockSignal(stock.symbol);
      setSelectedStockSignal(analysis);
      setViewMode("details");
    } catch (e) {
      toast.error("Failed to load details for " + stock.symbol);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompareStock = (stock) => {
    if (compareList.some((s) => s.symbol === stock.symbol)) {
      setCompareList(compareList.filter((s) => s.symbol !== stock.symbol));
      toast.info(`Removed ${stock.symbol} from comparison.`);
    } else {
      if (compareList.length >= 3) {
        toast.error("Maximum 3 stocks can be compared side-by-side.");
        return;
      }
      setCompareList([...compareList, stock]);
      toast.success(`Added ${stock.symbol} to side-by-side comparison!`);
    }
  };

  return (
    <PageTransition>
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
        {/* SECTION 1: HERO */}
        <section className="sc-hero-header">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: "20px",
              background: "var(--color-teal-bg)",
              border: "1px solid var(--color-teal-border)",
              color: "var(--color-teal)",
              fontSize: "11px",
              fontWeight: 700,
              marginBottom: "12px",
            }}
          >
            <Sparkles size={14} /> INSTITUTIONAL AI SCREENING
          </div>

          <h1 className="sc-hero-title">AI Stock Screener</h1>

          <p className="sc-hero-subtitle">
            Discover AI-rated investment opportunities using ML, LSTM, FinBERT and technical analysis across NSE equities and commodities.
          </p>
        </section>

        {/* SECTION 2 & 3: SEARCH & FILTERS BAR */}
        <ScreenerFilterBar
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            executeScreener(q);
          }}
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          searchHistory={searchHistory}
          onSelectHistory={(q) => {
            setSearchQuery(q);
            executeScreener(q);
          }}
        />

        {/* Compare Bar Button */}
        {compareList.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 18px",
              background: "var(--color-teal-bg)",
              border: "1px solid var(--color-teal-border)",
              borderRadius: "var(--radius-lg)",
              marginBottom: "20px",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-teal)" }}>
              {compareList.length} Stock(s) selected for comparison: {compareList.map((s) => s.symbol).join(", ")}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <Button variant="primary" size="sm" onClick={() => setViewMode("compare")}>
                Compare Side-by-Side
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCompareList([])}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* SECTION 7 & 8: LOADING / ERROR STATES */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <AgentLoader
                title="Running AI Screener Pipeline..."
                steps={SCREENER_AGENT_STAGES}
                step={loaderStep}
              />
            </motion.div>
          )}

          {errorDetails && !loading && (
            <motion.div key="error">
              <ErrorState
                title="Screener Execution Failed"
                description={errorDetails.message}
                code={errorDetails.code}
                onRetry={() => executeScreener(searchQuery)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* SECTION 6: COMPARE STOCKS OVERLAY */}
        {viewMode === "compare" && compareList.length > 0 && (
          <StockCompareModal
            selectedStocks={compareList}
            onClose={() => setViewMode("cards")}
            onRemoveStock={(sym) => setCompareList(compareList.filter((s) => s.symbol !== sym))}
          />
        )}

        {/* SECTION 5: SELECTED STOCK DETAILS VIEW */}
        {viewMode === "details" && selectedStockSignal && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: "28px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <Button variant="secondary" size="sm" onClick={() => setViewMode("cards")}>
                ← Back to Screener Grid
              </Button>

              <Badge variant="teal">SHAP FEATURE IMPORTANCE ANALYSIS</Badge>
            </div>

            <SignalCard signal={selectedStockSignal} isMobile={isMobile} />
          </motion.div>
        )}

        {/* SECTION 4: RESULT CARDS GRID */}
        {!loading && !errorDetails && viewMode !== "compare" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.8px" }}>
                SCREENER RESULTS ({filteredStocks.length} ASSETS MATCHED)
              </div>

              {viewMode === "details" && (
                <Button variant="ghost" size="sm" onClick={() => setViewMode("cards")}>
                  Show Grid Cards View
                </Button>
              )}
            </div>

            {filteredStocks.length === 0 ? (
              <EmptyState
                title="No Stocks Match Selected Filters"
                description="Try clearing your search query or broadening the sector and risk filter controls above."
              />
            ) : (
              <div className="sc-cards-grid">
                {filteredStocks.map((stock, i) => {
                  const isCompared = compareList.some((c) => c.symbol === stock.symbol);
                  return (
                    <motion.div
                      key={stock.symbol}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.25 }}
                    >
                      <ScreenerStockCard
                        stock={stock}
                        isCompared={isCompared}
                        onToggleCompare={toggleCompareStock}
                        onCardClick={handleCardClick}
                      />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

export default ScreenerPage;
