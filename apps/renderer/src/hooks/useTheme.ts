/**
 * useTheme.ts — Theme Hook
 *
 * Purpose: Apply the current theme as a CSS class on document.documentElement
 * for instant theme switching via CSS variables.
 *
 * Uses the SettingsManager to read/write the current theme preference,
 * and applies either "dark", "theme-light", or "theme-system" class.
 */

import { useEffect } from "react";
import { settingsManager } from "../editor/core/Settings";

export function useTheme() {
  useEffect(() => {
    const applyTheme = (theme: string) => {
      const root = document.documentElement;
      // Remove all theme classes (dark is default — no class needed)
      root.classList.remove("theme-light", "theme-system");

      // Apply the matching class
      if (theme === "light") {
        root.classList.add("theme-light");
      } else if (theme === "system") {
        root.classList.add("theme-system");
      }
      // Default (dark) requires no additional class
    };

    // Apply initial theme
    applyTheme(settingsManager.get("theme"));

    // Subscribe to theme changes
    const unsub = settingsManager.onChange((settings) => {
      applyTheme(settings.theme);
    });

    return () => unsub();
  }, []);
}
