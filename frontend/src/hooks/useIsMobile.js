import { useState, useEffect } from "react";

export function useIsMobile(threshold = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < threshold;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      setIsMobile(window.innerWidth < threshold);
    };

    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [threshold]);

  return isMobile;
}
