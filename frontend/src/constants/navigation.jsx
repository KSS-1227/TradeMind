import {
  LayoutDashboard,
  Search,
  Briefcase,
  TrendingUp,
  Coins,
  ShieldAlert,
  Calculator,
  Settings,
} from "lucide-react";

export const NAV_ITEMS = [
  {
    id: "dashboard",
    path: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "analyse",
    path: "/screener",
    label: "Screener",
    icon: Search,
  },
  {
    id: "portfolio",
    path: "/portfolio-doctor",
    label: "Portfolio Doctor",
    icon: Briefcase,
  },
  {
    id: "strategy",
    path: "/strategy-builder",
    label: "Strategy Builder",
    icon: TrendingUp,
  },
  {
    id: "scam-detector",
    path: "/scam-detector",
    label: "Scam Detector",
    icon: ShieldAlert,
  },
  {
    id: "commodities",
    path: "/commodities",
    label: "Commodities",
    icon: Coins,
  },
  {
    id: "wealth",
    path: "/wealth-projection",
    label: "Wealth Projection",
    icon: Calculator,
  },
  {
    id: "settings",
    path: "/settings",
    label: "Settings",
    icon: Settings,
  },
];
