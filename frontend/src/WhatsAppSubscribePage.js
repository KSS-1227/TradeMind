// frontend/src/WhatsAppSubscribePage.js
import { useAuth } from "./AuthContext";

const SANDBOX_NUMBER    = "+1 415 523 8886";
const SANDBOX_JOIN_CODE = "join slept-myself";

const T = {
  bg: "#080E1A", surface: "#0D1F35", raised: "#132840",
  border: "#1E3A5F", teal: "#00C9A7", danger: "#F25C54",
  white: "#F0F4F8", muted: "#64748B", dim: "#334155",
};

const card = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: "16px 18px",
  marginBottom: 16,
};

const label = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.6,
  color: T.muted,
  marginBottom: 8,
  display: "block",
};

const QUICK_STEPS = [
  {
    n: "1",
    title: "Join the Twilio WhatsApp Sandbox",
    body: (
      <>
        Open WhatsApp → send{" "}
        <span style={{ color: T.teal, fontWeight: 700 }}>{SANDBOX_JOIN_CODE}</span>
        {" "}to{" "}
        <span style={{ color: T.teal, fontWeight: 700 }}>{SANDBOX_NUMBER}</span>
        {" "}(one-time only).
      </>
    ),
  },
  {
    n: "2",
    title: "Open WhatsApp",
    body: "Start a chat with the same Twilio sandbox number.",
  },
  {
    n: "3",
    title: "Send any supported stock name",
    body: (
      <>
        <div style={{ color: T.muted, marginBottom: 6 }}>Examples:</div>
        {["RELIANCE", "TCS", "INFY"].map(s => (
          <div key={s} style={{
            display: "inline-block", background: T.raised,
            border: `1px solid ${T.border}`, borderRadius: 5,
            padding: "3px 10px", marginRight: 6, marginBottom: 4,
            fontSize: 12, fontWeight: 700, color: T.teal,
            fontFamily: "JetBrains Mono, monospace",
          }}>
            {s}
          </div>
        ))}
      </>
    ),
  },
];

const COMMANDS = [
  { cmd: "RELIANCE", desc: "Full AI analysis for a stock" },
  { cmd: "NEWS",     desc: "Latest news for last viewed stock" },
  { cmd: "TECHNICAL",desc: "Technical indicator summary" },
  { cmd: "COMPARE TCS", desc: "Compare two stocks" },
  { cmd: "HELP",     desc: "Show all commands" },
];

const COPILOT_FEATURES = [
  "AI Recommendation",
  "Latest Market News",
  "Technical Analysis",
  "Confidence Score",
  "Risk Assessment",
];

export default function WhatsAppSubscribePage({ isMobile, onNav }) {
  const { profile } = useAuth();
  const whatsappNumber = profile?.whatsapp_number ?? null;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: isMobile ? "16px" : "24px" }}>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.white, marginBottom: 5 }}>
          TradeMind AI WhatsApp
        </h1>
        <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
          Chat with TradeMind AI directly from WhatsApp for live stock insights,
          AI recommendations, technical analysis, and market news.
        </p>
      </div>

      {/* Connected number card */}
      <div style={{
        ...card,
        border: `1px solid ${whatsappNumber ? T.border : T.danger}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div>
          <span style={label}>📱 CONNECTED WHATSAPP NUMBER</span>
          {whatsappNumber ? (
            <div style={{ fontSize: 15, fontWeight: 700, color: T.teal, fontFamily: "JetBrains Mono, monospace" }}>
              {whatsappNumber}
              <span style={{ fontSize: 12, marginLeft: 8, color: T.teal }}>
                Ready for AI Chat ✓
              </span>
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
              background: "transparent", border: `1px solid ${T.teal}`,
              borderRadius: 7, padding: "7px 14px", color: T.teal,
              fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            Go to Profile →
          </button>
        )}
      </div>

      {/* Quick Start card */}
      <div style={card}>
        <span style={label}>⚡ QUICK START</span>
        {QUICK_STEPS.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < QUICK_STEPS.length - 1 ? 14 : 0 }}>
            <div style={{
              minWidth: 24, height: 24, borderRadius: "50%",
              background: T.raised, border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, color: T.teal, flexShrink: 0,
            }}>
              {step.n}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 3 }}>
                {step.title}
              </div>
              <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>
                {step.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Supported Commands card */}
      <div style={card}>
        <span style={label}>💬 SUPPORTED COMMANDS</span>
        {COMMANDS.map(({ cmd, desc }) => (
          <div key={cmd} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "7px 0",
            borderBottom: `1px solid ${T.raised}`,
          }}>
            <span style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12, fontWeight: 700, color: T.teal,
              minWidth: 110,
            }}>
              {cmd}
            </span>
            <span style={{ fontSize: 12, color: T.muted }}>{desc}</span>
          </div>
        ))}
      </div>

      {/* AI Copilot info card */}
      <div style={{ ...card, border: `1px solid ${T.teal}22` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 10 }}>
          🤖 TradeMind AI is ready.
        </div>
        <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 10 }}>
          Open WhatsApp and send:{" "}
          <span style={{ color: T.teal, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
            RELIANCE
          </span>
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>You'll receive:</div>
        {COPILOT_FEATURES.map(f => (
          <div key={f} style={{ fontSize: 12.5, color: T.white, marginBottom: 4 }}>
            <span style={{ color: T.teal, marginRight: 6 }}>✓</span>{f}
          </div>
        ))}
      </div>

    </div>
  );
}
