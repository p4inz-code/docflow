/**
 * AccessibilityManager.ts — Accessibility Manager
 *
 * Purpose: Manage accessibility features across the application.
 * Provides keyboard-only editing support, focus navigation,
 * ARIA label management, high contrast mode, reduced motion mode,
 * and large UI mode.
 *
 * Integrates with the Settings system for persistent preferences.
 */

import { settingsManager } from "./Settings";
import type { AppSettings } from "./Settings";

// ── Accessibility State ────────────────────────────────────────────
export interface AccessibilityState {
  /** High contrast mode for visually impaired users. */
  highContrast: boolean;
  /** Reduced motion mode for users with vestibular disorders. */
  reducedMotion: boolean;
  /** Large UI mode for users who need larger controls. */
  largeUI: boolean;
  /** Font size multiplier (1.0 = normal, 1.25 = large, 1.5 = extra large). */
  fontSizeMultiplier: number;
  /** Whether focus outlines are always visible. */
  alwaysShowFocus: boolean;
}

// ── Accessibility Manager ──────────────────────────────────────────
export class AccessibilityManager {
  private _state: AccessibilityState = {
    highContrast: false,
    reducedMotion: false,
    largeUI: false,
    fontSizeMultiplier: 1.0,
    alwaysShowFocus: true,
  };

  private _styleElement: HTMLStyleElement | null = null;

  constructor() {
    this._loadSettings();
    this._applyAccessibilityStyles();
  }

  /** Get current accessibility state. */
  get state(): AccessibilityState {
    return { ...this._state };
  }

  /** Toggle high contrast mode. */
  toggleHighContrast(): void {
    this._state.highContrast = !this._state.highContrast;
    this._applyAccessibilityStyles();
    this._saveSettings();
  }

  /** Toggle reduced motion mode. */
  toggleReducedMotion(): void {
    this._state.reducedMotion = !this._state.reducedMotion;
    this._applyAccessibilityStyles();
    this._saveSettings();
  }

  /** Toggle large UI mode. */
  toggleLargeUI(): void {
    this._state.largeUI = !this._state.largeUI;
    this._state.fontSizeMultiplier = this._state.largeUI ? 1.25 : 1.0;
    this._applyAccessibilityStyles();
    this._saveSettings();
  }

  /** Set the font size multiplier directly. */
  setFontSizeMultiplier(multiplier: number): void {
    this._state.fontSizeMultiplier = Math.max(0.8, Math.min(2.0, multiplier));
    this._state.largeUI = this._state.fontSizeMultiplier >= 1.25;
    this._applyAccessibilityStyles();
    this._saveSettings();
  }

  /** Add ARIA labels to an element. */
  setAriaLabel(element: HTMLElement, label: string): void {
    element.setAttribute("aria-label", label);
  }

  /** Add ARIA role to an element. */
  setAriaRole(element: HTMLElement, role: string): void {
    element.setAttribute("role", role);
  }

  /** Make a dialog accessible with proper ARIA attributes. */
  makeDialogAccessible(
    dialog: HTMLElement,
    title: string,
    description?: string,
  ): void {
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", title);
    if (description) {
      dialog.setAttribute("aria-description", description);
    }
  }

  /** Trap focus within a container (for dialogs and modals). */
  trapFocus(container: HTMLElement): () => void {
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const previouslyFocused = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = container.querySelectorAll<HTMLElement>(
        focusableSelector,
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Focus first element
    const firstFocusable = container.querySelector<HTMLElement>(
      focusableSelector,
    );
    firstFocusable?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }

  /** Check if a user prefers reduced motion (OS-level). */
  static prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /** Check if a user prefers high contrast (OS-level). */
  static prefersHighContrast(): boolean {
    return window.matchMedia("(prefers-contrast: high)").matches;
  }

  /** Apply reduced motion styles to an element. */
  static applyReducedMotion(element: HTMLElement): void {
    element.style.transition = "none";
    element.style.animation = "none";
  }

  // ── Private ──────────────────────────────────────────────────────
  private _applyAccessibilityStyles(): void {
    // Remove existing style element
    this._styleElement?.remove();

    const styles: string[] = [];

    // High contrast
    if (this._state.highContrast) {
      styles.push(`
        :root {
          --bg-primary: #000 !important;
          --bg-secondary: #111 !important;
          --bg-tertiary: #1a1a1a !important;
          --border-primary: #fff !important;
          --border-secondary: #ccc !important;
          --text-primary: #fff !important;
          --text-secondary: #fff !important;
          --text-tertiary: #eee !important;
          --text-muted: #ccc !important;
          --accent: #ffff00 !important;
          --accent-bg: #333 !important;
        }
        * {
          border-color: #fff !important;
        }
        button, input, select, textarea {
          border-width: 2px !important;
        }
        :focus-visible {
          outline: 3px solid #ffff00 !important;
          outline-offset: 2px !important;
        }
      `);
    }

    // Reduced motion
    if (this._state.reducedMotion) {
      styles.push(`
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `);
    }

    // Large UI
    if (this._state.largeUI) {
      styles.push(`
        :root {
          font-size: ${14 * this._state.fontSizeMultiplier}px;
        }
        button, input, select, textarea {
          padding: ${6 * this._state.fontSizeMultiplier}px ${12 * this._state.fontSizeMultiplier}px !important;
        }
      `);
    }

    // Always show focus
    if (this._state.alwaysShowFocus) {
      styles.push(`
        :focus {
          outline: 2px solid var(--accent) !important;
          outline-offset: 1px !important;
        }
      `);
    }

    if (styles.length > 0) {
      this._styleElement = document.createElement("style");
      this._styleElement.textContent = styles.join("\n");
      document.head.appendChild(this._styleElement);
    }
  }

  private _loadSettings(): void {
    try {
      const settings = settingsManager.get() as Record<string, unknown>;
      this._state.highContrast = (settings.highContrast as boolean) ?? false;
      this._state.reducedMotion =
        (settings.reducedMotion as boolean) ?? AccessibilityManager.prefersReducedMotion();
      this._state.largeUI = (settings.largeUI as boolean) ?? false;
      this._state.fontSizeMultiplier =
        (settings.fontSizeMultiplier as number) ?? 1.0;
      this._state.alwaysShowFocus =
        (settings.alwaysShowFocus as boolean) ?? true;
    } catch {
      // Use defaults
    }
  }

  private _saveSettings(): void {
    try {
      const settings = settingsManager.get() as Record<string, unknown>;
      settingsManager.update({
        ...settings,
        highContrast: this._state.highContrast,
        reducedMotion: this._state.reducedMotion,
        largeUI: this._state.largeUI,
        fontSizeMultiplier: this._state.fontSizeMultiplier,
        alwaysShowFocus: this._state.alwaysShowFocus,
      } as Partial<AppSettings>);
    } catch {
      // Ignore
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────
export const accessibilityManager = new AccessibilityManager();
