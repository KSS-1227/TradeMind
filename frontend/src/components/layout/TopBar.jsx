import React, { useState, useEffect } from "react";
import { TrendingUp, Coins, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { fetchStockPrices } from "../../services/marketService";
import { fmt } from "../../utils/formatters";

export function TopBar({ gold, isMobile }) {
  const [nifty, setNifty] = useState(null);
  const { user, signOut } = useAuth();

  useEffect(() => {
    let isMounted = true;
    fetchStockPrices("NIFTYBEES")
      .then((r) => {
        const d = r.data || r;
        if (Array.isArray(d) && d.length >= 2) {
          const last = d[d.length - 1].Close;
          const prev = d[d.length - 2].Close;
          const chg = (((last - prev) / prev) * 100).toFixed(2);
          if (isMounted) setNifty({ value: last.toFixed(1), change: chg });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="app-header">
      {/* Brand logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "0 16px",
          flexShrink: 0,
          borderRight: "1px solid var(--border-color)",
          height: "100%",
          minWidth: isMobile ? "140px" : "200px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: "var(--color-teal-bg)",
            border: "1px solid var(--color-teal-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-teal)",
          }}
        >
          <TrendingUp size={18} />
        </div>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "0.5px", color: "var(--text-primary)" }}>
            TradeMind
          </div>
          <div style={{ fontSize: "8.5px", color: "var(--color-teal)", letterSpacing: "0.5px", fontWeight: 700 }}>
            AI CO-PILOT · NSE
          </div>
        </div>
      </div>

      {/* Ticker Bar (Desktop) */}
      {!isMobile && (
        <div style={{ display: "flex", alignItems: "center", flex: 1, height: "100%", overflow: "hidden" }}>
          {nifty && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0 16px",
                borderRight: "1px solid var(--border-color)",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>NIFTY</span>
              <span
                className="mono"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: parseFloat(nifty.change) >= 0 ? "var(--color-teal)" : "var(--color-danger)",
                }}
              >
                ₹{nifty.value}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: parseFloat(nifty.change) >= 0 ? "var(--color-teal)" : "var(--color-danger)",
                }}
              >
                {parseFloat(nifty.change) >= 0 ? "+" : ""}
                {nifty.change}%
              </span>
            </div>
          )}

          {gold && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0 16px",
                borderRight: "1px solid var(--border-color)",
                whiteSpace: "nowrap",
              }}
            >
              <Coins size={14} color="var(--color-gold)" />
              <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>GOLD 24K/10g</span>
              <span
                className="mono"
                style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-gold)" }}
              >
                ₹{fmt(gold.current_price_10g)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Mobile Ticker */}
      {isMobile && gold && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 10px" }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>GOLD </span>
          <span className="mono" style={{ fontSize: "11px", color: "var(--color-gold)", marginLeft: "4px" }}>
            ₹{fmt(gold.current_price_10g)}/10g
          </span>
        </div>
      )}

      {/* User Actions */}
      <div style={{ padding: "0 14px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span className="live-dot" />
          <span style={{ fontSize: "10px", color: "var(--color-teal)", fontWeight: 600 }}>LIVE</span>
        </div>

        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "6px" }}>
            {!isMobile && (
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {user.email}
              </span>
            )}
            <button
              onClick={signOut}
              title="Sign Out"
              style={{
                background: "transparent",
                color: "var(--text-muted)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.15s ease",
              }}
            >
              <LogOut size={13} />
              {!isMobile && <span>Sign out</span>}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
