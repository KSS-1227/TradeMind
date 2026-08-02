import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NAV_ITEMS } from "../../constants/navigation";

const SIDEBAR_W_EXPANDED  = 220;
const SIDEBAR_W_COLLAPSED = 64;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered]     = useState(null);

  const width = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED;

  return (
    <motion.aside
      animate={{ width }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Primary navigation"
      style={{
        position: "fixed",
        left: 0,
        top: 52,
        bottom: 0,
        width,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 90,
        overflow: "hidden",
      }}
    >
      {/* ── Nav Items ── */}
      <nav style={{ flex: 1, paddingTop: 10, paddingBottom: 8 }} role="navigation">
        {NAV_ITEMS.map((item) => {
          const Icon        = item.icon;
          const showTooltip = collapsed && hovered === item.id;

          return (
            <div key={item.id} style={{ position: "relative" }}>
              <NavLink
                to={item.path}
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                aria-label={item.label}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  height: 42,
                  padding: collapsed ? "0 20px" : "0 14px",
                  margin: "2px 8px",
                  borderRadius: "var(--radius-md)",
                  background: isActive
                    ? "linear-gradient(135deg, rgba(0,201,167,0.14) 0%, rgba(0,201,167,0.06) 100%)"
                    : "transparent",
                  color: isActive ? "var(--color-teal)" : "var(--text-muted)",
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "background var(--transition-fast), color var(--transition-fast)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  position: "relative",
                  border: isActive
                    ? "1px solid rgba(0,201,167,0.2)"
                    : "1px solid transparent",
                })}
              >
                {({ isActive }) => (
                  <>
                    {/* Animated left accent bar */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActiveIndicator"
                        style={{
                          position: "absolute",
                          left: -8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 3,
                          height: 22,
                          borderRadius: "0 2px 2px 0",
                          background: "var(--color-teal)",
                          boxShadow: "0 0 8px rgba(0,201,167,0.6)",
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}

                    <Icon
                      size={17}
                      style={{
                        flexShrink: 0,
                        color: isActive ? "var(--color-teal)" : "var(--text-muted)",
                        transition: "color 0.15s ease",
                      }}
                    />

                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            fontSize: 13,
                            fontWeight: isActive ? 700 : 500,
                            letterSpacing: isActive ? "-0.01em" : 0,
                          }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* AI badge for flagship features */}
                    {!collapsed && item.ai && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
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
                        }}
                      >
                        AI
                      </motion.span>
                    )}
                  </>
                )}
              </NavLink>

              {/* Collapsed tooltip */}
              <AnimatePresence>
                {showTooltip && (
                  <motion.div
                    initial={{ opacity: 0, x: -6, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0,  scale: 1    }}
                    exit={{ opacity: 0, x: -6, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    role="tooltip"
                    style={{
                      position: "absolute",
                      left: SIDEBAR_W_COLLAPSED + 8,
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
                      zIndex: 300,
                      boxShadow: "var(--shadow-lg)",
                    }}
                  >
                    {item.label}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* ── AI Copilot Watermark (only expanded) ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              margin: "0 12px 8px",
              padding: "8px 10px",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, rgba(0,201,167,0.06) 0%, rgba(59,130,246,0.04) 100%)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkles size={12} color="var(--color-teal)" />
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
      </AnimatePresence>

      {/* ── Collapse Toggle ── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="sidebar-collapse-btn"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 8,
          margin: "0 8px 12px",
          padding: collapsed ? "9px 20px" : "9px 12px",
          borderRadius: "var(--radius-md)",
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          transition: "all var(--transition-fast)",
          fontFamily: "var(--font-sans)",
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </motion.aside>
  );
}
