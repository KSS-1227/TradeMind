import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/navigation";

export function Sidebar() {
  const [hovered, setHovered] = useState(null);

  return (
    <aside className="app-sidebar">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} style={{ position: "relative", width: "100%" }}>
            <NavLink
              to={item.path}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""}`
              }
              style={({ isActive }) => ({
                width: "100%",
                height: "46px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isActive ? "var(--color-teal-bg)" : "transparent",
                borderLeft: `3px solid ${isActive ? "var(--color-teal)" : "transparent"}`,
                color: isActive ? "var(--color-teal)" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                textDecoration: "none",
              })}
              title={item.label}
            >
              <Icon size={19} />
            </NavLink>

            {hovered === item.id && (
              <div
                style={{
                  position: "absolute",
                  left: "68px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 200,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                {item.label}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
