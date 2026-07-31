/**
 * TradeMind API Constants
 * Targeting backend stable v2 endpoints.
 */

export const API_BASE_URL = process.env.REACT_APP_API_URL || "https://kss-1227-trademind.hf.space";

export const ENDPOINTS = {
  // Stable V2 Endpoints
  V2_SIGNAL: (symbol) => `/v2/signal/${symbol}`,
  V2_PRICES: (symbol) => `/v2/prices/${symbol}`,
  V2_BACKTEST: (symbol) => `/v2/backtest/${symbol}`,
  V2_GOLD: "/v2/gold",
  V2_SCREENER: "/v2/screener",
  V2_WEALTH_PROJECT: "/v2/wealth/project",
  V2_WHATSAPP_WELCOME: "/v2/whatsapp/welcome",

  // Direct fallbacks for standard endpoints if needed
  SIGNAL: (symbol) => `/signal/${symbol}`,
  PRICES: (symbol) => `/prices/${symbol}`,
  BACKTEST: (symbol) => `/backtest/${symbol}`,
  GOLD: "/gold",
  SCREENER: "/screener",
  WEALTH_PROJECT: "/wealth/project",
  WHATSAPP_WELCOME: "/whatsapp/welcome",
};
