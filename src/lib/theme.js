// src/lib/theme.js
//
// Single source of truth for the app's light/dark/system theme so every
// page behaves the same way instead of only the Settings page applying it.

export const THEME_KEY = "dmg-theme";
export const THEME_EVENT = "dmg-theme-changed";

export function getStoredTheme() {
  if (typeof window === "undefined") return "system";
  return localStorage.getItem(THEME_KEY) || "system";
}

export function resolveIsDark(theme) {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  // "system"
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

// Applies the given theme to <html class="dark"> immediately.
export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveIsDark(theme));
}

// Persists the theme choice and applies it app-wide, notifying any other
// mounted instances (e.g. other tabs, or components that want to react).
export function setTheme(theme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}
