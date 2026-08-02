import React from "react";
import { Card } from "../ui/Card";

export function DashboardSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", opacity: 0.75 }}>
      {/* Hero Header Skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div className="db-skeleton-box" style={{ width: "240px", height: "36px", marginBottom: "8px" }} />
          <div className="db-skeleton-box" style={{ width: "360px", height: "18px" }} />
        </div>
        <div className="db-skeleton-box" style={{ width: "180px", height: "32px", borderRadius: "20px" }} />
      </div>

      {/* KPI Cards Skeleton Grid */}
      <div className="db-metrics-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} style={{ padding: "16px", height: "90px" }}>
            <div className="db-skeleton-box" style={{ width: "60%", height: "12px", marginBottom: "12px" }} />
            <div className="db-skeleton-box" style={{ width: "80%", height: "24px" }} />
          </Card>
        ))}
      </div>

      {/* Market Overview Skeleton */}
      <div className="db-market-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} style={{ padding: "16px", height: "120px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <div className="db-skeleton-box" style={{ width: "40%", height: "14px" }} />
              <div className="db-skeleton-box" style={{ width: "25%", height: "14px" }} />
            </div>
            <div className="db-skeleton-box" style={{ width: "100%", height: "50px" }} />
          </Card>
        ))}
      </div>

      {/* Main Content Split Skeletons */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
        <Card style={{ height: "260px" }}>
          <div className="db-skeleton-box" style={{ width: "30%", height: "16px", marginBottom: "16px" }} />
          <div className="db-skeleton-box" style={{ width: "100%", height: "180px" }} />
        </Card>

        <Card style={{ height: "260px" }}>
          <div className="db-skeleton-box" style={{ width: "50%", height: "16px", marginBottom: "16px" }} />
          <div className="db-skeleton-box" style={{ width: "100%", height: "180px" }} />
        </Card>
      </div>
    </div>
  );
}

export default DashboardSkeleton;
