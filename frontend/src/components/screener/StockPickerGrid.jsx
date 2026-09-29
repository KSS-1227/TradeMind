/**
 * StockPickerGrid.jsx
 *
 * Renders the 13 ML-model stocks as clickable selection tiles.
 * Nothing is fetched until the user explicitly clicks a tile.
 *
 * Props
 * -----
 * onSelect(symbol: string) — called with the bare symbol (e.g. "RELIANCE")
 *                            when a tile is clicked.
 * selectedSymbol           — currently active symbol, or null.
 * disabled                 — greys out all tiles while a pipeline is running.
 */

import React from "react";
import { motion } from "framer-motion";
import { Cpu, ChevronRight } from "lucide-react";
import { ML_STOCKS } from "../../constants/stocks";

export function StockPickerGrid({ onSelect, selectedSymbol, disabled }) {
  return (
    <div>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <Cpu size={15} color="var(--color-teal)" />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.9px",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          Select a stock to analyse — AI pipeline runs only on click
        </span>
      </div>

      {/* Tile grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
          gap: 10,
        }}
      >
        {ML_STOCKS.map((stock, i) => {
          const isActive = selectedSymbol === stock.symbol;

          return (
            <motion.button
              key={stock.symbol}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect(stock.symbol)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              whileHover={disabled ? {} : { y: -2, scale: 1.015 }}
              whileTap={disabled ? {} : { scale: 0.97 }}
              style={{
                /* layout */
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 8,
                padding: "12px 13px",
                /* appearance */
                borderRadius: "var(--radius-lg, 14px)",
                background: isActive
                  ? `linear-gradient(135deg, rgba(0,201,167,0.15) 0%, rgba(0,201,167,0.05) 100%)`
                  : "var(--bg-surface)",
                border: isActive
                  ? "1.5px solid var(--color-teal)"
                  : "1px solid var(--border)",
                boxShadow: isActive
                  ? "0 0 0 1px var(--color-teal-border), var(--shadow-card)"
                  : "var(--shadow-card)",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
                transition: "border 0.18s, background 0.18s, box-shadow 0.18s",
                textAlign: "left",
                width: "100%",
              }}
            >
              {/* Avatar + sector */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                {/* Coloured letter avatar */}
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: `${stock.color}22`,
                    border: `1.5px solid ${stock.color}55`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    fontWeight: 800,
                    color: stock.color,
                    fontFamily: "var(--font-mono)",
                    flexShrink: 0,
                  }}
                >
                  {stock.letter}
                </div>

                {/* Active indicator */}
                {isActive && (
                  <ChevronRight
                    size={14}
                    color="var(--color-teal)"
                    style={{ flexShrink: 0 }}
                  />
                )}
              </div>

              {/* Symbol + full name */}
              <div style={{ lineHeight: 1.25 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: isActive ? "var(--color-teal)" : "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.3px",
                  }}
                >
                  {stock.symbol}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--text-muted)",
                    fontWeight: 500,
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 140,
                  }}
                >
                  {stock.fullName}
                </div>
              </div>

              {/* Sector badge */}
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: "var(--radius-pill)",
                  background: `${stock.color}18`,
                  border: `1px solid ${stock.color}33`,
                  color: stock.color,
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                }}
              >
                {stock.sector}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div
        style={{
          marginTop: 14,
          fontSize: 11,
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--color-teal)",
            flexShrink: 0,
          }}
        />
        RF · LSTM · FinBERT models run only after you select a stock above.
        Firecrawl news is fetched for that one stock only.
      </div>
    </div>
  );
}

export default StockPickerGrid;
