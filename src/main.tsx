import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupLazyImportRecovery } from "@/lib/lazyImportRecovery";
import { installMobileErrorReporter } from "@/lib/mobileErrorReport";

installMobileErrorReporter();

const removeSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 300);
  }
};

const registerServiceWorkerUpdateChecks = () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return undefined;
  }

  let isReloading = false;

  const reloadOnControllerChange = () => {
    if (isReloading) return;
    isReloading = true;
    window.location.reload();
  };

  const checkForUpdates = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    } catch {
      // Ignore transient service worker update failures
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      void checkForUpdates();
    }
  };

  const handleWindowFocus = () => {
    void checkForUpdates();
  };

  navigator.serviceWorker.addEventListener("controllerchange", reloadOnControllerChange);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handleWindowFocus);

  void checkForUpdates();

  return () => {
    navigator.serviceWorker.removeEventListener("controllerchange", reloadOnControllerChange);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("focus", handleWindowFocus);
  };
};

const disposeLazyImportRecovery = setupLazyImportRecovery();
const disposeServiceWorkerListeners = registerServiceWorkerUpdateChecks();

createRoot(document.getElementById("root")!).render(<App />);
requestAnimationFrame(removeSplash);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeLazyImportRecovery?.();
    disposeServiceWorkerListeners?.();
  });
}

