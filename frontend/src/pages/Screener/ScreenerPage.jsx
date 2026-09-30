import React, { useState, useCallback } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search } from "lucide-react";
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
import { StockPickerGrid } from "../../components/screener/StockPickerGrid";
import { STOCKS } from "../../constants/stocks";
import { fetchFullStockSignal, runScreener } from "../../services/marketService";
import { isDemoModeEnabled } from "../../utils/demoMode";
import { parseConf } from "../../utils/formatters";
import { toast } from "sonner";
import "../../styles/screener.css";

// ---------------------------------------------------------------------------
// Pipeline stage labels shown in the AgentLoader while a stock is analysed
// ---------------------------------------------------------------------------
const SCREENER_AGENT_STAGES = [
  "Fetching NSE Market Data & Technical Indicators",
  "Evaluating RSI, MACD, and EMA Moving Averages",
  "Running Random Forest & FinBERT Sentiment Analysis",
  "Calculating SHAP Feature Importance Drivers",
  "Synthesizing Model Confidence & Risk Ratings",
];

// ---------------------------------------------------------------------------
// View state machine
//   "pick"    — default: show the 13-stock selection grid, nothing fetched yet
//   "loading" — pipeline running for a single selected stock
//   "details" — show the full SignalCard for the analysed stock
//   "nlp"     — show NLP screener result cards
//   "compare" — side-by-side compare overlay
// ---------------------------------------------------------------------------

