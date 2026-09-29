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

/**
 * The 13 symbols the ML model was trained on (STOCKS in data/fetch_prices.py).
 * These are the only symbols the AI pipeline runs against — clicking one of
 * these tiles is what triggers the backend call.
 */
export const ML_STOCKS = [
  { symbol: "RELIANCE",   fullName: "Reliance Industries",         sector: "Energy",       letter: "R", color: "#0EA5E9" },
  { symbol: "TCS",        fullName: "Tata Consultancy Services",   sector: "IT & Tech",    letter: "T", color: "#6366F1" },
  { symbol: "INFY",       fullName: "Infosys",                     sector: "IT & Tech",    letter: "I", color: "#8B5CF6" },
  { symbol: "HDFCBANK",   fullName: "HDFC Bank",                   sector: "Banking",      letter: "H", color: "#10B981" },
  { symbol: "WIPRO",      fullName: "Wipro",                       sector: "IT & Tech",    letter: "W", color: "#3B82F6" },
  { symbol: "ICICIBANK",  fullName: "ICICI Bank",                  sector: "Banking",      letter: "I", color: "#14B8A6" },
  { symbol: "BAJFINANCE", fullName: "Bajaj Finance",               sector: "Finance",      letter: "B", color: "#F59E0B" },
  { symbol: "SBIN",       fullName: "State Bank of India",         sector: "Banking",      letter: "S", color: "#22C55E" },
  { symbol: "ITC",        fullName: "ITC Limited",                 sector: "FMCG",         letter: "I", color: "#84CC16" },
  { symbol: "ADANIENT",   fullName: "Adani Enterprises",           sector: "Conglomerate", letter: "A", color: "#F97316" },
  { symbol: "GOLDBEES",   fullName: "Nippon India Gold ETF",       sector: "Commodities",  letter: "G", color: "#EAB308" },
  { symbol: "SILVERBEES", fullName: "Nippon India Silver ETF",     sector: "Commodities",  letter: "S", color: "#94A3B8" },
  { symbol: "NIFTYBEES",  fullName: "Nifty 50 ETF",                sector: "Index ETF",    letter: "N", color: "#00C9A7" },
];

export const SIGNAL_COLORS = {
  BUY: { bg: "var(--color-teal)", text: "#000000" },
  HOLD: { bg: "var(--color-gold)", text: "#000000" },
  SELL: { bg: "var(--color-danger)", text: "#ffffff" },
};
