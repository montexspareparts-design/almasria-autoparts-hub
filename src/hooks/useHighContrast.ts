import { useEffect, useState, useCallback } from "react";

/**
 * useHighContrast — Accessibility toggle for low-vision users.
 *
 * When enabled (persisted to localStorage), it adds the `hc-mode` class on
 * the document root. The actual visual changes live in `src/index.css`
 * under the `html.hc-mode` selector (badge opacity, ring width, text-shadow
 * strength, focus outlines, link underlines).
 *
 * The toggle also respects the OS-level `prefers-contrast: more` media
 * query the FIRST time the user visits — auto-enabling High Contrast for
 * users who already opted in at the system level. After that, the user's
 * explicit choice always wins.
 */

const STORAGE_KEY = "almasria_high_contrast";
const ROOT_CLASS = "hc-mode";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "1") return true;
  if (saved === "0") return false;
  // First visit: respect OS preference
  try {
    return window.matchMedia("(prefers-contrast: more)").matches;
  } catch {
    return false;
  }
}

function applyToRoot(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(ROOT_CLASS, enabled);
}

export function useHighContrast() {
  const [enabled, setEnabled] = useState<boolean>(() => readInitial());

  // Apply on mount + whenever it changes
  useEffect(() => {
    applyToRoot(enabled);
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  return { enabled, setEnabled, toggle };
}

/**
 * Side-effect-only initializer for very early app bootstrap (before React
 * hydrates the settings page). Call once from `main.tsx` so the class is
 * present on the very first paint and badges don't visually jump.
 */
export function initHighContrastEarly() {
  applyToRoot(readInitial());
}
