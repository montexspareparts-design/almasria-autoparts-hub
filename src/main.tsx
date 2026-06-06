import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupLazyImportRecovery } from "@/lib/lazyImportRecovery";
import { installMobileErrorReporter } from "@/lib/mobileErrorReport";
import { initHighContrastEarly } from "@/hooks/useHighContrast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

installMobileErrorReporter();
initHighContrastEarly();

const removeSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 300);
  }
};

// Clean up any legacy service workers (old vite-plugin-pwa app-shell SW or
// registerSW.js) that could keep serving stale HTML and cause endless loading.
// Then register the lightweight push-only SW on its own scope so push
// notifications keep working without an app-shell cache.
const cleanupLegacyServiceWorkers = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs.map(async (reg) => {
        const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
        // Unregister the old app-shell SW and any registerSW.js leftovers.
        if (/\/sw\.js(\?|$)/.test(url) || /\/registerSW\.js(\?|$)/.test(url) || /\/service-worker\.js(\?|$)/.test(url)) {
          try {
            await reg.unregister();
          } catch {
            // ignore
          }
        }
      }),
    );
  } catch {
    // ignore – best effort cleanup
  }
};

const registerPushServiceWorker = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;
  // Refuse registration inside Lovable preview/iframe contexts.
  try {
    if (window.top !== window.self) return;
  } catch {
    return;
  }
  const host = window.location.hostname;
  if (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  ) {
    return;
  }
  try {
    await navigator.serviceWorker.register("/sw-push.js", { scope: "/" });
  } catch {
    // Push is non-critical; never block the app on it.
  }
};

void cleanupLegacyServiceWorkers().then(registerPushServiceWorker);

const disposeLazyImportRecovery = setupLazyImportRecovery();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
requestAnimationFrame(removeSplash);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeLazyImportRecovery?.();
  });
}
