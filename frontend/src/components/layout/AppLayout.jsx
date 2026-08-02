import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { BottomNavigation } from "./BottomNavigation";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useGoldPrice } from "../../hooks/useMarketData";

/**
 * AppLayout
 *
 * The single shell that wraps every authenticated page.
 *
 * Desktop:  Fixed sidebar (collapsible) + sticky top bar + scrollable main
 * Mobile:   Sticky top bar + scrollable main + fixed bottom navigation
 *
 * Sidebar width is tracked in state and passed as a CSS variable so the
 * main area can shift without a layout jump.
 */
export function AppLayout() {
  const isMobile = useIsMobile();
  const { gold } = useGoldPrice();
  const location = useLocation();

  // Sidebar width — 220 expanded, 64 collapsed.
  // We sync this from Sidebar via a CSS custom property so the main
  // margin can transition smoothly without prop drilling.
  const [sidebarWidth, setSidebarWidth] = useState(220);

  // Listen for sidebar collapse events via a CSS variable observer.
  // Sidebar manages its own state; we just track the rendered width.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
  }, [sidebarWidth]);

  // Reset sidebar observer when isMobile changes
  useEffect(() => {
    if (isMobile) {
      document.documentElement.style.setProperty("--sidebar-width", "0px");
    } else {
      document.documentElement.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
    }
  }, [isMobile, sidebarWidth]);

  return (
    <div className="app-shell" style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* ── Top bar — always visible ───────────────────────── */}
      <TopBar gold={gold} isMobile={isMobile} />

      {/* ── Sidebar — desktop only ─────────────────────────── */}
      {!isMobile && (
        <SidebarWithWidthCallback onWidthChange={setSidebarWidth} />
      )}

      {/* ── Main content area ──────────────────────────────── */}
      <main
        className="app-main"
        id="main-content"
        tabIndex={-1}
        role="main"
        style={{
          marginTop: 52,
          marginLeft: isMobile ? 0 : "var(--sidebar-width, 220px)",
          minHeight: "calc(100vh - 52px)",
          padding: isMobile ? "16px 14px 80px" : "28px 32px 48px",
          transition: "margin-left 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
          boxSizing: "border-box",
          maxWidth: isMobile ? "100%" : "calc(1080px + var(--sidebar-width, 220px))",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <Outlet
            key={location.pathname}
            context={{ gold, isMobile }}
          />
        </AnimatePresence>
      </main>

      {/* ── Bottom navigation — mobile only ────────────────── */}
      {isMobile && <BottomNavigation />}
    </div>
  );
}

/**
 * SidebarWithWidthCallback
 *
 * Wraps Sidebar and measures its rendered width via ResizeObserver
 * so AppLayout can update the main margin without prop drilling into Sidebar.
 */
function SidebarWithWidthCallback({ onWidthChange }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      onWidthChange(Math.round(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [onWidthChange]);

  return (
    <div ref={ref} style={{ position: "fixed", top: 52, left: 0, bottom: 0, zIndex: 90 }}>
      <Sidebar />
    </div>
  );
}
