import React from "react";
import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useGoldPrice } from "../../hooks/useMarketData";

export function AppLayout() {
  const isMobile = useIsMobile();
  const { gold } = useGoldPrice();

  return (
    <div className="app-shell">
      <TopBar gold={gold} isMobile={isMobile} />
      {!isMobile && <Sidebar />}
      {isMobile && <BottomNav />}
      
      <main className="app-main">
        <Outlet context={{ gold, isMobile }} />
      </main>
    </div>
  );
}
