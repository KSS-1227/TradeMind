import apiClient from "./apiClient";
import { ENDPOINTS } from "../constants/api";

export const fetchStockSignal = async (symbol) => {
  try {
    const response = await apiClient.get(ENDPOINTS.V2_SIGNAL(symbol));
    return response.data;
  } catch (err) {
    // Fallback to legacy endpoint if v2 returns 404
    if (err.status === 404) {
      const fallback = await apiClient.get(ENDPOINTS.SIGNAL(symbol));
      return fallback.data;
    }
    throw err;
  }
};

export const fetchStockPrices = async (symbol) => {
  try {
    const response = await apiClient.get(ENDPOINTS.V2_PRICES(symbol));
    return response.data;
  } catch (err) {
    if (err.status === 404) {
      const fallback = await apiClient.get(ENDPOINTS.PRICES(symbol));
      return fallback.data;
    }
    throw err;
  }
};

export const fetchGoldPrice = async () => {
  try {
    const response = await apiClient.get(ENDPOINTS.V2_GOLD);
    return response.data;
  } catch (err) {
    if (err.status === 404) {
      const fallback = await apiClient.get(ENDPOINTS.GOLD);
      return fallback.data;
    }
    throw err;
  }
};

export const fetchBacktest = async (symbol) => {
  try {
    const response = await apiClient.get(ENDPOINTS.V2_BACKTEST(symbol));
    return response.data;
  } catch (err) {
    if (err.status === 404) {
      const fallback = await apiClient.get(ENDPOINTS.BACKTEST(symbol));
      return fallback.data;
    }
    throw err;
  }
};

export const runScreener = async (query) => {
  try {
    const response = await apiClient.post(ENDPOINTS.V2_SCREENER, { query });
    return response.data;
  } catch (err) {
    if (err.status === 404) {
      const fallback = await apiClient.post(ENDPOINTS.SCREENER, { query });
      return fallback.data;
    }
    throw err;
  }
};

export const calculateWealthProjection = async (payload) => {
  try {
    const response = await apiClient.post(ENDPOINTS.V2_WEALTH_PROJECT, payload);
    return response.data;
  } catch (err) {
    if (err.status === 404) {
      const fallback = await apiClient.post(ENDPOINTS.WEALTH_PROJECT, payload);
      return fallback.data;
    }
    throw err;
  }
};

export const analyzePortfolio = async (holdings) => {
  try {
    const response = await apiClient.post(ENDPOINTS.V2_PORTFOLIO_ANALYZE, { holdings });
    return response.data;
  } catch (err) {
    if (err.status === 404) {
      const fallback = await apiClient.post(ENDPOINTS.PORTFOLIO_ANALYZE, { holdings });
      return fallback.data;
    }
    throw err;
  }
};

export const analyzeScamMessage = async (payload) => {
  // payload: { message, stock_symbol?, source? }
  try {
    const response = await apiClient.post(ENDPOINTS.V2_SCAM_ANALYZE, payload);
    return response.data;
  } catch (err) {
    if (err.status === 404) {
      const fallback = await apiClient.post(ENDPOINTS.SCAM_ANALYZE, payload);
      return fallback.data;
    }
    throw err;
  }
};


