import { isNativePlatform } from "@/lib/native";

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
