import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NAV_ITEMS } from "../../constants/navigation";

export const SIDEBAR_EXPANDED  = 260;
export const SIDEBAR_COLLAPSED = 72;

const TRANSITION = { duration: 0.3, ease: [0.4, 0, 0.2, 1] };
const LABEL_TRANSITION = { duration: 0.18, ease: [0.4, 0, 0.2, 1] };

// ── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ label, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -6, scale: 0.95 }}
          animate={{ opacity: 1, x: 0,  scale: 1    }}
          exit={{    opacity: 0, x: -6, scale: 0.95 }}
          transition={{ duration: 0.12 }}
          role="tooltip"
          style={{
            position: "absolute",
            left: SIDEBAR_COLLAPSED + 6,
            top: "50%",
            transform: "translateY(-50%)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-hover)",
            borderRadius: "var(--radius-md)",
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 400,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {label}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Nav Item ─────────────────────────────────────────────────────────────────

function NavItem({ item, collapsed, onClose }) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <NavLink
        to={item.path}
        onClick={onClose}
        aria-label={item.label}
        style={({ isActive }) => ({
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: 40,
          padding: collapsed ? "0" : "0 12px",
          justifyContent: collapsed ? "center" : "flex-start",
          margin: "1px 8px",
          borderRadius: "var(--radius-md)",
          background: isActive
            ? "linear-gradient(135deg, rgba(0,201,167,0.14) 0%, rgba(0,201,167,0.06) 100%)"
            : hovered
            ? "rgba(255,255,255,0.04)"
            : "transparent",
          color: isActive ? "var(--color-teal)" : hovered ? "var(--text-primary)" : "var(--text-muted)",
          textDecoration: "none",
          cursor: "pointer",
          transition: "background 0.15s ease, color 0.15s ease",
          whiteSpace: "nowrap",
          overflow: "hidden",
          position: "relative",
          border: isActive ? "1px solid rgba(0,201,167,0.18)" : "1px solid transparent",
          boxShadow: isActive ? "0 0 12px rgba(0,201,167,0.08)" : "none",
        })}
      >
        {({ isActive }) => (
          <>
            {/* Left active bar */}
            {isActive && (
              <motion.div
                layoutId="activeBar"
                style={{
                  position: "absolute",
                  left: -8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3,
                  height: 20,
                  borderRadius: "0 2px 2px 0",
                  background: "var(--color-teal)",
                  boxShadow: "0 0 8px rgba(0,201,167,0.7)",
                }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}

            <Icon
              size={17}
              style={{
                flexShrink: 0,
                color: isActive ? "var(--color-teal)" : hovered ? "var(--text-primary)" : "var(--text-muted)",
                transition: "color 0.15s ease",
              }}
            />

            {/* Label */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{    opacity: 0, width: 0 }}
                  transition={LABEL_TRANSITION}
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    overflow: "hidden",
                    letterSpacing: isActive ? "-0.01em" : 0,
                  }}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>

            {/* AI badge */}
            <AnimatePresence initial={false}>
              {!collapsed && item.ai && (
                <motion.span
                  key="badge"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1   }}
                  exit={{    opacity: 0, scale: 0.7 }}
                  transition={LABEL_TRANSITION}
                  style={{
                    marginLeft: "auto",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--color-teal)",
                    background: "var(--color-teal-bg)",
                    border: "1px solid var(--color-teal-border)",
                    borderRadius: "var(--radius-pill)",
                    padding: "1px 5px",
                    letterSpacing: "0.4px",
                    flexShrink: 0,
                  }}
                >
                  AI
                </motion.span>
              )}
            </AnimatePresence>
          </>
        )}
      </NavLink>

      {/* Tooltip — collapsed only */}
      {collapsed && <Tooltip label={item.label} visible={hovered} />}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({ collapsed, onToggle, isMobile, mobileOpen, onMobileClose }) {
  const [aiHovered, setAiHovered] = useState(false);

  // Mobile: close on Escape
  useEffect(() => {
    if (!isMobile) return;
    const handler = (e) => { if (e.key === "Escape") onMobileClose?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMobile, onMobileClose]);

  const sidebarContent = (
    <motion.aside
      animate={{ width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
      transition={TRANSITION}
      aria-label="Primary navigation"
      style={{
        height: "100%",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        willChange: "width",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0" : "0 14px 0 16px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="brand"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{    opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}
            >
              <div
                style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: "linear-gradient(135deg, rgba(0,201,167,0.2) 0%, rgba(0,201,167,0.08) 100%)",
                  border: "1px solid var(--color-teal-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--color-teal)",
                }}
                className="ai-pulse"
              >
                <Sparkles size={14} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>
                  TradeMind
                </div>
                <div style={{ fontSize: 8, color: "var(--color-teal)", letterSpacing: 1.2, fontWeight: 700 }}>
                  AI FINTECH · NSE INDIA
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        {isMobile ? (
          <button
            onClick={onMobileClose}
            aria-label="Close navigation"
            style={btnStyle}
          >
            <X size={15} />
          </button>
        ) : (
          <button
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={btnStyle}
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={TRANSITION}
              style={{ display: "flex", alignItems: "center" }}
            >
              <Menu size={15} />
            </motion.div>
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav
        role="navigation"
        style={{ flex: 1, paddingTop: 8, paddingBottom: 8, overflowY: "auto", overflowX: "hidden" }}
      >
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            collapsed={collapsed}
            onClose={isMobile ? onMobileClose : undefined}
          />
        ))}
      </nav>

      {/* ── AI Status bottom ── */}
      <div style={{ padding: "8px", flexShrink: 0 }}>
        {collapsed ? (
          /* Collapsed: glowing dot */
          <div
            onMouseEnter={() => setAiHovered(true)}
            onMouseLeave={() => setAiHovered(false)}
            style={{ position: "relative", display: "flex", justifyContent: "center", padding: "8px 0" }}
          >
            <div
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--color-teal)",
                boxShadow: "0 0 8px rgba(0,201,167,0.8), 0 0 16px rgba(0,201,167,0.4)",
              }}
            />
            <Tooltip label="TradeMind AI · RF · LSTM · FinBERT" visible={aiHovered} />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              padding: "8px 10px",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, rgba(0,201,167,0.06) 0%, rgba(59,130,246,0.04) 100%)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <div
              style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: "var(--color-teal)",
                boxShadow: "0 0 6px rgba(0,201,167,0.8)",
              }}
            />
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-teal)", letterSpacing: "0.4px" }}>
                TRADEMIND AI
              </div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 500 }}>
                Models: RF · LSTM · FinBERT
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.aside>
  );

  // ── Mobile: overlay drawer ──
  if (isMobile) {
    return (
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{    opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              style={{
                position: "fixed", inset: 0, zIndex: 89,
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
            />
            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: -SIDEBAR_EXPANDED }}
              animate={{ x: 0 }}
              exit={{    x: -SIDEBAR_EXPANDED }}
              transition={TRANSITION}
              style={{
                position: "fixed", top: 0, left: 0, bottom: 0,
                width: SIDEBAR_EXPANDED, zIndex: 90,
              }}
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // ── Desktop: fixed rail ──
  return (
    <div
      style={{
        position: "fixed", top: 52, left: 0, bottom: 0,
        zIndex: 90,
        width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
        transition: `width ${TRANSITION.duration}s cubic-bezier(0.4,0,0.2,1)`,
        willChange: "width",
      }}
    >
      {sidebarContent}
    </div>
  );
}

// ── Shared button style ───────────────────────────────────────────────────────

const btnStyle = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "6px 7px",
  color: "var(--text-muted)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "border-color 0.15s ease, color 0.15s ease",
};
