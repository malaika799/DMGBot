"use client";

import { useEffect } from "react";
import { applyTheme, getStoredTheme, THEME_KEY, THEME_EVENT } from "@/lib/theme";

/**
 * Mounted once in the root layout. Keeps <html class="dark"> in sync with
 * the user's chosen theme on every page (not just Settings):
 * - Applies the stored theme on mount (belt-and-braces alongside ThemeScript).
 * - Re-applies live if the theme is "system" and the OS preference flips.
 * - Re-applies instantly when the theme is changed from the Settings page.
 * - Re-applies if the theme is changed in another browser tab.
 */
export default function ThemeManager() {
  useEffect(() => {
    applyTheme(getStoredTheme());

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onSystemChange);

    const onThemeEvent = (e) => applyTheme(e.detail || getStoredTheme());
    window.addEventListener(THEME_EVENT, onThemeEvent);

    const onStorage = (e) => {
      if (e.key === THEME_KEY) applyTheme(getStoredTheme());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mq.removeEventListener("change", onSystemChange);
      window.removeEventListener(THEME_EVENT, onThemeEvent);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
