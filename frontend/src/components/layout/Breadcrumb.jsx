import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { NAV_ITEMS } from "../../constants/navigation";

/**
 * Breadcrumb
 *
 * Derives crumbs from the current pathname + NAV_ITEMS.
 * Always starts with Home. Renders as a semantic <nav> with aria-label.
 *
 * Usage:
 *   <Breadcrumb />                         — auto from useLocation
 *   <Breadcrumb overrideLabel="Custom" />  — replace last segment label
 */
export function Breadcrumb({ overrideLabel } = {}) {
  const { pathname } = useLocation();

  const match = NAV_ITEMS.find(
    (n) => n.path !== "/" && pathname.startsWith(n.path)
  );

  return (
    <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <Link
        to="/"
        aria-label="Home"
        style={{
          color: "var(--text-muted)",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Home size={12} />
      </Link>

      {(match || overrideLabel) && (
        <>
          <ChevronRight size={10} color="var(--text-muted)" />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-secondary)",
              userSelect: "none",
            }}
          >
            {overrideLabel ?? match?.label}
          </span>
        </>
      )}
    </nav>
  );
}
