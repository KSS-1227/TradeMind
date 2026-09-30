import React, { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TopBar } from "./TopBar";
import { Sidebar, SIDEBAR_COLLAPSED, SIDEBAR_EXPANDED } from "./Sidebar";
import { BottomNavigation } from "./BottomNavigation";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useCommodityPrices, useMarketQuotes } from "../../hooks/useMarketData";

const LS_KEY = "tm_sidebar_collapsed";
const MAIN_TRANSITION = "margin-left 0.3s cubic-bezier(0.4,0,0.2,1)";

export function AppLayout() {
  const isMobile = useIsMobile();
  const { commodities, loading: commodityLoading } = useCommodityPrices();
  const marketQuotes = useMarketQuotes();
  const location = useLocation();

  // Collapsed state — persisted in localStorage
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(LS_KEY) === "true"; }
    catch { return false; }
  });

  // Mobile drawer open state
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(LS_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Sync CSS variable for any consumers that read it
  useEffect(() => {
    const w = isMobile ? 0 : collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;
    document.documentElement.style.setProperty("--sidebar-width", `${w}px`);
  }, [isMobile, collapsed]);

  const sidebarW = isMobile ? 0 : collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>

      {/* Top bar — full width, always on top */}
      <TopBar
        commodities={commodities}
        isMobile={isMobile}
        onMenuClick={() => setMobileOpen(true)}
      />

      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content */}
      <main
        id="main-content"
        tabIndex={-1}
        role="main"
        style={{
          marginTop: 52,
          marginLeft: sidebarW,
          minHeight: "calc(100vh - 52px)",
          padding: isMobile ? "16px 14px 80px" : "28px 32px 48px",
          transition: isMobile ? "none" : MAIN_TRANSITION,
          boxSizing: "border-box",
          willChange: "margin-left",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <Outlet context={{ commodities, commodityLoading, marketQuotes, isMobile }} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom nav — mobile only */}
      {isMobile && <BottomNavigation />}
    </div>
  );
}
