import { isNativePlatform } from "@/lib/native";

const PREVIEW_KEY = "almasria_app_ui_preview";

/**
 * Lets you preview the native app UI inside a normal browser.
 * `?app=1` turns it on (remembered), `?app=0` turns it off.
 * Purely a presentation flag — it never touches auth, OTP or backend logic.
 */
export const initNativeUiPreview = (): void => {
  if (typeof window === "undefined") return;
  try {
    // Always clear any previously remembered preview flag: the website must
    // never switch to the app UI on its own.
    localStorage.removeItem(PREVIEW_KEY);
    const param = new URLSearchParams(window.location.search).get("app");
    // Real native shell always gets the app UI; `?app=1` is a session-only
    // browser preview of the very same UI.
    if (isNativePlatform() || param === "1") {
      document.documentElement.dataset.nativeApp = "true";
    } else {
      delete document.documentElement.dataset.nativeApp;
    }
  } catch {
    /* ignore */
  }
};

/**
 * True when the app is running inside the Capacitor iOS/Android shell.
 * Used to switch the UI from "website" to a real native app experience
 * (bottom tab bar, app header, app-style home screen).
 */
export const isNativeShell = (): boolean => {
  try {
    if (isNativePlatform()) return true;
    if (typeof document !== "undefined" && document.documentElement.dataset.nativeApp === "true") {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
};
