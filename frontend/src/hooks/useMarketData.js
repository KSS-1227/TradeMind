import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { fetchGoldPrice, fetchStockSignal } from "../services/marketService";

export function useGoldPrice() {
  const [gold, setGold] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchGoldPrice()
      .then((data) => {
        if (isMounted) setGold(data);
      })
      .catch((err) => {
        console.warn("Gold price fetch error:", err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { gold, loading };
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
