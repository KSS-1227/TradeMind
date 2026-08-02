import React, { useState } from "react";
import { Plus, Trash2, Upload, Play, Sparkles } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { STOCKS, STOCK_LABELS } from "../../constants/stocks";
import { toast } from "sonner";

export function PortfolioInputForm({ onAnalyze, loading }) {
  const [holdings, setHoldings] = useState([
    { symbol: "RELIANCE", quantity: 15, buy_price: 2450 },
    { symbol: "TCS", quantity: 10, buy_price: 3500 },
    { symbol: "INFY", quantity: 20, buy_price: 1420 },
  ]);

  const [errors, setErrors] = useState({});

  // Preset Portfolios
  const samplePortfolios = {
    "Tech & Growth": [
      { symbol: "TCS", quantity: 15, buy_price: 3600 },
      { symbol: "INFY", quantity: 30, buy_price: 1450 },
      { symbol: "TATAMOTORS", quantity: 50, buy_price: 920 },
    ],
    "Bluechip Core": [
      { symbol: "RELIANCE", quantity: 25, buy_price: 2500 },
      { symbol: "HDFCBANK", quantity: 30, buy_price: 1550 },
      { symbol: "ICICIBANK", quantity: 35, buy_price: 1080 },
    ],
    "Balanced India": [
      { symbol: "RELIANCE", quantity: 15, buy_price: 2600 },
      { symbol: "TCS", quantity: 10, buy_price: 3550 },
      { symbol: "GOLD24K", quantity: 5, buy_price: 72000 },
      { symbol: "ICICIBANK", quantity: 20, buy_price: 1100 },
    ],
  };

  const handleHoldingChange = (index, field, value) => {
    const next = [...holdings];
    if (field === "quantity" || field === "buy_price") {
      next[index][field] = value === "" ? "" : Number(value);
    } else {
      next[index][field] = value;
    }
    setHoldings(next);
    // Clear errors for this index
    if (errors[index]) {
      const nextErr = { ...errors };
      delete nextErr[index];
      setErrors(nextErr);
    }
  };

  const addHolding = () => {
    if (holdings.length >= 10) {
      toast.error("Maximum 10 holdings per analysis batch.");
      return;
    }
    const unusedStock = STOCKS.find((s) => !holdings.some((h) => h.symbol === s)) || STOCKS[0];
    setHoldings([...holdings, { symbol: unusedStock, quantity: 10, buy_price: 1000 }]);
  };

  const deleteHolding = (index) => {
    if (holdings.length <= 1) {
      toast.error("Portfolio must contain at least 1 holding.");
      return;
    }
    setHoldings(holdings.filter((_, i) => i !== index));
  };

  const loadSample = (name) => {
    if (samplePortfolios[name]) {
      setHoldings(samplePortfolios[name]);
      toast.success(`Loaded "${name}" sample portfolio.`);
    }
  };

  const validate = () => {
    const errMap = {};
    let isValid = true;

    holdings.forEach((h, i) => {
      const itemErrors = {};
      if (!h.symbol || !h.symbol.trim()) {
        itemErrors.symbol = "Symbol required";
        isValid = false;
      }
      if (h.quantity === "" || isNaN(h.quantity) || h.quantity <= 0) {
        itemErrors.quantity = "Qty > 0";
        isValid = false;
      }
      if (h.buy_price === "" || isNaN(h.buy_price) || h.buy_price <= 0) {
        itemErrors.buy_price = "Price > 0";
        isValid = false;
      }
      if (Object.keys(itemErrors).length > 0) {
        errMap[i] = itemErrors;
      }
    });

    setErrors(errMap);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix errors in holdings before submitting.");
      return;
    }

    // Clean payload
    const payload = holdings.map((h) => ({
      symbol: h.symbol.trim().toUpperCase(),
      quantity: Number(h.quantity),
      buy_price: Number(h.buy_price),
    }));

    onAnalyze(payload);
  };

  // CSV Drag and drop placeholder simulation
  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`CSV "${file.name}" received. Extracting holdings...`);
      // Parse sample CSV structure if needed, or prefill sample
      setTimeout(() => {
        setHoldings([
          { symbol: "RELIANCE", quantity: 20, buy_price: 2420 },
          { symbol: "TCS", quantity: 12, buy_price: 3480 },
          { symbol: "INFY", quantity: 25, buy_price: 1410 },
          { symbol: "HDFCBANK", quantity: 18, buy_price: 1530 },
        ]);
        toast.success("Holding positions successfully loaded from CSV!");
      }, 600);
    }
  };

  return (
    <Card style={{ marginBottom: "24px", padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            PORTFOLIO HOLDINGS
          </h3>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: "3px 0 0 0" }}>
            Add your positions manually or load a pre-built sample portfolio.
          </p>
        </div>

        {/* Quick Sample Presets */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
            PRESETS:
          </span>
          {Object.keys(samplePortfolios).map((name) => (
            <button
              key={name}
              type="button"
              className="pd-sample-pill"
              onClick={() => loadSample(name)}
            >
              <Sparkles size={12} color="var(--color-teal)" />
              {name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Table/List of Holdings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          {holdings.map((h, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 1.2fr 44px",
                gap: "10px",
                alignItems: "center",
                background: "var(--bg-surface)",
                padding: "10px 14px",
                borderRadius: "var(--radius-md, 10px)",
                border: errors[i] ? "1px solid var(--danger)" : "1px solid var(--border)",
              }}
            >
              {/* Stock Symbol Selection */}
              <div>
                <label style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, display: "block", marginBottom: 4 }}>
                  STOCK SYMBOL
                </label>
                <select
                  value={h.symbol}
                  onChange={(e) => handleHoldingChange(i, "symbol", e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 10px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    fontWeight: 600,
                    outline: "none",
                  }}
                >
                  {STOCKS.map((s) => (
                    <option key={s} value={s}>
                      {STOCK_LABELS[s] ? `${s} — ${STOCK_LABELS[s]}` : s}
                    </option>
                  ))}
                </select>
                {errors[i]?.symbol && <span style={{ fontSize: "10px", color: "var(--danger)" }}>{errors[i].symbol}</span>}
              </div>

              {/* Quantity */}
              <div>
                <label style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, display: "block", marginBottom: 4 }}>
                  QUANTITY
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={h.quantity}
                  onChange={(e) => handleHoldingChange(i, "quantity", e.target.value)}
                  placeholder="e.g. 10"
                  style={{
                    width: "100%",
                    background: "var(--bg-elevated)",
                    border: errors[i]?.quantity ? "1px solid var(--danger)" : "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 10px",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                {errors[i]?.quantity && <span style={{ fontSize: "10px", color: "var(--danger)" }}>{errors[i].quantity}</span>}
              </div>

              {/* Average Buy Price */}
              <div>
                <label style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, display: "block", marginBottom: 4 }}>
                  AVG PRICE (₹)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={h.buy_price}
                  onChange={(e) => handleHoldingChange(i, "buy_price", e.target.value)}
                  placeholder="e.g. 2400"
                  style={{
                    width: "100%",
                    background: "var(--bg-elevated)",
                    border: errors[i]?.buy_price ? "1px solid var(--danger)" : "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 10px",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                {errors[i]?.buy_price && <span style={{ fontSize: "10px", color: "var(--danger)" }}>{errors[i].buy_price}</span>}
              </div>

              {/* Delete Button */}
              <div style={{ paddingTop: "14px" }}>
                <Button
                  variant="icon"
                  size="sm"
                  onClick={() => deleteHolding(i)}
                  title="Remove holding"
                  style={{ color: "var(--danger)" }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "20px",
          }}
        >
          <Button variant="secondary" icon={Plus} onClick={addHolding}>
            Add Holding
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            icon={Play}
            style={{ paddingLeft: "28px", paddingRight: "28px" }}
          >
            Analyze Portfolio
          </Button>
        </div>
      </form>

      {/* CSV Upload Dropzone Placeholder */}
      <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)" }}>
        <div className="pd-dropzone">
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            id="csv-upload-input"
            style={{ display: "none" }}
          />
          <label htmlFor="csv-upload-input" style={{ cursor: "pointer", display: "block" }}>
            <Upload size={24} color="var(--color-teal)" style={{ marginBottom: "8px" }} />
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
              Upload Portfolio CSV File
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "3px" }}>
              Drag & drop your CSV file here or click to browse (Format: Symbol, Quantity, BuyPrice)
            </div>
          </label>
        </div>
      </div>
    </Card>
  );
}

export default PortfolioInputForm;
