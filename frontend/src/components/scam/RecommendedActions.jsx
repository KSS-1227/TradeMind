import React from "react";
import { motion } from "framer-motion";
import { ShieldX, AlertOctagon, ExternalLink, UserX, ShieldCheck } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { toast } from "sonner";

export function RecommendedActions({ riskScore = 85 }) {
  const actions = [
    {
      icon: ShieldX,
      title: "Avoid Investment / Do Not Trade",
      desc: "Do not execute trades based on unverified social media signals or guaranteed returns tips.",
      priority: "URGENT",
      priorityVariant: "danger",
      btnText: "Flag as Fraud",
      action: () => toast.error("Marked message as Fraud."),
    },
    {
      icon: AlertOctagon,
      title: "Report to Cyber Crime & SEBI",
      desc: "Report unregistered tipsters and pump & dump schemes directly to SEBI SCORES or CyberCell portal.",
      priority: "HIGH PRIORITY",
      priorityVariant: "warning",
      btnText: "Open Reporting Info",
      action: () => toast.info("Opening SEBI CyberCell report guide..."),
    },
    {
      icon: ExternalLink,
      title: "Verify Official NSE / BSE Filings",
      desc: "Cross-reference company announcements on official exchanges before placing orders.",
      priority: "RECOMMENDED",
      priorityVariant: "blue",
      btnText: "Go to NSE India",
      action: () => window.open("https://www.nseindia.com", "_blank"),
    },
    {
      icon: UserX,
      title: "Block & Mute Sender",
      desc: "Block sender on WhatsApp/Telegram to prevent further spam and phishing attempts.",
      priority: "SECURITY STEP",
      priorityVariant: "teal",
      btnText: "Block Contact",
      action: () => toast.success("Contact blocked."),
    },
  ];

  return (
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        <ShieldCheck size={18} color="var(--danger)" />
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          RECOMMENDED SECURITY ACTIONS
        </h3>
      </div>

      <div className="sd-actions-grid">
        {actions.map((act, i) => {
          const IconComp = act.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.25 }}
            >
              <Card
                variant="feature"
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "18px",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <IconComp size={18} color={act.priorityVariant === "danger" ? "var(--danger)" : "var(--color-teal)"} />
                      <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                        {act.title}
                      </h4>
                    </div>

                    <Badge variant={act.priorityVariant} size="sm">
                      {act.priority}
                    </Badge>
                  </div>

                  <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: "0 0 14px 0", lineHeight: 1.5 }}>
                    {act.desc}
                  </p>
                </div>

                <Button variant="secondary" size="sm" fullWidth onClick={act.action}>
                  {act.btnText}
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default RecommendedActions;
