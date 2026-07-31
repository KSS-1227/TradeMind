import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

// Pages
import DashboardPage from "./pages/Dashboard/DashboardPage";
import ScreenerPage from "./pages/Screener/ScreenerPage";
import PortfolioDoctorPage from "./pages/PortfolioDoctor/PortfolioDoctorPage";
import ScamDetectorPage from "./pages/ScamDetector/ScamDetectorPage";
import WealthProjectionPage from "./pages/WealthProjection/WealthProjectionPage";
import StrategyBuilderPage from "./pages/StrategyBuilder/StrategyBuilderPage";
import SettingsPage from "./pages/Settings/SettingsPage";
import AuthPage from "./pages/Auth/AuthPage";

import "./styles/theme.css";
import "./styles/layout.css";

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
          color: "var(--text-muted)",
          fontSize: "14px",
        }}
      >
        Initializing TradeMind...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <AppLayout />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-right" theme="dark" richColors />
        <BrowserRouter>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/screener" element={<ScreenerPage />} />
              <Route path="/portfolio-doctor" element={<PortfolioDoctorPage />} />
              <Route path="/scam-detector" element={<ScamDetectorPage />} />
              <Route path="/commodities" element={<ScamDetectorPage />} />
              <Route path="/wealth-projection" element={<WealthProjectionPage />} />
              <Route path="/strategy-builder" element={<StrategyBuilderPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
