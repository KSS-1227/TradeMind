import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { Send, CheckCircle2, XCircle } from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { AgentLoader } from "../../components/animations/AgentLoader";
import { SignalCard } from "../../components/cards/SignalCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { STOCKS, STOCK_LABELS } from "../../constants/stocks";
import { fetchStockSignal, runScreener } from "../../services/marketService";
import { toast } from "sonner";

const EXAMPLE_QUERIES = [
  "RSI below 30 and price above 50 day EMA",
  "MACD above signal and volume above average",
  "beta below 1 and RSI below 40",
  "RSI between 30 and 50",
];

function ConditionChip({ ok, text }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11.5,
        fontFamily: "var(--font-mono)",
        background: ok ? "var(--color-teal-bg)" : "var(--color-danger-bg)",
        color: ok ? "var(--color-teal)" : "var(--color-danger)",
        border: `1px solid ${ok ? "var(--color-teal-border)" : "var(--color-danger-border)"}`,
        borderRadius: 5,
        padding: "3px 8px",
        margin: "2px 4px 2px 0",
      }}
    >
      {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {text}
    </span>
  );
}

function MatchCard({ match }) {
  return (
    <div
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border-color)",
        borderRadius: 8,
        padding: "10px 12px",
        marginTop: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
          {match.symbol.replace(".NS", "")}
        </span>
        <span className="mono" style={{ fontSize: 13, color: "var(--text-muted)" }}>
          ₹{match.price?.toLocaleString("en-IN")}
        </span>
      </div>
      <div style={{ marginTop: 6 }}>
        {match.matched_conditions?.map((c, i) => (
          <ConditionChip key={i} ok={true} text={c} />
        ))}
      </div>
    </div>
  );
}

function BotBubble({ result }) {
  if (result.error) {
    return (
      <div className="bot-bubble error" style={bubbleStyle(false)}>
        <div style={{ color: "var(--color-danger)", fontSize: 13.5 }}>{result.error}</div>
        {result.unparsed_clauses?.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
            Couldn't understand: {result.unparsed_clauses.map((u) => `"${u}"`).join(", ")}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={bubbleStyle(false)}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
        Understood: {result.conditions_understood?.join("  ·  ")}
      </div>

      {result.unparsed_clauses?.length > 0 && (
        <div
          style={{
            fontSize: 12,
            color: "var(--color-gold)",
            marginBottom: 8,
            background: "var(--color-gold-bg)",
            border: "1px solid var(--color-gold-border)",
            borderRadius: 6,
            padding: "6px 9px",
          }}
        >
          Couldn't understand: {result.unparsed_clauses.map((u) => `"${u}"`).join(", ")} — skipped.
        </div>
      )}

      {result.matches?.length === 0 ? (
        <div style={{ fontSize: 13.5, color: "var(--text-primary)" }}>
          No stocks matched, out of {result.symbols_screened} screened.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13.5, color: "var(--text-primary)", fontWeight: 600 }}>
            {result.matches?.length} match{result.matches?.length !== 1 ? "es" : ""} out of{" "}
            {result.symbols_screened} screened
          </div>
          {result.matches?.map((m, i) => (
            <MatchCard key={i} match={m} />
          ))}
        </>
      )}
    </div>
  );
}

function bubbleStyle(isUser) {
  return {
    maxWidth: "88%",
    alignSelf: isUser ? "flex-end" : "flex-start",
    background: isUser ? "var(--color-teal)" : "var(--bg-surface)",
    color: isUser ? "#04241D" : "var(--text-primary)",
    border: isUser ? "none" : "1px solid var(--border-color)",
    borderRadius: 12,
    borderBottomRightRadius: isUser ? 3 : 12,
    borderBottomLeftRadius: isUser ? 12 : 3,
    padding: "10px 14px",
    fontSize: 14,
    lineHeight: 1.5,
  };
}

