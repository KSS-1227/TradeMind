const STORAGE_KEY = "trademind_demo_mode";

export function isDemoModeEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setDemoModeEnabled(enabled) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}

export function toggleDemoMode(enabled) {
  setDemoModeEnabled(enabled);
  return enabled;
}
