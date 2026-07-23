import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupLazyImportRecovery } from "@/lib/lazyImportRecovery";
import { installMobileErrorReporter } from "@/lib/mobileErrorReport";
import { installGlobalErrorDiagnostics } from "@/lib/runtimeDiagnostics";
import { initHighContrastEarly } from "@/hooks/useHighContrast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isNativePlatform } from "@/lib/native";

installGlobalErrorDiagnostics();
installMobileErrorReporter();
initHighContrastEarly();

const enforceCanonicalHost = () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.location.hostname !== "almasriaautoparts.com") {
    return false;
  }

  const canonicalUrl = new URL(window.location.href);
  canonicalUrl.hostname = "www.almasriaautoparts.com";
  window.location.replace(canonicalUrl.toString());
  return true;
};

if (enforceCanonicalHost()) {
  // Stop bootstrapping on the non-canonical host while the browser navigates.
}

const removeSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 300);
  }
};

/**
 * Service worker update logic.
 * We rely on vite-plugin-pwa (autoUpdate) for the core registration and reload.
 * This helper just provides a safe way to check for updates occasionally.
 */
const registerServiceWorkerUpdateChecks = () => {
  if (isNativePlatform()) {
    return undefined;
  }

  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return undefined;
  }

  const checkForUpdates = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    } catch {
      // Ignore transient service worker update failures
    }
  };

  // Only check for updates once on mount to avoid reload loops
  void checkForUpdates();

  // We remove the manual controllerchange listener as it is redundant 
  // with vite-plugin-pwa's 'autoUpdate' mode and can cause loops.
  return () => {};
};

if (!enforceCanonicalHost()) {
  const disposeLazyImportRecovery = setupLazyImportRecovery();
  const disposeServiceWorkerListeners = registerServiceWorkerUpdateChecks();

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );

  // Remove splash reliably
  if (document.readyState === "complete") {
    removeSplash();
  } else {
    window.addEventListener("load", removeSplash, { once: true });
    // Fallback if load event doesn't fire
    setTimeout(removeSplash, 2000);
  }

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      disposeLazyImportRecovery?.();
      disposeServiceWorkerListeners?.();
    });
  }
}
