import apiClient from "./apiClient";
import { ENDPOINTS } from "../constants/api";

// Unwrap the v2 success envelope { success, data, ... } -> data
const unwrapV2 = (response) => response.data?.data ?? response.data;

export const fetchFullStockSignal = async (symbol) => {
  const response = await apiClient.get(ENDPOINTS.V2_SIGNAL_FULL(symbol), { timeout: 120000 });
  return unwrapV2(response);
};

export const fetchStockSignal = async (symbol) => {
  try {
    const response = await apiClient.get(ENDPOINTS.V2_SIGNAL(symbol));
    return unwrapV2(response);
  } catch (err) {
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
    return unwrapV2(response);
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
    return unwrapV2(response);
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
    return unwrapV2(response);
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
    return unwrapV2(response);
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
    return unwrapV2(response);
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
    return unwrapV2(response);
  } catch (err) {
    if (err.status === 404) {
      const fallback = await apiClient.post(ENDPOINTS.PORTFOLIO_ANALYZE, { holdings });
      return fallback.data;
    }
    throw err;
  }
};

export const analyzeScamMessage = async (payload) => {
  try {
    const response = await apiClient.post(ENDPOINTS.V2_SCAM_ANALYZE, payload);
    return unwrapV2(response);
  } catch (err) {
    if (err.status === 404) {
      const fallback = await apiClient.post(ENDPOINTS.SCAM_ANALYZE, payload);
      return fallback.data;
    }
    throw err;
  }
};
