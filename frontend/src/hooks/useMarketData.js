import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { fetchCommodityPrices, fetchStockSignal } from "../services/marketService";

export function useCommodityPrices() {
  const [commodities, setCommodities] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const refresh = () => fetchCommodityPrices()
      .then((data) => {
        if (isMounted) setCommodities(data);
      })
      .catch((err) => {
        console.warn("Commodity prices fetch error:", err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    refresh();
    const timer = setInterval(refresh, 5 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  return { commodities, loading };
}

export function useStockSignal(symbol) {
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSignal = useCallback(async (sym) => {
    const targetSymbol = sym || symbol;
    if (!targetSymbol) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchStockSignal(targetSymbol);
      setSignal(data);
    } catch (err) {
      const msg = err.message || "Failed to analyze stock signal";
      setError(msg);
      toast.error(`Signal error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (symbol) {
      loadSignal(symbol);
    }
  }, [symbol, loadSignal]);

  return { signal, loading, error, reload: loadSignal };
}