export function ScreenerPage() {
  const [searchParams] = useSearchParams();
  const { isMobile } = useOutletContext();
  const stockParam = searchParams.get("stock");

  const [selectedStock, setSelectedStock] = useState(stockParam || "RELIANCE");
  const [singleSignal, setSingleSignal] = useState(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [agentStep, setAgentStep] = useState(0);

  const [messages, setMessages] = useState([
    {
      role: "bot-text",
      content:
        "Ask me to screen stocks in plain English — for example " +
        `"${EXAMPLE_QUERIES[0]}". I'll tell you exactly which stocks ` +
        "match and why.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const analyzeStock = useCallback(async (sym) => {
    const s = sym || selectedStock;
    setSingleLoading(true);
    setSingleSignal(null);
    setAgentStep(0);

    const t1 = setTimeout(() => setAgentStep(1), 2500);
    const t2 = setTimeout(() => setAgentStep(2), 5500);

    try {
      const data = await fetchStockSignal(s);
      setSingleSignal(data);
    } catch (e) {
      toast.error(e.message || "Analysis failed — try again");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setSingleLoading(false);
      setAgentStep(0);
    }
  }, [selectedStock]);

  useEffect(() => {
    if (stockParam) {
      setSelectedStock(stockParam);
      analyzeStock(stockParam);
    }
  }, [stockParam, analyzeStock]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendQuery = async (query) => {
    const q = (query ?? input).trim();
    if (!q || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    setLoading(true);

    try {
      const data = await runScreener(q);
      setMessages((prev) => [...prev, { role: "bot-result", result: data }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot-result",
          result: { error: e.message || "Couldn't reach screener service." },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div style={{ marginBottom: "16px" }}>
        <h1 className="page-title">AI Stock Screener & Analyser</h1>
        <p className="page-sub">Run NLP stock queries or view deep SHAP analysis for any NSE asset.</p>
      </div>

      {/* Asset Selector */}
      <Card style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.8px", marginBottom: "10px", fontWeight: 700 }}>
          SELECT ASSET FOR SHAP ANALYSIS
        </div>
        <div className="stocks-scroll" style={{ marginBottom: "14px" }}>
          {STOCKS.map((s) => (
            <button
              key={s}
              className={`stock-btn ${selectedStock === s ? "active" : ""}`}
              onClick={() => {
                setSelectedStock(s);
                analyzeStock(s);
              }}
            >
              {STOCK_LABELS[s] || s}
            </button>
          ))}
        </div>
        <Button onClick={() => analyzeStock(selectedStock)} loading={singleLoading}>
          Analyse {STOCK_LABELS[selectedStock] || selectedStock}
        </Button>
      </Card>

      {singleLoading && <AgentLoader step={agentStep} />}
      {singleSignal && <SignalCard signal={singleSignal} isMobile={isMobile} />}

      <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "24px 0" }} />

      {/* Conversational Screener Interface */}
      <div style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Natural Language Screener
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Deterministic indicator parser — filters without hallucination.
          </div>
        </div>

        <div
          style={{
            maxHeight: 380,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "4px 2px 12px",
          }}
        >
          {messages.map((m, i) => {
            if (m.role === "user") return <div key={i} style={bubbleStyle(true)}>{m.content}</div>;
            if (m.role === "bot-text") return <div key={i} style={bubbleStyle(false)}>{m.content}</div>;
            return <BotBubble key={i} result={m.result} />;
          })}
          <div ref={scrollRef} />
        </div>

        {messages.length <= 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "12px 0" }}>
            {EXAMPLE_QUERIES.map((q, i) => (
              <button
                key={i}
                onClick={() => sendQuery(q)}
                style={{
                  fontSize: 12,
                  color: "var(--color-teal)",
                  background: "var(--color-teal-bg)",
                  border: "1px solid var(--color-teal-border)",
                  borderRadius: 16,
                  padding: "5px 11px",
                  cursor: "pointer",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendQuery();
            }}
            placeholder="RSI below 30 and price above 50 day EMA"
            style={{
              flex: 1,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
              padding: "11px 13px",
              color: "var(--text-primary)",
              fontSize: 14,
              outline: "none",
            }}
          />
          <Button
            onClick={() => sendQuery()}
            disabled={loading || !input.trim()}
            icon={Send}
          >
            Send
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}

export default ScreenerPage;
