import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Save,
  Shield,
  MessageSquare,
  Cpu,
  CheckCircle2,
  Zap,
  Globe,
  Bell,
} from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { normalizeWhatsAppNumber } from "../../utils/validators";
import { toast } from "sonner";
import { isDemoModeEnabled, setDemoModeEnabled } from "../../utils/demoMode";

/* Premium field wrapper */
function SettingsField({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-muted)",
          letterSpacing: "0.6px",
          textTransform: "uppercase",
          marginBottom: 7,
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5, lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

/* Inline input style */
const fieldStyle = {
  width: "100%",
  background: "var(--bg-elevated)",
  border: "1.5px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "11px 14px",
  color: "var(--text-primary)",
  fontSize: 14,
  fontFamily: "var(--font-sans)",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

const focusStyle = {
  borderColor: "var(--color-teal)",
  boxShadow: "0 0 0 3px rgba(0,201,167,0.12)",
};

/* AI Model info row */
function ModelRow({ label, value, icon: Icon, color }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid var(--border-subtle, rgba(255,255,255,0.04))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={14} color={color || "var(--color-teal)"} />
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
      </div>
      <span
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          color: color || "var(--color-teal)",
          background: `${color || "var(--color-teal)"}14`,
          border: `1px solid ${color || "var(--color-teal)"}30`,
          borderRadius: "var(--radius-pill)",
          padding: "2px 8px",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function SettingsPage() {
  const { user, profile, updateProfile } = useAuth();
  const [fullName, setFullName]   = useState(profile?.full_name || "");
  const [whatsapp, setWhatsapp]   = useState(profile?.whatsapp_number || "");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [demoMode, setDemoMode]   = useState(isDemoModeEnabled());

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      setDemoModeEnabled(demoMode);
      const normalizedWa = whatsapp ? normalizeWhatsAppNumber(whatsapp) : null;
      await updateProfile({
        full_name: fullName,
        whatsapp_number: normalizedWa || whatsapp,
      });
      setSaved(true);
      toast.success("Settings saved successfully");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      <div style={{ maxWidth: 720, margin: "0 auto", paddingBottom: 48 }}>

        {/* ── Hero ── */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: "var(--radius-pill)",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.25)",
              color: "var(--accent-blue)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.8px",
              marginBottom: 12,
            }}
          >
            <Shield size={11} /> ACCOUNT SETTINGS
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: "var(--text-primary)",
              marginBottom: 6,
            }}
          >
            Settings & Preferences
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Manage your account profile, WhatsApp signal alerts, and TradeMind AI configuration.
          </p>
          {demoMode && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "6px 10px", borderRadius: "999px", border: "1px solid rgba(52,211,153,0.25)", background: "rgba(52,211,153,0.12)", color: "var(--color-teal)", fontSize: 11, fontWeight: 700, letterSpacing: "0.5px" }}>
              <Zap size={12} /> DEMO MODE ACTIVE
            </div>
          )}
        </div>

        {/* ── Profile Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card
            style={{ marginBottom: 16, padding: "22px 24px" }}
            accent="var(--color-teal)"
            hoverLift={false}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 22,
                paddingBottom: 16,
                borderBottom: "1px solid var(--border)",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(0,201,167,0.2) 0%, rgba(0,201,167,0.06) 100%)",
                  border: "2px solid var(--color-teal-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--color-teal)",
                  flexShrink: 0,
                }}
              >
                {(user?.email?.[0] ?? "U").toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  {fullName || user?.email?.split("@")[0] || "TradeMind User"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{user?.email}</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--color-teal)",
                    background: "var(--color-teal-bg)",
                    border: "1px solid var(--color-teal-border)",
                    borderRadius: "var(--radius-pill)",
                    padding: "3px 10px",
                    letterSpacing: "0.4px",
                  }}
                >
                  PRO USER
                </span>
              </div>
            </div>

            <form onSubmit={handleSave}>
              {/* Email — readonly */}
              <SettingsField label="Account Email" hint="Your primary login email. Cannot be changed.">
                <input
                  type="email"
                  disabled
                  value={user?.email || ""}
                  style={{ ...fieldStyle, opacity: 0.55, cursor: "not-allowed" }}
                />
              </SettingsField>

              {/* Full Name */}
              <SettingsField label="Full Name" hint="Used in reports and personalized AI greetings.">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  style={fieldStyle}
                  onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </SettingsField>

              {/* WhatsApp */}
              <SettingsField
                label="WhatsApp Number"
                hint="Receive daily AI stock signals and alerts. Format: +91XXXXXXXXXX"
              >
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      display: "flex",
                      alignItems: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <MessageSquare size={15} color="var(--text-muted)" />
                  </div>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+919876543210"
                    style={{ ...fieldStyle, paddingLeft: 38 }}
                    onFocus={(e) => Object.assign(e.target.style, { ...focusStyle, paddingLeft: "38px" })}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--border)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </SettingsField>

              <SettingsField
                label="Demo Mode"
                hint="Enable sample portfolio, scam, screener, strategy, and wealth projection experiences without changing live API behavior."
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: demoMode ? "rgba(52,211,153,0.08)" : "var(--bg-elevated)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: demoMode ? "var(--color-teal)" : "var(--text-primary)" }}>
                      {demoMode ? "Demo Mode Active" : "Demo Mode Off"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                      {demoMode ? "Sample experiences are enabled for all demo flows." : "Live API flows remain active until you enable demo mode."}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDemoMode((value) => !value)}
                    style={{
                      border: "none",
                      borderRadius: "999px",
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: demoMode ? "var(--color-teal)" : "var(--bg-elevated)",
                      color: demoMode ? "#052e2b" : "var(--text-primary)",
                    }}
                  >
                    {demoMode ? "Enabled" : "Enable"}
                  </button>
                </div>
              </SettingsField>

              <Button
                type="submit"
                loading={saving}
                icon={saved ? CheckCircle2 : Save}
                variant={saved ? "success" : "primary"}
                size="lg"
              >
                {saving ? "Saving…" : saved ? "Saved Successfully!" : "Save Settings"}
              </Button>
            </form>
          </Card>
        </motion.div>

        {/* ── AI Engine Info Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
        >
          <Card
            style={{ padding: "22px 24px", marginBottom: 16 }}
            accent="var(--accent-purple)"
            hoverLift={false}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 18,
              }}
            >
              <Cpu size={16} color="var(--accent-purple)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                AI ENGINE CONFIGURATION
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--success)",
                  background: "var(--success-bg)",
                  border: "1px solid var(--success-border)",
                  borderRadius: "var(--radius-pill)",
                  padding: "2px 8px",
                }}
              >
                ● ONLINE
              </span>
            </div>

            <ModelRow icon={Zap}    label="Engine Version"    value="TradeMind V2.4 · Stable"      color="var(--color-teal)"    />
            <ModelRow icon={Cpu}    label="SHAP Explainer"    value="TreeExplainer · XGBoost v1.7" color="var(--accent-purple)" />
            <ModelRow icon={Globe}  label="FinBERT Sentiment" value="ProsusAI/finbert · v1.0"      color="var(--accent-blue)"   />
            <ModelRow icon={Bell}   label="Signal Frequency"  value="Daily · 9:00 AM IST"          color="var(--color-gold)"    />
            <ModelRow icon={Shield} label="API Protocol"      value="/v2 · REST · TLS 1.3"         color="var(--success)"       />

            <div
              style={{
                marginTop: 16,
                padding: "10px 14px",
                background: "rgba(139,92,246,0.07)",
                border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              ⚠️ Engine parameters are managed server-side. Contact support to request custom model configurations.
            </div>
          </Card>
        </motion.div>

        {/* ── Danger Zone ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.18 }}
        >
          <Card
            style={{ padding: "18px 24px" }}
            hoverLift={false}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Shield size={15} color="var(--danger)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", letterSpacing: "0.5px" }}>
                ACCOUNT SECURITY
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
              Your account is protected by Supabase authentication with row-level security. All API requests are authenticated
              and portfolio data is scoped to your user ID only.
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "var(--success-bg)",
                border: "1px solid var(--success-border)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                color: "var(--success)",
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={14} />
              Session active · Authenticated as {user?.email}
            </div>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
}

export default SettingsPage;
