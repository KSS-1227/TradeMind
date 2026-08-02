import {
  LayoutDashboard,
  Search,
  Briefcase,
  TrendingUp,
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
    ai: false,
  },
  {
    id: "screener",
    path: "/screener",
    label: "AI Screener",
    icon: Search,
    ai: true,
  },
  {
    id: "portfolio",
    path: "/portfolio-doctor",
    label: "Portfolio Doctor",
    icon: Briefcase,
    ai: true,
  },
  {
    id: "strategy",
    path: "/strategy-builder",
    label: "Strategy Builder",
    icon: TrendingUp,
    ai: true,
  },
  {
    id: "scam-detector",
    path: "/scam-detector",
    label: "Scam Detector",
    icon: ShieldAlert,
    ai: true,
  },
  {
    id: "wealth",
    path: "/wealth-projection",
    label: "Wealth Projection",
    icon: Calculator,
    ai: true,
  },
  {
    id: "settings",
    path: "/settings",
    label: "Settings",
    icon: Settings,
    ai: false,
  },
];
