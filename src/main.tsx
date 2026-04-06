import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { setupLazyImportRecovery } from "@/lib/lazyImportRecovery";

const removeSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 300);
  }
};

const registerServiceWorker = () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return undefined;
  }

  const checkForUpdates = async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      void checkForUpdates();
    }
  };

  const handleWindowFocus = () => {
    void checkForUpdates();
  };

  registerSW({
    immediate: true,
    onRegisteredSW() {
      void checkForUpdates();
    },
  });

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handleWindowFocus);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("focus", handleWindowFocus);
  };
};

const disposeLazyImportRecovery = setupLazyImportRecovery();
const disposeServiceWorkerListeners = registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
requestAnimationFrame(removeSplash);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeLazyImportRecovery?.();
    disposeServiceWorkerListeners?.();
  });
}

