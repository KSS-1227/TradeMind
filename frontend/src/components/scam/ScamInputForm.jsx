import React, { useState } from "react";
import { ShieldAlert, Upload, MessageSquare } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Textarea, Dropdown } from "../ui/Input";
import { toast } from "sonner";

export function ScamInputForm({ onAnalyze, loading }) {
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("whatsapp");
  const [stockSymbol, setStockSymbol] = useState("");
  const [error, setError] = useState("");

  const sampleMessages = {
    whatsapp: "🚨 URGENT BUY CALL! RELIANCE 100% Guaranteed 5000 Target by Friday!! Heavy Operator Buying. Join VIP Group for 10x Returns 🚀🚀",
    telegram: "⚡ INSIDER STOCK ALERT ⚡ TATAMOTORS Upper Circuit Expected Tomorrow! Buy Immediately before news breaks. NO LOSS GUARANTEE! 📈",
    sms: "FREE TIP: Buy INFY at market price. Target 2200. Multibagger stock recommendation from SEBI reg advisor. Call 9876543210 immediately.",
    email: "Exclusive Private Placement Opportunity: 300% Return in 30 Days guaranteed. Click http://suspicious-trade-fund.biz to invest now.",
  };

  const handlePastePreset = (key) => {
    setMessage(sampleMessages[key]);
    setSource(key);
    setError("");
    toast.success(`Loaded sample ${key.toUpperCase()} message.`);
  };

  const handleTextChange = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim().length >= 5) {
      setError("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message || message.trim().length < 5) {
      setError("Please enter at least 5 characters to analyze.");
      toast.error("Message must be at least 5 characters long.");
      return;
    }

    onAnalyze({
      message: message.trim(),
      source,
      stock_symbol: stockSymbol.trim() || undefined,
    });
  };

  const handleScreenshotDrop = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`OCR Scan complete for screenshot "${file.name}". Extracting text...`);
      setTimeout(() => {
        setMessage("🔥 URGENT STOCK TIP: BUY RELIANCE TODAY TARGET 3200 GUARANTEED RETURN BY OPERATOR GROUP!!");
        toast.success("Text extracted from image successfully!");
      }, 500);
    }
  };

  return (
    <Card style={{ marginBottom: "24px", padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            SCAM & FRAUD INVESTIGATION INPUT
          </h3>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: "3px 0 0 0" }}>
            Paste any suspicious stock tip, WhatsApp message, Telegram signal, SMS, or Email.
          </p>
        </div>

        {/* Preset Sample Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
            PASTE SAMPLES:
          </span>
          <button type="button" className="sd-preset-pill" onClick={() => handlePastePreset("whatsapp")}>
            <MessageSquare size={12} color="var(--success)" /> WhatsApp
          </button>
          <button type="button" className="sd-preset-pill" onClick={() => handlePastePreset("telegram")}>
            <MessageSquare size={12} color="var(--accent-blue)" /> Telegram
          </button>
          <button type="button" className="sd-preset-pill" onClick={() => handlePastePreset("sms")}>
            <MessageSquare size={12} color="var(--color-gold)" /> SMS
          </button>
          <button type="button" className="sd-preset-pill" onClick={() => handlePastePreset("email")}>
            <MessageSquare size={12} color="var(--danger)" /> Email
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Textarea Input */}
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <Textarea
            rows={5}
            value={message}
            onChange={handleTextChange}
            placeholder="Paste suspicious investment message here... e.g. 'BUY RELIANCE TODAY 100% GUARANTEED 10X RETURN BY VIP GROUP'"
            error={error}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "6px",
              fontSize: "11px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span>Min 5 characters required</span>
            <span>{message.length} characters</span>
          </div>
        </div>

        {/* Source & Stock Symbol Controls */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {/* Source Dropdown */}
          <Dropdown
            label="MESSAGE ORIGIN SOURCE"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            options={[
              { value: "whatsapp", label: "WhatsApp Chat / Group" },
              { value: "telegram", label: "Telegram Channel" },
              { value: "sms", label: "SMS Alert" },
              { value: "email", label: "Email Recommendation" },
              { value: "twitter", label: "Twitter / Social Media" },
              { value: "other", label: "Other Source" },
            ]}
          />

          {/* Optional Stock Symbol */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
              OPTIONAL STOCK SYMBOL
            </label>
            <input
              type="text"
              value={stockSymbol}
              onChange={(e) => setStockSymbol(e.target.value)}
              placeholder="e.g. RELIANCE, TCS"
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-input)",
                padding: "10px 14px",
                color: "var(--text-primary)",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Submit CTA */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="submit"
            variant="danger"
            size="lg"
            loading={loading}
            icon={ShieldAlert}
            style={{ paddingLeft: "32px", paddingRight: "32px" }}
          >
            Investigate Message
          </Button>
        </div>
      </form>

      {/* Drag & Drop Screenshot UI Only Upload */}
      <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)" }}>
        <div className="pd-dropzone" style={{ padding: "18px 16px" }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleScreenshotDrop}
            id="screenshot-upload-input"
            style={{ display: "none" }}
          />
          <label htmlFor="screenshot-upload-input" style={{ cursor: "pointer", display: "block" }}>
            <Upload size={22} color="var(--danger)" style={{ marginBottom: "6px" }} />
            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text-primary)" }}>
              Drag & Drop Screenshot for AI OCR Analysis (UI Only)
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
              Upload WhatsApp or Telegram chat screenshot to extract text automatically
            </div>
          </label>
        </div>
      </div>
    </Card>
  );
}

export default ScamInputForm;
