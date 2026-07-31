import React from "react";
import { motion } from "framer-motion";

export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="tab-bar" role="tablist">
      {tabs.map((tab) => {
        const key = typeof tab === "string" ? tab : tab.id;
        const label = typeof tab === "string" ? tab : tab.label;
        const isActive = activeTab === key;

        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            className={`tab ${isActive ? "active" : ""}`}
            onClick={() => onChange(key)}
            style={{ position: "relative" }}
          >
            {label}
            {isActive && (
              <motion.div
                layoutId="activeTabUnderline"
                style={{
                  position: "absolute",
                  bottom: -1,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: "var(--color-teal)",
                  borderRadius: 1,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
