// frontend/src/ScreenerPage.js
import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "https://kss-1227-trademind.hf.space";

// Same theme object as App.js — kept in sync manually since this file
// is meant to be a self-contained drop-in. If you refactor T into a
// shared module later, import it from there instead of redefining it.
const T = {
  bg:"#080E1A", surface:"#0D1F35", raised:"#132840",
  border:"#1E3A5F", teal:"#00C9A7", tealDim:"#009E84",
  gold:"#F6C90E", danger:"#F25C54", white:"#F0F4F8",
  muted:"#64748B", dim:"#334155",
};

const EXAMPLE_QUERIES = [
  "RSI below 30 and price above 50 day EMA",
  "MACD above signal and volume above average",
  "beta below 1 and RSI below 40",
  "RSI between 30 and 50",
];

function ConditionChip({ ok, text }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      fontSize:11.5, fontFamily:"monospace",
      background: ok ? "rgba(0,201,167,0.1)" : "rgba(242,92,84,0.1)",
      color: ok ? T.teal : T.danger,
      border:`1px solid ${ok ? T.tealDim : T.danger}`,
      borderRadius:5, padding:"3px 8px", margin:"2px 4px 2px 0",
    }}>
      {ok ? "✓" : "✕"} {text}
    </span>
  );
}

function MatchCard({ match }) {
  return (
    <div style={{
      background:T.raised, border:`1px solid ${T.border}`,
      borderRadius:8, padding:"10px 12px", marginTop:8,
    }}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
        <span style={{fontWeight:700, fontSize:14, color:T.white}}>
          {match.symbol.replace(".NS", "")}
        </span>
        <span style={{fontSize:13, color:T.muted}}>
          ₹{match.price?.toLocaleString("en-IN")}
        </span>
      </div>
      <div style={{marginTop:6}}>
        {match.matched_conditions.map((c, i) => (
          <ConditionChip key={i} ok={true} text={c} />
        ))}
      </div>
    </div>
  );
}

function BotBubble({ result }) {
  if (result.error) {
    return (
      <div style={bubbleStyle(false)}>
        <div style={{color:T.danger, fontSize:13.5}}>{result.error}</div>
        {result.unparsed_clauses?.length > 0 && (
          <div style={{marginTop:6, fontSize:12, color:T.muted}}>
            Couldn't understand: {result.unparsed_clauses.map(u => `"${u}"`).join(", ")}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={bubbleStyle(false)}>
      <div style={{fontSize:12, color:T.muted, marginBottom:6}}>
        Understood: {result.conditions_understood.join("  ·  ")}
      </div>

      {result.unparsed_clauses?.length > 0 && (
        <div style={{
          fontSize:12, color:T.gold, marginBottom:8,
          background:"rgba(246,201,14,0.08)", border:`1px solid rgba(246,201,14,0.3)`,
          borderRadius:6, padding:"6px 9px",
        }}>
          Couldn't understand: {result.unparsed_clauses.map(u => `"${u}"`).join(", ")}
          — those parts were skipped, not guessed at.
        </div>
      )}

      {result.matches.length === 0 ? (
        <div style={{fontSize:13.5, color:T.white}}>
          No stocks matched, out of {result.symbols_screened} screened.
        </div>
      ) : (
        <>
          <div style={{fontSize:13.5, color:T.white, fontWeight:600}}>
            {result.matches.length} match{result.matches.length !== 1 ? "es" : ""}
            {" "}out of {result.symbols_screened} screened
          </div>
          {result.matches.map((m, i) => <MatchCard key={i} match={m} />)}
        </>
      )}
    </div>
  );
}

function bubbleStyle(isUser) {
  return {
    maxWidth: "88%",
    alignSelf: isUser ? "flex-end" : "flex-start",
    background: isUser ? T.teal : T.surface,
    color: isUser ? "#04241D" : T.white,
    border: isUser ? "none" : `1px solid ${T.border}`,
    borderRadius: 12,
    borderBottomRightRadius: isUser ? 3 : 12,
    borderBottomLeftRadius: isUser ? 12 : 3,
    padding: "10px 14px",
    fontSize: 14,
    lineHeight: 1.5,
  };
}

function TypingDots() {
  return (
    <div style={{...bubbleStyle(false), display:"flex", gap:4, padding:"12px 16px"}}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width:6, height:6, borderRadius:"50%", background:T.muted,
          animation: `screenerBlink 1.2s ${i*0.15}s infinite ease-in-out`,
        }}/>
      ))}
      <style>{`@keyframes screenerBlink {0%,80%,100%{opacity:0.3} 40%{opacity:1}}`}</style>
    </div>
  );
}

export default function ScreenerPage({ isMobile }) {
  const [messages, setMessages] = useState([
    { role:"bot-text", content:
      "Ask me to screen stocks in plain English — for example "
      + `"${EXAMPLE_QUERIES[0]}". I'll tell you exactly which stocks `
      + "match and why, and if I don't understand part of your question I'll say so." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  const send = async (query) => {
    const q = (query ?? input).trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { role:"user", content:q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/screener`, { query: q });
      setMessages(prev => [...prev, { role:"bot-result", result: res.data }]);
    } catch (e) {
      setMessages(prev => [...prev, { role:"bot-result", result:
        { error: e.response?.data?.detail || "Couldn't reach the screener — try again." } }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display:"flex", flexDirection:"column",
      height: isMobile ? "calc(100vh - 132px)" : "calc(100vh - 76px)",
      maxWidth: 640,
    }}>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:20, fontWeight:700, color:T.white}}>Stock screener</div>
        <div style={{fontSize:13, color:T.muted}}>
          Type filters in plain English — deterministic, no AI guessing.
        </div>
      </div>

      <div style={{
        flex:1, overflowY:"auto", display:"flex", flexDirection:"column",
        gap:10, padding:"4px 2px 12px",
      }}>
        {messages.map((m, i) => {
          if (m.role === "user") {
            return <div key={i} style={bubbleStyle(true)}>{m.content}</div>;
          }
          if (m.role === "bot-text") {
            return <div key={i} style={bubbleStyle(false)}>{m.content}</div>;
          }
          return <BotBubble key={i} result={m.result} />;
        })}
        {loading && <TypingDots />}
        <div ref={scrollRef} />
      </div>

      {messages.length <= 1 && (
        <div style={{display:"flex", flexWrap:"wrap", gap:6, marginBottom:10}}>
          {EXAMPLE_QUERIES.map((q, i) => (
            <button key={i} onClick={() => send(q)}
              style={{
                fontSize:12, color:T.teal, background:"rgba(0,201,167,0.08)",
                border:`1px solid ${T.tealDim}`, borderRadius:16,
                padding:"5px 11px", cursor:"pointer",
              }}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div style={{display:"flex", gap:8}}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
          placeholder="RSI below 30 and price above 50 day EMA"
          style={{
            flex:1, background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:8, padding:"11px 13px", color:T.white,
            fontSize:14, outline:"none",
          }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          style={{
            background:T.teal, color:"#04241D", border:"none",
            borderRadius:8, padding:"0 18px", fontWeight:700,
            fontSize:14, cursor: loading ? "default" : "pointer",
            opacity: loading || !input.trim() ? 0.6 : 1,
          }}>
          Send
        </button>
      </div>
    </div>
  );
}