export function ScreenerPage() {
  const [searchParams] = useSearchParams();
  const context = useOutletContext();
  const isMobile = context?.isMobile || false;

  // The ?stock= URL param lets external links deep-link to a stock, but we
  // deliberately do NOT auto-run on mount — the user still has to see the
  // pick view first (unless they typed the URL manually, which is fine).
  const initialStockParam = searchParams.get("stock");

  // ----- UI state -----------------------------------------------------------
  const [view, setView] = useState("pick"); // "pick" | "details" | "nlp" | "compare"
  const [loading, setLoading] = useState(false);
  const [loaderStep, setLoaderStep] = useState(0);
  const [errorDetails, setErrorDetails] = useState(null);

  // Which tile is highlighted in the picker (purely visual, no API call yet)
  const [selectedSymbol, setSelectedSymbol] = useState(initialStockParam || null);

  // Results
  const [selectedStockSignal, setSelectedStockSignal] = useState(null);
  const [screenedStocks, setScreenedStocks] = useState([]);
  const [compareList, setCompareList] = useState([]);

  // NLP search bar state (only used in the NLP path)
  const [nlpQuery, setNlpQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState([
    "RSI below 30 and price above 50 day EMA",
    "MACD above signal and volume above average",
  ]);

  const [filters, setFilters] = useState({
    sector: "ALL",
    marketCap: "ALL",
    risk: "ALL",
    rating: "ALL",
    minConfidence: "0",
  });

  // ----- Helpers ------------------------------------------------------------

  const startLoader = () => {
    setLoaderStep(0);
    return setInterval(() => {
      setLoaderStep((prev) =>
        prev < SCREENER_AGENT_STAGES.length - 1 ? prev + 1 : prev
      );
    }, 350);
  };

  const stopLoader = (interval) => {
    clearInterval(interval);
    setLoaderStep(SCREENER_AGENT_STAGES.length - 1);
  };

  // ----- Single-stock pipeline (triggered by tile click) --------------------

  const analyseStock = useCallback(async (symbol) => {
    setSelectedSymbol(symbol);
    setErrorDetails(null);

    // ---- Demo mode shortcut ------------------------------------------------
    if (isDemoModeEnabled()) {
      setLoading(true);
      setView("loading");
      setTimeout(() => {
        setSelectedStockSignal({
          symbol,
          signal: "BUY",
          confidence: "87%",
          price: 2520,
          recommendation: "BUY",
        });
        setLoading(false);
        setView("details");
        toast.success(`Demo analysis ready for ${symbol}`);
      }, 900);
      return;
    }

    // ---- Real pipeline -----------------------------------------------------
    setLoading(true);
    setView("loading");
    const interval = startLoader();

    try {
      const analysis = await fetchFullStockSignal(symbol, { explainScreener: true });
      stopLoader(interval);
      await new Promise((r) => setTimeout(r, 300)); // let loader reach 100%

      setSelectedStockSignal(analysis);
      setView("details");
      toast.success(`Analysis ready for ${symbol}`);
    } catch (err) {
      stopLoader(interval);
      setErrorDetails({
        message: err.message || `Could not analyse ${symbol}.`,
        code: err.status || "PIPELINE_ERROR",
      });
      setView("pick"); // fall back to the picker so the user isn't stuck
      toast.error(`Analysis failed for ${symbol}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ----- NLP screener (triggered only by explicit Send / Enter) -------------

  const runNlpScreener = useCallback(async (queryStr) => {
    const q = (queryStr ?? nlpQuery).trim();
    if (!q || loading) return;

    setErrorDetails(null);

    // Check if the query is actually a single stock symbol — if so, route to
    // the single-stock pipeline instead of the NLP screener.
    const cleanUpper = q.toUpperCase();
    const matchedSymbol = STOCKS.find(
      (s) => s === cleanUpper || s.replace(".NS", "") === cleanUpper
    );
    if (matchedSymbol) {
      analyseStock(matchedSymbol.replace(".NS", ""));
      return;
    }

    if (!searchHistory.includes(q)) {
      setSearchHistory((prev) => [q, ...prev.slice(0, 4)]);
    }

    setLoading(true);
    setView("loading");
    const interval = startLoader();

    try {
      const screenerRes = await runScreener(q);
      stopLoader(interval);
      await new Promise((r) => setTimeout(r, 300));

      const matches = screenerRes?.matches ?? [];

      if (matches.length === 0) {
        setScreenedStocks([]);
        setView("nlp");
        toast.info("No stocks matched that query.");
        return;
      }

      // Fetch full analysis for each match sequentially so we fire only one
      // Firecrawl call at a time (matches are typically 1-5 symbols).
      const cards = [];
      for (const m of matches) {
        const sym = (m.symbol || "").replace(".NS", "");
        try {
          const analysis = await fetchFullStockSignal(sym, { explainScreener: true });
          if (analysis) cards.push(analysis);
        } catch {
          // Match couldn't be fully analysed — skip silently
        }
      }

      if (cards.length < matches.length) {
        toast.warning(
          `${matches.length - cards.length} match(es) couldn't be fully analysed and were omitted.`
        );
      }

      setScreenedStocks(cards);
      setView("nlp");
      toast.success(`AI Screener found ${cards.length} match(es).`);
    } catch (err) {
      stopLoader(interval);
      setErrorDetails({
        message: err.message || "Unable to complete stock screening.",
        code: err.status || "SCREENER_ERROR",
      });
      setView("pick");
      toast.error("Stock screening failed.");
    } finally {
      setLoading(false);
    }
  }, [nlpQuery, loading, searchHistory, analyseStock]);

  // ----- Compare helpers ----------------------------------------------------

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
      toast.success(`Added ${stock.symbol} to comparison.`);
    }
  };

  const handleCardClick = async (stock) => {
    await analyseStock((stock.symbol || "").replace(".NS", ""));
  };

  // ----- Filter logic (NLP results view only) -------------------------------

  const filteredStocks = screenedStocks.filter((s) => {
    if (filters.sector !== "ALL" && s.sector !== filters.sector) return false;
    if (filters.risk !== "ALL" && !s.overall_risk?.includes(filters.risk)) return false;
    if (filters.rating !== "ALL" && !s.recommendation?.includes(filters.rating)) return false;
    if (
      Number(filters.minConfidence) > 0 &&
      parseConf(s.confidence) < Number(filters.minConfidence)
    )
      return false;
    return true;
  });

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <PageTransition>
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
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
            Pick a stock below or type a filter query — ML, LSTM, FinBERT and
            Firecrawl news run only for the stock you select, one at a time.
          </p>
        </section>

        {/* ── NLP SEARCH BAR (always visible, submit-only) ─────────────────── */}
        <div style={{ marginBottom: 24 }}>
          {/* Custom inline search row — no auto-fire on change */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search
                size={15}
                color="var(--text-muted)"
                style={{
                  position: "absolute",
                  left: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              />
              <input
                value={nlpQuery}
                onChange={(e) => setNlpQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runNlpScreener(); }}
                placeholder='NLP filter e.g. "RSI below 30 and price above 50 day EMA"'
                disabled={loading}
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md, 10px)",
                  padding: "11px 13px 11px 36px",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                  opacity: loading ? 0.6 : 1,
                }}
              />
            </div>

            <button
              onClick={() => runNlpScreener()}
              disabled={loading || !nlpQuery.trim()}
              style={{
                background: "var(--color-teal)",
                color: "#04241D",
                border: "none",
                borderRadius: "var(--radius-md, 10px)",
                padding: "0 20px",
                fontWeight: 700,
                fontSize: 13,
                cursor: loading || !nlpQuery.trim() ? "default" : "pointer",
                opacity: loading || !nlpQuery.trim() ? 0.55 : 1,
                whiteSpace: "nowrap",
              }}
            >
              Run Screener
            </button>
          </div>

          {/* Compact filter row — only shown when NLP results are visible */}
          {view === "nlp" && (
            <ScreenerFilterBar
              searchQuery={nlpQuery}
              onSearchChange={setNlpQuery}
              filters={filters}
              onFilterChange={(k, v) => setFilters({ ...filters, [k]: v })}
              onResetFilters={() => {
                setFilters({ sector:"ALL", marketCap:"ALL", risk:"ALL", rating:"ALL", minConfidence:"0" });
                setNlpQuery("");
                setView("pick");
              }}
              searchHistory={searchHistory}
              onSelectHistory={(q) => { setNlpQuery(q); runNlpScreener(q); }}
            />
          )}
        </div>

        {/* ── COMPARE BAR ──────────────────────────────────────────────────── */}
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
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-teal)" }}>
              {compareList.length} stock(s) for comparison:{" "}
              {compareList.map((s) => s.symbol).join(", ")}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="primary" size="sm" onClick={() => setView("compare")}>
                Compare Side-by-Side
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCompareList([])}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* ── LOADING / ERROR ───────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <AgentLoader
                title={
                  selectedSymbol
                    ? `Analysing ${selectedSymbol}…`
                    : "Running AI Screener Pipeline…"
                }
                steps={SCREENER_AGENT_STAGES}
                step={loaderStep}
              />
            </motion.div>
          )}

          {errorDetails && !loading && (
            <motion.div key="error">
              <ErrorState
                title="Analysis Failed"
                description={errorDetails.message}
                code={errorDetails.code}
                onRetry={() =>
                  selectedSymbol ? analyseStock(selectedSymbol) : runNlpScreener()
                }
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── COMPARE OVERLAY ──────────────────────────────────────────────── */}
        {view === "compare" && compareList.length > 0 && (
          <StockCompareModal
            selectedStocks={compareList}
            onClose={() => setView(selectedStockSignal ? "details" : "nlp")}
            onRemoveStock={(sym) =>
              setCompareList(compareList.filter((s) => s.symbol !== sym))
            }
          />
        )}

        {/* ── DEFAULT: STOCK PICKER GRID ───────────────────────────────────── */}
        {!loading && !errorDetails && view === "pick" && (
          <motion.div
            key="pick"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <StockPickerGrid
              onSelect={analyseStock}
              selectedSymbol={selectedSymbol}
              disabled={loading}
            />
          </motion.div>
        )}

        {/* ── SINGLE-STOCK DETAILS ─────────────────────────────────────────── */}
        {!loading && !errorDetails && view === "details" && selectedStockSignal && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: 28 }}
          >
            {/* Back + badge row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setView("pick");
                  setSelectedStockSignal(null);
                }}
              >
                ← Back to Stock Selection
              </Button>
              <Badge variant="teal">SHAP FEATURE IMPORTANCE ANALYSIS</Badge>
            </div>

            <SignalCard signal={selectedStockSignal} isMobile={isMobile} />
          </motion.div>
        )}

        {/* ── NLP SCREENER RESULTS ─────────────────────────────────────────── */}
        {!loading && !errorDetails && view === "nlp" && (
          <motion.div key="nlp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Back button */}
            <div style={{ marginBottom: 14 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setView("pick");
                  setScreenedStocks([]);
                  setNlpQuery("");
                }}
              >
                ← Back to Stock Selection
              </Button>
            </div>

            {/* Results header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  letterSpacing: "0.8px",
                }}
              >
                SCREENER RESULTS ({filteredStocks.length} ASSETS MATCHED)
              </div>
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
          </motion.div>
        )}

      </div>
    </PageTransition>
  );
}

export default ScreenerPage;
