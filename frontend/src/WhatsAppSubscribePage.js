// frontend/src/WhatsAppSubscribePage.js
import { useState } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

const API = "https://kss-1227-trademind.hf.space";

const T = {
  bg:"#080E1A", surface:"#0D1F35", raised:"#132840",
  border:"#1E3A5F", teal:"#00C9A7", tealDim:"#009E84",
  gold:"#F6C90E", danger:"#F25C54", white:"#F0F4F8",
  muted:"#64748B", dim:"#334155",
};

const STOCKS = [
  "RELIANCE","TCS","INFY","HDFCBANK","WIPRO",
  "ICICIBANK","BAJFINANCE","SBIN","ITC","ADANIENT",
  "NIFTYBEES","GOLDBEES","SILVERBEES",
];

const SANDBOX_NUMBER    = "+1 415 523 8886";
const SANDBOX_JOIN_CODE = "join slept-myself";

const boxStyle = (type) => ({
  marginTop: 14, padding: "12px 14px", borderRadius: 8, fontSize: 13.5,
  background: type === "success" ? "rgba(0,201,167,0.1)"
            : type === "warning" ? "rgba(246,201,14,0.1)"
            : "rgba(242,92,84,0.1)",
  border: `1px solid ${type === "success" ? T.tealDim : type === "warning" ? T.gold : T.danger}`,
  color: T.white,
  lineHeight: 1.6,
});

export default function WhatsAppSubscribePage({ isMobile, onNav }) {
  // Pull profile from AuthContext — already fetched at login, no extra request needed.
  const { profile } = useAuth();
  const whatsappNumber = profile?.whatsapp_number ?? null;

  const [symbol,  setSymbol]  = useState("RELIANCE");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null); // { type: "success"|"error"|"warning", message }

  const subscribe = async () => {
    if (!whatsappNumber) return;

    setLoading(true);
    setResult(null);
    try {
      // Wake up HF Space — fire and forget
      axios.get(`${API}/health`).catch(() => {});

      const res = await axios.post(`${API}/whatsapp/subscribe`, {
        phone: whatsappNumber,
        symbol,
      });

      if (!res.data.added) {
        setResult({ type: "warning", message: `Already subscribed to ${symbol} alerts.` });
      } else if (res.data.confirmation_sent) {
        setResult({ type: "success", message: `Subscribed! You'll receive ${symbol} alerts on ${whatsappNumber}.` });
      } else {
        setResult({
          type: "warning",
          message: `Saved, but the WhatsApp confirmation didn't deliver `
            + `(${res.data.confirmation_error || "unknown error"}). `
            + `Have you joined the sandbox? See setup instructions below.`,
        });
      }
    } catch (e) {
      const status = e.response?.status;
      if (status === 404 || status === 503 || !e.response) {
        setResult({
          type: "error",
          message: "Backend is starting up (HF free tier sleeps on inactivity). Wait 30 seconds and try again.",
        });
      } else {
        setResult({
          type: "error",
          message: e.response?.data?.detail || "Something went wrong — try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: isMobile ? "16px" : "24px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.white, marginBottom: 6 }}>
        WhatsApp Alerts
      </div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
        Get a WhatsApp message the moment a stock's signal changes to BUY or SELL.
      </div>

      {/* ── Registered number card ── */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 10, padding: "14px 16px", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, color: T.muted, letterSpacing: 0.6, marginBottom: 4, fontWeight: 600 }}>
            📱 REGISTERED WHATSAPP
          </div>
          {whatsappNumber ? (
            <div style={{ fontSize: 15, fontWeight: 700, color: T.teal, fontFamily: "JetBrains Mono, monospace" }}>
              {whatsappNumber}{" "}
              <span style={{ fontSize: 13, color: T.tealDim }}>✓</span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: T.danger }}>
              No WhatsApp number found in your profile.
            </div>
          )}
        </div>
        {!whatsappNumber && onNav && (
          <button
            onClick={() => onNav("profile")}
            style={{
              background: "transparent", border: `1px solid ${T.border}`,
              borderRadius: 7, padding: "7px 14px", color: T.teal,
              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            Go to Profile →
          </button>
        )}
      </div>

      {/* ── Sandbox setup notice ── */}
      <div style={{
        background: T.raised, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: "12px 14px", marginBottom: 20, fontSize: 13,
      }}>
        <div style={{ fontWeight: 600, color: T.white, marginBottom: 6 }}>
          One-time setup (Twilio free tier requirement):
        </div>
        <div style={{ color: T.muted, lineHeight: 1.6 }}>
          Open WhatsApp and send{" "}
          <strong style={{ color: T.teal }}>{SANDBOX_JOIN_CODE}</strong> to{" "}
          <strong style={{ color: T.teal }}>{SANDBOX_NUMBER}</strong>.{" "}
          Do this once from your registered number — otherwise messages won't deliver.
        </div>
      </div>

      {/* ── Stock selector + subscribe ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 5, fontWeight: 600 }}>
            STOCK TO WATCH
          </label>
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            style={{
              width: "100%", background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: "11px 13px", color: T.white, fontSize: 14,
              outline: "none", boxSizing: "border-box",
            }}
          >
            {STOCKS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* No number → show disabled state with message */}
        {!whatsappNumber && (
          <div style={boxStyle("error")}>
            Please add your WhatsApp number in your profile before subscribing.
          </div>
        )}

        <button
          onClick={subscribe}
          disabled={loading || !whatsappNumber}
          style={{
            background: whatsappNumber ? T.teal : T.dim,
            color: whatsappNumber ? "#04241D" : T.muted,
            border: "none", borderRadius: 8, padding: "12px 16px",
            fontWeight: 700, fontSize: 14, marginTop: 4,
            cursor: loading || !whatsappNumber ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Subscribing..." : "Subscribe"}
        </button>

        {result && <div style={boxStyle(result.type)}>{result.message}</div>}
      </div>
    </div>
  );
}
