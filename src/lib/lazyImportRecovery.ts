type ReloadAttempt = {
  route: string;
  ts: number;
};

const RELOAD_GUARD_KEY = "__lazy_import_reload_attempt__";
const RELOAD_COOLDOWN_MS = 10_000;
const DYNAMIC_IMPORT_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "error loading dynamically imported module",
];

declare global {
  interface Window {
    __lazyImportRecoveryCleanup__?: () => void;
  }
}

const getCurrentRoute = () =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;

const readReloadAttempt = (): ReloadAttempt | null => {
  try {
    const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ReloadAttempt>;
    if (typeof parsed.route !== "string" || typeof parsed.ts !== "number") {
      return null;
    }

    return { route: parsed.route, ts: parsed.ts };
  } catch {
    return null;
  }
};

const shouldRecoverFromError = (value: unknown): boolean => {
  const message =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : value && typeof value === "object" && "message" in value
          ? String((value as { message?: unknown }).message ?? "")
          : "";

  return DYNAMIC_IMPORT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

const reloadOncePerRoute = () => {
  const route = getCurrentRoute();
  const lastAttempt = readReloadAttempt();

  if (lastAttempt && lastAttempt.route === route && Date.now() - lastAttempt.ts < RELOAD_COOLDOWN_MS) {
    return;
  }

  sessionStorage.setItem(
    RELOAD_GUARD_KEY,
    JSON.stringify({ route, ts: Date.now() } satisfies ReloadAttempt)
  );

  window.location.reload();
};

export const setupLazyImportRecovery = () => {
  if (typeof window === "undefined") return undefined;

  window.__lazyImportRecoveryCleanup__?.();

  const handleVitePreloadError = (event: Event) => {
    event.preventDefault();
    reloadOncePerRoute();
  };

  const handleWindowError = (event: ErrorEvent) => {
    if (shouldRecoverFromError(event.error) || shouldRecoverFromError(event.message)) {
      event.preventDefault();
      reloadOncePerRoute();
    }
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (shouldRecoverFromError(event.reason)) {
      event.preventDefault();
      reloadOncePerRoute();
    }
  };

  window.addEventListener("vite:preloadError", handleVitePreloadError as EventListener);
  window.addEventListener("error", handleWindowError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  const cleanup = () => {
    window.removeEventListener("vite:preloadError", handleVitePreloadError as EventListener);
    window.removeEventListener("error", handleWindowError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);

    if (window.__lazyImportRecoveryCleanup__ === cleanup) {
      delete window.__lazyImportRecoveryCleanup__;
    }
  };

  window.__lazyImportRecoveryCleanup__ = cleanup;

  return cleanup;
};
