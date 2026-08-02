import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Briefcase,
  Search,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

const MOBILE_NAV = [
  { id: "dashboard", path: "/",                  label: "Home",     icon: LayoutDashboard },
  { id: "screener",  path: "/screener",           label: "Screener", icon: Search         },
  { id: "portfolio", path: "/portfolio-doctor",   label: "Portfolio",icon: Briefcase      },
  { id: "strategy",  path: "/strategy-builder",   label: "Strategy", icon: TrendingUp     },
  { id: "scam",      path: "/scam-detector",      label: "Scam AI",  icon: ShieldAlert    },
];

export function BottomNavigation() {
  return (
    <nav
      aria-label="Mobile navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "calc(60px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "rgba(12, 17, 35, 0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 100,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {MOBILE_NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.id}
            to={item.path}
            aria-label={item.label}
            end={item.path === "/"}
            style={{ textDecoration: "none", flex: 1, display: "flex", justifyContent: "center" }}
          >
            {({ isActive }) => (
              <motion.div
                whileTap={{ scale: 0.88 }}
                transition={{ duration: 0.12 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 8px",
                  position: "relative",
                  minWidth: 48,
                }}
              >
                {/* Active glow background pill */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavPill"
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "var(--radius-md)",
                      background: "rgba(0,201,167,0.1)",
                      border: "1px solid rgba(0,201,167,0.2)",
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}

                {/* Icon */}
                <Icon
                  size={20}
                  style={{
                    position: "relative",
                    color: isActive ? "var(--color-teal)" : "var(--text-muted)",
                    transition: "color 0.18s ease",
                    zIndex: 1,
                    filter: isActive ? "drop-shadow(0 0 6px rgba(0,201,167,0.5))" : "none",
                  }}
                />

                {/* Label */}
                <span
                  style={{
                    position: "relative",
                    fontSize: 9,
                    fontWeight: isActive ? 700 : 500,
                    fontFamily: "var(--font-sans)",
                    color: isActive ? "var(--color-teal)" : "var(--text-muted)",
                    transition: "color 0.18s ease",
                    zIndex: 1,
                    letterSpacing: isActive ? "0.3px" : 0,
                  }}
                >
                  {item.label}
                </span>

                {/* Active dot indicator */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: "absolute",
                      bottom: -6,
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "var(--color-teal)",
                      boxShadow: "0 0 6px rgba(0,201,167,0.8)",
                    }}
                  />
                )}
              </motion.div>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
