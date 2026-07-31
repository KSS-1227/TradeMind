import React from "react";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/navigation";

export function BottomNav() {
  return (
    <nav className="app-bottom-nav">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.id}
            to={item.path}
            style={({ isActive }) => ({
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              color: isActive ? "var(--color-teal)" : "var(--text-muted)",
              minWidth: "48px",
              padding: "2px 4px",
              textDecoration: "none",
            })}
          >
            <Icon size={18} />
            <span
              style={{
                fontSize: "9px",
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
              }}
            >
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
