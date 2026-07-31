import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Coins } from "lucide-react";
import { PageTransition } from "../../components/animations/PageTransition";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { PriceAreaChart } from "../../components/charts/PriceAreaChart";
import { fetchGoldPrice, fetchStockSignal } from "../../services/marketService";
import { fmt, parseConf } from "../../utils/formatters";

export function ScamDetectorPage() {
  const { isMobile } = useOutletContext();
  const [gold, setGold] = useState(null);
  const [sigG, setSigG] = useState(null);
  const [sigS, setSigS] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchGoldPrice().catch(() => null),
      fetchStockSignal("GOLD24K").catch(() => null),
      fetchStockSignal("SILVER").catch(() => null),
    ]).then(([gData, gSig, sSig]) => {
      if (isMounted) {
        setGold(gData);
        setSigG(gSig);
        setSigS(sSig);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <PageTransition>
      <div style={{ marginBottom: "20px" }}>
        <h1 className="page-title">Commodities & Fraud Risk Detector</h1>
        <p className="page-sub">Live Gold 24K and Silver price intelligence with automated risk analysis.</p>
      </div>

      {loading && (
        <Card style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
          Loading commodity pricing and signal models...
        </Card>
      )}

      {/* Gold 24K Card */}
      {gold && (
        <Card style={{ marginBottom: "16px", borderColor: "var(--color-gold)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--color-gold)",
                  fontWeight: 700,
                  letterSpacing: 1,
                  marginBottom: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Coins size={14} /> GOLD 24K · MCX INDIA
              </div>
              <div className="mono" style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, color: "var(--color-gold)" }}>
                ₹{fmt(gold.current_price_10g)}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                Per 10g · Incl. 15% import duty + 3% GST
              </div>
            </div>
            {sigG && (
              <div style={{ textAlign: "right" }}>
                <Badge signal={sigG.signal} />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  {parseConf(sigG.confidence)}% confidence
                </div>
              </div>
            )}
          </div>

          {gold.history?.length > 0 && (
            <PriceAreaChart prices={gold.history} isMobile={isMobile} height={200} color="var(--color-gold)" />
          )}
        </Card>
      )}

      {/* Gold Signal Reasoning */}
      {sigG?.reasons && (
        <Card style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-gold)", marginBottom: 10 }}>
            🤖 GOLD SIGNAL REASONING
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {sigG.reasons.map((r, i) => (
              <div key={i} className="reason-item" style={{ borderLeftColor: "var(--color-gold)" }}>
                {r}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Silver Card */}
      {sigS && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>
                🥈 SILVER · MCX INDIA
              </div>
              <div className="mono" style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: "var(--text-primary)" }}>
                {sigS.price}
              </div>
            </div>
            <Badge signal={sigS.signal} />
          </div>
        </Card>
      )}
    </PageTransition>
  );
}

export default ScamDetectorPage;
