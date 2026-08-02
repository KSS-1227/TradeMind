import React from "react";
import { motion } from "framer-motion";

/**
 * PageHeader
 *
 * Consistent page-level heading block used at the top of every page.
 *
 * Props:
 *   title      — primary heading (required)
 *   subtitle   — muted supporting text
 *   actions    — ReactNode rendered right-aligned (buttons, badges, etc.)
 *   icon       — Lucide icon component rendered before the title
 *
 * Usage:
 *   <PageHeader
 *     title="Portfolio Doctor"
 *     subtitle="AI capital allocation across 2-5 NSE assets."
 *     actions={<Button>Generate</Button>}
 *   />
 */
export function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: "var(--space-5)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {Icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: "var(--color-teal-bg)",
              border: "1px solid var(--color-teal-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-teal)",
              flexShrink: 0,
              marginTop: 2,
            }}
            aria-hidden="true"
          >
            <Icon size={18} />
          </div>
        )}
        <div>
          <h1
            className="page-title"
            style={{ margin: 0 }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="page-sub" style={{ marginBottom: 0, marginTop: 2 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </motion.div>
  );
}
