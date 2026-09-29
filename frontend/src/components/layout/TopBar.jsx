import React, { useState, useEffect } from "react";
import { TrendingUp, Bell, Search, LogOut, ChevronRight, Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { MarketStatus } from "./MarketStatus";
import { AIStatus } from "./AIStatus";
import { fmt } from "../../utils/formatters";
import { NAV_ITEMS } from "../../constants/navigation";

function useCurrentTime() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function Breadcrumb({ pathname }) {
  const crumb = NAV_ITEMS.find(
    (n) => n.path !== "/" && pathname.startsWith(n.path)
  ) ?? (pathname === "/" ? NAV_ITEMS[0] : null);

  return (
    <nav aria-label="breadcrumb" style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>TradeMind</span>
      {crumb && crumb.path !== "/" && (
        <>
          <ChevronRight size={10} color="var(--text-muted)" />
          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>
            {crumb.label}
          </span>
        </>
      )}
    </nav>
  );
}

function GlobalSearch() {
  const [focused, setFocused] = useState(false);

  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 12px",
        borderRadius: "var(--radius-md)",
        background: focused ? "var(--bg-elevated)" : "var(--bg-primary)",
        border: `1px solid ${focused ? "var(--border-focus)" : "var(--border)"}`,
        transition: "all var(--transition-fast)",
        cursor: "text",
        minWidth: 180,
        maxWidth: 260,
      }}
    >
      <Search size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      <input
        type="text"
        placeholder="Search stocks, features… "
        aria-label="Global search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--text-primary)",
          fontSize: 12,
          flex: 1,
          fontFamily: "var(--font-sans)",
        }}
      />
      <kbd
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          padding: "1px 5px",
          flexShrink: 0,
        }}
      >
        ⌘K
      </kbd>
    </label>
  );
}

export function TopBar({ commodities, isMobile, onMenuClick }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const time = useCurrentTime();
  const { scrollY } = useScroll();
  const shadow = useTransform(scrollY, [0, 20], ["none", "0 1px 20px rgba(0,0,0,0.35)"]);

  const timeStr = time.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <motion.header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 52,
        background: "var(--bg-glass)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        boxShadow: shadow,
      }}
      role="banner"
    >
      {/* Mobile hamburger + Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 16px",
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          height: "100%",
          minWidth: isMobile ? 140 : 200,
        }}
      >
        {isMobile && (
          <button
            onClick={onMenuClick}
            aria-label="Open navigation"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "6px 7px",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <Menu size={15} />
          </button>
        )}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "linear-gradient(135deg, rgba(0,201,167,0.2) 0%, rgba(0,201,167,0.08) 100%)",
            border: "1px solid var(--color-teal-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-teal)",
            flexShrink: 0,
          }}
          className="ai-pulse"
          aria-hidden="true"
        >
          <TrendingUp size={16} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.2, color: "var(--text-primary)", lineHeight: 1.2 }}>
            TradeMind
          </div>
          <div style={{ fontSize: 8, color: "var(--color-teal)", letterSpacing: 1.2, fontWeight: 700, lineHeight: 1 }}>
            AI FINTECH · NSE INDIA
          </div>
        </div>
      </div>

      {/* Page context — desktop */}
      {!isMobile && (
        <div
          style={{
            padding: "0 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            borderRight: "1px solid var(--border)",
            height: "100%",
          }}
        >
          <Breadcrumb pathname={location.pathname} />
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Controls — right side */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 12,
          padding: "0 14px",
          flexShrink: 0,
        }}
      >
        {!isMobile && commodities && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 10px", borderRight: "1px solid var(--border)", height: "100%" }}>
            {[
              { label: "GOLD / 10g", quote: commodities.gold },
              { label: "SILVER / kg", quote: commodities.silver },
            ].map(({ label, quote }) => (
              <span
                key={label}
                title={`${quote?.source || "Quote unavailable"}${quote?.as_of ? ` · ${new Date(quote.as_of).toLocaleString("en-IN")}` : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700 }}>{label}</span>
                <span className="typo-mono ticker-live" style={{ fontSize: 11, fontWeight: 700 }}>
                  {quote ? `₹${fmt(quote.price_inr)}` : "—"}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Market Status */}
        <MarketStatus />

        {/* AI Status */}
        {!isMobile && <AIStatus state="ready" />}

        {/* Global Search — desktop */}
        {!isMobile && <GlobalSearch />}

        {/* Clock — desktop */}
        {!isMobile && (
          <span
            className="typo-mono"
            style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, userSelect: "none" }}
            aria-label={`Current time: ${timeStr}`}
          >
            {timeStr}
          </span>
        )}

        {/* Notifications */}
        <button
          aria-label="Notifications"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "6px 8px",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            transition: "all var(--transition-fast)",
          }}
        >
          <Bell size={14} />
        </button>

        {/* User avatar + sign out */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!isMobile && (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--color-teal-bg)",
                  border: "1px solid var(--color-teal-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-teal)",
                  flexShrink: 0,
                  userSelect: "none",
                }}
                aria-hidden="true"
              >
                {(user.email?.[0] ?? "U").toUpperCase()}
              </div>
            )}
            <button
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "5px 8px",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 600,
                transition: "all var(--transition-fast)",
              }}
            >
              <LogOut size={12} />
              {!isMobile && <span>Out</span>}
            </button>
          </div>
        )}
      </div>
    </motion.header>
  );
}
