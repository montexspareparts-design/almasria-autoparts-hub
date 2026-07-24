import { isNativePlatform } from "@/lib/native";

type DiagnosticKind = "render" | "async" | "pauth" | "profile" | "role" | "phone";

const LAST_DIAGNOSTIC_KEY = "almasria:last-diagnostic-code";
const LAST_DIAGNOSTIC_AT_KEY = "almasria:last-diagnostic-at";
const DIAG_RECORD_KEY = "almasria:diag:last-record";

const PREFIX_BY_KIND: Record<DiagnosticKind, string> = {
  render: "ERR-RENDER",
  async: "ERR-ASYNC",
  pauth: "ERR-PAUTH",
  profile: "ERR-PROFILE",
  role: "ERR-ROLE",
  phone: "ERR-PHONE",
};

let installed = false;

/** Diagnostic mode is opt-in via VITE_DIAGNOSTIC_MODE=true at build time. */
export const isDiagnosticMode = (): boolean => {
  try {
    return String(import.meta.env.VITE_DIAGNOSTIC_MODE ?? "").toLowerCase() === "true";
  } catch {
    return false;
  }
};

/** Build commit SHA injected at build time (see vite.config.ts). */
export const getBuildCommit = (): string => {
  try {
    // @ts-expect-error - injected via vite define
    return typeof __BUILD_COMMIT__ !== "undefined" ? String(__BUILD_COMMIT__) : "dev";
  } catch {
    return "dev";
  }
};

export const getBuildNumber = (): string => {
  try {
    // @ts-expect-error - injected via vite define
    return typeof __BUILD_NUMBER__ !== "undefined" ? String(__BUILD_NUMBER__) : "0";
  } catch {
    return "0";
  }
};

export const sanitize = (value: unknown): string => {
  const raw = value instanceof Error ? `${value.name}: ${value.message}` : String(value ?? "unknown");
  return raw
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/01[0-9]{9}/g, "[phone]")
    .replace(/20?1[0-9]{9}/g, "[phone]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[jwt]")
    .replace(/(access_token|refresh_token|identity_token|password|token|code|nonce)=([^&#\s]+)/gi, "$1=[redacted]")
    .slice(0, 400);
};

/** Extract first N stack frames, redacting query strings that may carry tokens. */
export const extractStackFrames = (stack: string | undefined, n = 3): string[] => {
  if (!stack) return [];
  return stack
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && l !== "Error")
    .slice(0, n)
    .map((l) =>
      l
        .replace(/\?[^)\s]+/g, "?[redacted]")
        .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[jwt]"),
    );
};

const hashDiagnostic = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return String(hash % 1000).padStart(3, "0");
};

export interface DiagnosticRecord {
  code: string;
  kind: DiagnosticKind;
  source: string;
  name: string;
  message: string;
  frames: string[];
  componentStack?: string;
  route: string;
  platform: string;
  native: boolean;
  commit: string;
  buildNumber: string;
  at: number;
}

const buildRecord = (
  kind: DiagnosticKind,
  error: unknown,
  source: string,
  code: string,
  componentStack?: string,
): DiagnosticRecord => {
  const err = error instanceof Error ? error : new Error(String(error ?? "unknown"));
  let platform = "web";
  let native = false;
  try {
    // Lazy access to avoid capacitor init issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require("@capacitor/core");
    platform = Capacitor.getPlatform?.() ?? "web";
    native = Capacitor.isNativePlatform?.() ?? false;
  } catch {
    /* ignore */
  }
  return {
    code,
    kind,
    source,
    name: sanitize(err.name).slice(0, 80),
    message: sanitize(err.message).slice(0, 240),
    frames: extractStackFrames(err.stack, 3),
    componentStack: componentStack ? sanitize(componentStack).slice(0, 400) : undefined,
    route: typeof window !== "undefined" ? window.location.pathname + window.location.search : "unknown",
    platform,
    native,
    commit: getBuildCommit(),
    buildNumber: getBuildNumber(),
    at: Date.now(),
  };
};

export const recordDiagnostic = (
  kind: DiagnosticKind,
  error: unknown,
  source = "runtime",
  componentStack?: string,
): string => {
  const safe = sanitize(error);
  const code = `${PREFIX_BY_KIND[kind]}-${hashDiagnostic(`${kind}:${source}:${safe}`)}`;
  const record = buildRecord(kind, error, source, code, componentStack);
  try {
    sessionStorage.setItem(LAST_DIAGNOSTIC_KEY, code);
    sessionStorage.setItem(LAST_DIAGNOSTIC_AT_KEY, String(record.at));
    localStorage.setItem(DIAG_RECORD_KEY, JSON.stringify(record));
  } catch {
    /* ignore unavailable storage */
  }
  console.error(`[diagnostic][${code}] ${source}: ${safe}`);
  return code;
};

export const getLastDiagnosticCode = (): string | null => {
  try {
    return sessionStorage.getItem(LAST_DIAGNOSTIC_KEY);
  } catch {
    return null;
  }
};

export const getLastDiagnosticRecord = (): DiagnosticRecord | null => {
  try {
    const raw = localStorage.getItem(DIAG_RECORD_KEY);
    return raw ? (JSON.parse(raw) as DiagnosticRecord) : null;
  } catch {
    return null;
  }
};

export const installGlobalErrorDiagnostics = () => {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    recordDiagnostic("async", event.error || event.message, "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    recordDiagnostic("async", event.reason || "unhandledrejection", "window.unhandledrejection");
  });

  // Silence lint about isNativePlatform import
  void isNativePlatform;
};
