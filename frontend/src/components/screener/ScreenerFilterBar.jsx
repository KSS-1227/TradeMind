import React, { useState } from "react";
import { Search, Filter, History, Sparkles, X } from "lucide-react";
import { Input } from "../ui/Input";
import { STOCK_LABELS } from "../../constants/stocks";

export function ScreenerFilterBar({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  onResetFilters,
  searchHistory = [],
  onSelectHistory,
}) {
  const [showHistory, setShowHistory] = useState(false);

  const popularStocks = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "TATAMOTORS", "GOLD24K"];

  return (
    <div style={{ marginBottom: "24px" }}>
      {/* Search Input with Autocomplete & History Dropdown */}
      <div style={{ position: "relative", marginBottom: "14px" }}>
        <Input
          icon={Search}
          placeholder="Search stock symbol, NLP criteria (e.g. 'RSI below 30 and price above 50 day EMA')..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setShowHistory(true)}
          onBlur={() => setTimeout(() => setShowHistory(false), 200)}
        />

        {/* History Dropdown */}
        {showHistory && searchHistory.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "8px 12px",
              zIndex: 20,
              boxShadow: "var(--shadow-lg)",
              marginTop: "4px",
            }}
          >
            <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, marginBottom: "6px", display: "flex", alignItems: "center", gap: 4 }}>
              <History size={12} /> RECENT SEARCH HISTORY
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {searchHistory.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={() => onSelectHistory(item)}
                  style={{
                    padding: "4px 8px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-secondary)",
                    fontSize: "11.5px",
                    cursor: "pointer",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Popular Quick Stock Chips */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
          POPULAR:
        </span>
        {popularStocks.map((s) => (
          <button
            key={s}
            type="button"
            className={`sc-filter-chip ${searchQuery.toUpperCase() === s ? "active" : ""}`}
            onClick={() => onSearchChange(s)}
          >
            <Sparkles size={12} color="var(--color-teal)" />
            {STOCK_LABELS[s] || s}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="sc-filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", marginRight: "8px" }}>
          <Filter size={14} color="var(--color-teal)" />
          <span>FILTERS:</span>
        </div>

        {/* Sector Filter */}
        <select
          value={filters.sector}
          onChange={(e) => onFilterChange("sector", e.target.value)}
          style={selectStyle}
        >
          <option value="ALL">Sector: All</option>
          <option value="Energy">Energy</option>
          <option value="IT & Tech">IT & Tech</option>
          <option value="Banking & Fin">Banking & Fin</option>
          <option value="Automotive">Automotive</option>
          <option value="Commodities">Commodities</option>
        </select>

        {/* Market Cap */}
        <select
          value={filters.marketCap}
          onChange={(e) => onFilterChange("marketCap", e.target.value)}
          style={selectStyle}
        >
          <option value="ALL">Cap: All</option>
          <option value="Large Cap">Large Cap</option>
          <option value="Mid Cap">Mid Cap</option>
          <option value="Small Cap">Small Cap</option>
        </select>

        {/* Risk */}
        <select
          value={filters.risk}
          onChange={(e) => onFilterChange("risk", e.target.value)}
          style={selectStyle}
        >
          <option value="ALL">Risk: All</option>
          <option value="LOW">Low Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="HIGH">High Risk</option>
        </select>

        {/* AI Rating / Signal */}
        <select
          value={filters.rating}
          onChange={(e) => onFilterChange("rating", e.target.value)}
          style={selectStyle}
        >
          <option value="ALL">Rating: All</option>
          <option value="BUY">BUY</option>
          <option value="ACCUMULATE">ACCUMULATE</option>
          <option value="HOLD">HOLD</option>
          <option value="SELL">SELL</option>
        </select>

        {/* Min Confidence */}
        <select
          value={filters.minConfidence}
          onChange={(e) => onFilterChange("minConfidence", e.target.value)}
          style={selectStyle}
        >
          <option value="0">Confidence: Any</option>
          <option value="75">Min 75% Confidence</option>
          <option value="85">Min 85% Confidence</option>
          <option value="90">Min 90% Confidence</option>
        </select>

        {/* Reset Button */}
        <button
          type="button"
          onClick={onResetFilters}
          style={{
            padding: "6px 12px",
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            marginLeft: "auto",
          }}
        >
          <X size={14} /> Clear Filters
        </button>
      </div>
    </div>
  );
}

const selectStyle = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md, 10px)",
  padding: "6px 10px",
  color: "var(--text-primary)",
  fontSize: "12px",
  fontWeight: 600,
  outline: "none",
  cursor: "pointer",
};

export default ScreenerFilterBar;
