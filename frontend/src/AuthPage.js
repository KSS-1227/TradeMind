// frontend/src/AuthPage.js
import { useState } from "react";
import { useAuth } from "./AuthContext";

const T = {
  bg:"#080E1A", surface:"#0D1F35", raised:"#132840",
  border:"#1E3A5F", teal:"#00C9A7", tealDim:"#009E84",
  gold:"#F6C90E", danger:"#F25C54", white:"#F0F4F8",
  muted:"#64748B", dim:"#334155",
};

export default function AuthPage() {
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // {type: "error"|"info", text}

  const submit = async () => {
    if (!email.trim() || !password) {
      setMessage({ type: "error", text: "Enter both email and password." });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { data, error } = await signUp(email.trim(), password);
        if (error) {
          setMessage({ type: "error", text: error.message });
        } else if (data?.user && !data.session) {
          // Email confirmation is on by default in Supabase — no active
          // session yet until the user clicks the link in their inbox.
          setMessage({ type: "info", text: "Check your email to confirm your account, then sign in." });
        }
        // If data.session exists, onAuthStateChange in AuthContext picks
        // it up automatically and the app re-renders past this page —
        // no manual redirect needed here.
      } else {
        const { error } = await signIn(email.trim(), password);
        if (error) setMessage({ type: "error", text: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: T.bg, padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 380, background: T.surface,
        border: `1px solid ${T.border}`, borderRadius: 14, padding: "32px 28px",
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.white, marginBottom: 4 }}>
          TradeMind
        </div>
        <div style={{ fontSize: 13.5, color: T.muted, marginBottom: 24 }}>
          {mode === "signin" ? "Sign in to your account" : "Create an account"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              placeholder="you@example.com"
              style={{
                width: "100%", background: T.raised, border: `1px solid ${T.border}`,
                borderRadius: 8, padding: "11px 13px", color: T.white, fontSize: 14,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 5 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              placeholder="At least 6 characters"
              style={{
                width: "100%", background: T.raised, border: `1px solid ${T.border}`,
                borderRadius: 8, padding: "11px 13px", color: T.white, fontSize: 14,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <button
            onClick={submit}
            disabled={loading}
            style={{
              background: T.teal, color: "#04241D", border: "none", borderRadius: 8,
              padding: "12px 16px", fontWeight: 700, fontSize: 14, marginTop: 6,
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Sign Up"}
          </button>

          {message && (
            <div style={{
              fontSize: 13, padding: "10px 12px", borderRadius: 8,
              background: message.type === "error" ? "rgba(242,92,84,0.1)" : "rgba(0,201,167,0.1)",
              border: `1px solid ${message.type === "error" ? T.danger : T.tealDim}`,
              color: T.white,
            }}>
              {message.text}
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: T.muted }}>
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(null); }}
            style={{ color: T.teal, cursor: "pointer", fontWeight: 600 }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}