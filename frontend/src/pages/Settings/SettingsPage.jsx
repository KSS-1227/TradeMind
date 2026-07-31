import React, { useState } from "react";
import { User, Key, Save } from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { normalizeWhatsAppNumber } from "../../utils/validators";
import { toast } from "sonner";

export function SettingsPage() {
  const { user, profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp_number || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const normalizedWa = whatsapp ? normalizeWhatsAppNumber(whatsapp) : null;
      await updateProfile({
        full_name: fullName,
        whatsapp_number: normalizedWa || whatsapp,
      });
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      <div style={{ marginBottom: "20px" }}>
        <h1 className="page-title">Settings & Preferences</h1>
        <p className="page-sub">Manage your account profile, WhatsApp signal alerts, and security options.</p>
      </div>

      <div style={{ maxWidth: 640 }}>
        <Card style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <User size={18} color="var(--color-teal)" /> Profile Information
          </div>

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Account Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                style={{
                  width: "100%",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "var(--text-muted)",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                WhatsApp Number (for daily signal alerts)
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+919876543210"
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            <Button type="submit" loading={saving} icon={Save} style={{ marginTop: 6 }}>
              Save Settings
            </Button>
          </form>
        </Card>

        {/* API & System Security Settings */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Key size={18} color="var(--color-gold)" /> API Endpoints & Protocol
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <div>Engine Version: <strong>TradeMind V2.4 (Stable /v2)</strong></div>
            <div>SHAP Explainer: <strong>TreeExplainer XGBoost v1.7</strong></div>
            <div>FinBERT Sentiment: <strong>ProsusAI/finbert</strong></div>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}

export default SettingsPage;
