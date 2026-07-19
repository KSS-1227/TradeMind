// frontend/src/WhatsAppSubscribePage.js
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
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

const STOCK_LABELS = {
  NIFTYBEES: "NIFTY ETF", GOLDBEES: "Gold ETF",
  SILVERBEES: "Silver ETF",
};

const SANDBOX_NUMBER    = "+1 415 523 8886";
const SANDBOX_JOIN_CODE = "join slept-myself";

const SIG_COLOR = {
  BUY:  { bg: "rgba(0,201,167,0.12)",  border: "#00C9A7", text: "#00C9A7" },
  SELL: { bg: "rgba(242,92,84,0.12)",  border: "#F25C54", text: "#F25C54" },
  HOLD: { bg: "rgba(246,201,14,0.12)", border: "#F6C90E", text: "#F6C90E" },
};

export default function WhatsAppSubscribePage({ isMobile, onNav }) {
  const { profile } = useAuth();
  const whatsappNumber = profile?.whatsapp_number ?? null;

  const [symbol,     setSymbol]     = useState("RELIANCE");
  const [loading,    setLoading]    = useState(false);
  const [lastResult, setLastResult] = useState(null); // { signal, confidence, price, symbol }

  const sendAlert = async () => {
    if (!whatsappNumber) return;

    setLoading(true);
    setLastResult(null);

    // Wake HF Space — fire and forget so it's warming up during pipeline run
    axios.get(`${API}/health`).catch(() => {});

    try {
      const res = await axios.post(`${API}/whatsapp/send-alert`, {
        phone:  whatsappNumber,
        symbol,
      });

      setLastResult(res.data);
      toast.success("WhatsApp alert sent successfully! 📲", { duration: 4000 });
    } catch (e) {
      const status  = e.response?.status;
      const detail  = e.response?.data?.detail;

      if (status === 404 || status === 503 || !e.response) {
        toast.error(
          "Backend is starting up (HF free tier). Wait 30 seconds and try again.",
          { duration: 6000 }
        );
      } else {
        toast.error(detail || "Failed to send alert — try again.", { duration: 5000 });
      }
    } finally {
      setLoading(false);
    }
  };

  const sigStyle = lastResult ? (SIG_COLOR[lastResult.signal] || SIG_COLOR.HOLD) : null;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: isMobile ? "16px" : "24px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 4 }}>
          WhatsApp Alerts
        </h1>
        <p style={{ fontSize: 13, color: T.muted }}>
          Get an instant AI-generated stock alert on your WhatsApp with one click.
        </p>
      </div>

      {/* ── Registered number card ── */}
      <div style={{
        background: T.surface, border: `1px solid ${whatsappNumber ? T.border : T.danger}`,
        borderRadius: 10, padding: "14px 16px", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, color: T.muted, letterSpacing: 0.6, marginBottom: 5, fontWeight: 700 }}>
            📱 REGISTERED WHATSAPP
          </div>
          {whatsappNumber ? (
            <div style={{ fontSize: 15, fontWeight: 700, color: T.teal, fontFamily: "JetBrains Mono, monospace" }}>
              {whatsappNumber} <span style={{ fontSize: 12 }}>✓</span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: T.danger, lineHeight: 1.5 }}>
              No WhatsApp number found in your profile.
            </div>
          )}
        </div>
        {!whatsappNumber && onNav && (
          <button
            onClick={() => onNav("profile")}
            style={{
              background: "transparent", border: `1px solid ${T.teal}`,
              borderRadius: 7, padding: "7px 14px", color: T.teal,
              fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            Go to Profile →
          </button>
        )}
      </div>

      {/* ── Sandbox setup notice ── */}
      <div style={{
        background: T.raised, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: "12px 14px", marginBottom: 20, fontSize: 12.5,
      }}>
        <div style={{ fontWeight: 700, color: T.white, marginBottom: 5 }}>
          ⚙️ One-time Twilio setup required:
        </div>
        <div style={{ color: T.muted, lineHeight: 1.7 }}>
          Open WhatsApp → send{" "}
          <strong style={{ color: T.teal }}>{SANDBOX_JOIN_CODE}</strong> to{" "}
          <strong style={{ color: T.teal }}>{SANDBOX_NUMBER}</strong>.{" "}
          Do this once from your registered number before clicking Send.
        </div>
      </div>

      {/* ── Stock selector ── */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 6, fontWeight: 700, letterSpacing: 0.6 }}>
          SELECT STOCK
        </label>
        <select
          value={symbol}
          onChange={e => { setSymbol(e.target.value); setLastResult(null); }}
          style={{
            width: "100%", background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "11px 13px", color: T.white, fontSize: 14,
            outline: "none", boxSizing: "border-box", cursor: "pointer",
          }}
        >
          {STOCKS.map(s => (
            <option key={s} value={s}>{STOCK_LABELS[s] || s}</option>
          ))}
        </select>
      </div>

      {/* ── No number warning ── */}
      {!whatsappNumber && (
        <div style={{
          padding: "11px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13,
          background: "rgba(242,92,84,0.08)", border: `1px solid ${T.danger}`, color: T.danger,
        }}>
          Please add your WhatsApp number in your profile to send alerts.
        </div>
      )}

      {/* ── Send button ── */}
      <button
        onClick={sendAlert}
        disabled={loading || !whatsappNumber}
        style={{
          width: "100%", background: whatsappNumber ? T.teal : T.dim,
          color: whatsappNumber ? "#04241D" : T.muted,
          border: "none", borderRadius: 8, padding: "13px 16px",
          fontWeight: 800, fontSize: 14, letterSpacing: 0.3,
          cursor: loading || !whatsappNumber ? "not-allowed" : "pointer",
          opacity: loading ? 0.75 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "opacity 0.15s",
        }}
      >
        {loading ? (
          <>
            <span style={{
              width: 14, height: 14, border: "2px solid #04241D",
              borderTopColor: "transparent", borderRadius: "50%",
              display: "inline-block", animation: "spin 0.7s linear infinite",
            }}/>
            Generating & Sending…
          </>
        ) : (
          "📲 Send WhatsApp Alert"
        )}
      </button>

      {/* ── Last sent result card ── */}
      {lastResult && sigStyle && (
        <div style={{
          marginTop: 20, background: sigStyle.bg,
          border: `1px solid ${sigStyle.border}`,
          borderRadius: 10, padding: "16px",
          animation: "fadeIn 0.3s ease",
        }}>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: 0.6, marginBottom: 10 }}>
            ✅ ALERT SENT SUCCESSFULLY
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Stock</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.white }}>{lastResult.symbol}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Signal</div>
              <div style={{
                background: sigStyle.border, color: "#000",
                padding: "4px 14px", borderRadius: 6,
                fontSize: 13, fontWeight: 800, letterSpacing: 1,
              }}>
                {lastResult.signal}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Confidence</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: sigStyle.text, fontFamily: "JetBrains Mono, monospace" }}>
                {lastResult.confidence}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Price</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.white, fontFamily: "JetBrains Mono, monospace" }}>
                {lastResult.price}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: T.muted }}>
            Sent to <span style={{ color: T.teal }}>{whatsappNumber}</span>
          </div>
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
