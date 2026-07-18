// frontend/src/WhatsAppSubscribePage.js
import { useState } from "react";
import axios from "axios";

const API = "https://kss-1227-trademind.hf.space";

// Same theme object as App.js — see the note in ScreenerPage.js about
// keeping this in sync manually until T is pulled into a shared module.
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

// Your Twilio sandbox join number + code — from Twilio Console > Messaging
// > Try it out > Send a WhatsApp message. This is a FREE-tier sandbox
// limitation: Twilio can only message a number AFTER that number has
// WhatsApp'd this join code once. Every new subscriber (including judges)
// needs to do this — there's no way to skip it on the sandbox tier.
const SANDBOX_NUMBER = "+1 415 523 8886";
const SANDBOX_JOIN_CODE = "join slept-myself"; // replace with your actual code if it differs

export default function WhatsAppSubscribePage({ isMobile }) {
  const [phone, setPhone] = useState("");
  const [symbol, setSymbol] = useState("RELIANCE");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // {type: "success"|"error"|"warning", message}

  const subscribe = async () => {
    const cleaned = phone.trim();
    if (!cleaned) {
      setResult({ type: "error", message: "Enter a phone number first." });
      return;
    }
    // Light validation — full E.164 validation is overkill for a demo form,
    // but catching "forgot the country code" saves a confusing round trip.
    if (!/^\+?\d{10,15}$/.test(cleaned.replace(/\s/g, ""))) {
      setResult({ type: "error", message: "Use format +91XXXXXXXXXX (include country code)." });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/whatsapp/subscribe`, {
        phone: cleaned.startsWith("+") ? cleaned : `+${cleaned}`,
        symbol,
      });

      if (!res.data.added) {
        setResult({ type: "warning", message: `Already subscribed to ${symbol} on this number.` });
      } else if (res.data.confirmation_sent) {
        setResult({ type: "success", message: `Subscribed! Check WhatsApp on ${cleaned} for a confirmation message.` });
      } else {
        // Subscription saved, but the confirmation WhatsApp failed to
        // deliver — almost always means this number hasn't joined the
        // Twilio sandbox yet. Surface that clearly instead of a vague error.
        setResult({
          type: "warning",
          message: `Saved, but the WhatsApp confirmation didn't deliver `
            + `(${res.data.confirmation_error || "unknown error"}). `
            + `Have you joined the sandbox? See instructions below.`,
        });
      }
    } catch (e) {
      setResult({ type: "error", message: e.response?.data?.detail || "Something went wrong — try again." });
    } finally {
      setLoading(false);
    }
  };

  const boxStyle = (type) => ({
    marginTop: 14, padding: "12px 14px", borderRadius: 8, fontSize: 13.5,
    background: type === "success" ? "rgba(0,201,167,0.1)"
              : type === "warning" ? "rgba(246,201,14,0.1)"
              : "rgba(242,92,84,0.1)",
    border: `1px solid ${type === "success" ? T.tealDim : type === "warning" ? T.gold : T.danger}`,
    color: T.white,
  });

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: isMobile ? "16px" : "24px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.white, marginBottom: 6 }}>
        WhatsApp Alerts
      </div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
        Get a WhatsApp message the moment a stock's signal changes to BUY or SELL.
        Works for any number — subscribe with your own.
      </div>

      {/* Sandbox join instructions — shown up front so first-time users
          (including judges testing this live) don't hit a silent failure. */}
      <div style={{
        background: T.raised, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: "12px 14px", marginBottom: 20, fontSize: 13,
      }}>
        <div style={{ fontWeight: 600, color: T.white, marginBottom: 6 }}>
          One-time setup (required by WhatsApp/Twilio's free tier):
        </div>
        <div style={{ color: T.muted }}>
          Open WhatsApp and send <strong style={{ color: T.teal }}>{SANDBOX_JOIN_CODE}</strong> to{" "}
          <strong style={{ color: T.teal }}>{SANDBOX_NUMBER}</strong>. Do this once, from the same
          phone number you subscribe with below — otherwise messages won't deliver.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 5 }}>
            Your WhatsApp number
          </label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+919876543210"
            style={{
              width: "100%", background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: "11px 13px", color: T.white, fontSize: 14, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 5 }}>
            Stock to watch
          </label>
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            style={{
              width: "100%", background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: "11px 13px", color: T.white, fontSize: 14, outline: "none",
              boxSizing: "border-box",
            }}
          >
            {STOCKS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <button
          onClick={subscribe}
          disabled={loading}
          style={{
            background: T.teal, color: "#04241D", border: "none", borderRadius: 8,
            padding: "12px 16px", fontWeight: 700, fontSize: 14,
            cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1, marginTop: 4,
          }}
        >
          {loading ? "Subscribing..." : "Subscribe"}
        </button>

        {result && <div style={boxStyle(result.type)}>{result.message}</div>}
      </div>
    </div>
  );
}