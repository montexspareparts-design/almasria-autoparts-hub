type DiagnosticKind = "render" | "async" | "pauth" | "profile" | "role" | "phone";

const LAST_DIAGNOSTIC_KEY = "almasria:last-diagnostic-code";
const LAST_DIAGNOSTIC_AT_KEY = "almasria:last-diagnostic-at";

const PREFIX_BY_KIND: Record<DiagnosticKind, string> = {
  render: "ERR-RENDER",
  async: "ERR-ASYNC",
  pauth: "ERR-PAUTH",
  profile: "ERR-PROFILE",
  role: "ERR-ROLE",
  phone: "ERR-PHONE",
};

let installed = false;

const sanitize = (value: unknown): string => {
  const raw = value instanceof Error ? `${value.name}: ${value.message}` : String(value ?? "unknown");
  return raw
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/01[0-9]{9}/g, "[phone]")
    .replace(/20?1[0-9]{9}/g, "[phone]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[jwt]")
    .replace(/(access_token|refresh_token|identity_token|password|token|code)=([^&#\s]+)/gi, "$1=[redacted]")
    .slice(0, 220);
};

const hashDiagnostic = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return String(hash % 1000).padStart(3, "0");
};

export const recordDiagnostic = (
  kind: DiagnosticKind,
  error: unknown,
  source = "runtime"
): string => {
  const safe = sanitize(error);
  const code = `${PREFIX_BY_KIND[kind]}-${hashDiagnostic(`${kind}:${source}:${safe}`)}`;
  try {
    sessionStorage.setItem(LAST_DIAGNOSTIC_KEY, code);
    sessionStorage.setItem(LAST_DIAGNOSTIC_AT_KEY, String(Date.now()));
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

export const installGlobalErrorDiagnostics = () => {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    recordDiagnostic("async", event.error || event.message, "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    recordDiagnostic("async", event.reason || "unhandledrejection", "window.unhandledrejection");
  });
};