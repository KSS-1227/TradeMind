/**
 * Stock symbols & label constants
 */

export const STOCKS = [
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "WIPRO",
  "ICICIBANK", "BAJFINANCE", "SBIN", "ITC", "ADANIENT",
  "NIFTYBEES", "GOLDBEES", "SILVERBEES", "GOLD24K", "SILVER",
];

export const STOCK_LABELS = {
  NIFTYBEES: "NIFTY ETF",
  GOLDBEES: "Gold ETF",
  SILVERBEES: "Silver ETF",
  GOLD24K: "Gold 24K",
  SILVER: "Silver",
};

export const SIGNAL_COLORS = {
  BUY: { bg: "var(--color-teal)", text: "#000000" },
  HOLD: { bg: "var(--color-gold)", text: "#000000" },
  SELL: { bg: "var(--color-danger)", text: "#ffffff" },
};
