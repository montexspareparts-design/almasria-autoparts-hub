/**
 * Native platform utility layer.
 *
 * Centralizes all Capacitor-specific behavior so the rest of the codebase can
 * stay platform-agnostic. On the plain web this file is effectively a no-op
 * that falls back to normal browser behavior.
 *
 * Rules:
 *  - `isNativeIOS()` is the ONLY approved way to branch on the runtime host.
 *  - `openExternal()` MUST be used for every external HTTPS link that would
 *    otherwise be opened via `window.open(url, "_blank")`.
 *  - `saveAndShareFile()` MUST be used for every generated file (PDF, xlsx,
 *    png) that on the web would call `pdf.save()` / `link.download` / etc.
 *  - Do NOT import `@capacitor/*` packages anywhere else in the codebase —
 *    always go through this module.
 */
import { Capacitor } from "@capacitor/core";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

// Canonical public HTTPS origin. Used whenever a callback URL must be
// reachable from outside the app (Paymob, password reset emails, etc.).
export const CANONICAL_WEB_ORIGIN = "https://almasriaautoparts.com";

// Custom URL scheme registered in Info.plist. Deep-links use this scheme
// to hand control back to the native app after external flows.
export const APP_URL_SCHEME = "com.almasria.autoparts";

export const isNativePlatform = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const isNativeIOS = (): boolean => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
};

/**
 * Returns the origin that MUST be used when building URLs that will be
 * consumed by external systems (payment gateways, OAuth providers, email
 * links). On native this is always the canonical HTTPS origin; on the web
 * it is `window.location.origin` so preview / custom-domain builds keep
 * working unchanged.
 */
export const publicWebOrigin = (): string => {
  if (isNativePlatform()) return CANONICAL_WEB_ORIGIN;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return CANONICAL_WEB_ORIGIN;
};

/**
 * Open an external HTTPS URL. On the web keeps the existing
 * `window.open(url, "_blank")` behavior; on native opens the system Safari
 * View Controller via `@capacitor/browser` so the user can bounce back to
 * the app with a single tap.
 */
export const openExternal = async (url: string): Promise<void> => {
  if (!url) return;
  if (isNativePlatform()) {
    try {
      await Browser.open({ url, presentationStyle: "popover" });
      return;
    } catch (err) {
      console.warn("[native] Browser.open failed, falling back", err);
    }
  }
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

export const closeInAppBrowser = async (): Promise<void> => {
  if (!isNativePlatform()) return;
  try {
    await Browser.close();
  } catch {
    /* no-op: browser may already be closed */
  }
};

/**
 * WhatsApp links. iOS hands off `https://wa.me/...` to the installed
 * WhatsApp app automatically when opened via Safari View Controller, so we
 * just funnel through openExternal.
 */
export const openWhatsApp = async (url: string): Promise<void> => {
  await openExternal(url);
};

/** External PDFs, invoices, catalogs served over HTTPS. */
export const openExternalDocument = async (url: string): Promise<void> => {
  await openExternal(url);
};

// --------------------------------------------------------------------------
// File save + share
// --------------------------------------------------------------------------

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize))
    );
  }
  return btoa(binary);
};

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  return arrayBufferToBase64(buffer);
};

const webDownloadBlob = (blob: Blob, filename: string) => {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export type SaveAndSharePayload =
  | { kind: "blob"; blob: Blob }
  | { kind: "arraybuffer"; buffer: ArrayBuffer; mime: string }
  | { kind: "base64"; base64: string; mime: string };

/**
 * Save a generated file and offer it to the user through the appropriate
 * OS mechanism.
 *
 *  - Web: triggers the standard browser download.
 *  - Native iOS: writes to Documents/, then opens the system Share Sheet
 *    so the user can Save to Files, print, mail, or open in another app.
 *
 * Throws on failure — callers should surface an Arabic toast.
 */
export const saveAndShareFile = async (
  payload: SaveAndSharePayload,
  filename: string,
  opts: { dialogTitle?: string } = {}
): Promise<void> => {
  if (!isNativePlatform()) {
    // Web path — preserve historic download UX exactly.
    if (payload.kind === "blob") {
      webDownloadBlob(payload.blob, filename);
      return;
    }
    if (payload.kind === "arraybuffer") {
      webDownloadBlob(new Blob([payload.buffer], { type: payload.mime }), filename);
      return;
    }
    // base64 → blob
    const bin = atob(payload.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    webDownloadBlob(new Blob([bytes], { type: payload.mime }), filename);
    return;
  }

  // Native path
  let base64: string;
  if (payload.kind === "blob") base64 = await blobToBase64(payload.blob);
  else if (payload.kind === "arraybuffer") base64 = arrayBufferToBase64(payload.buffer);
  else base64 = payload.base64;

  const safeName = filename.replace(/[\\/:*?"<>|]/g, "_");

  const written = await Filesystem.writeFile({
    path: safeName,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });

  try {
    await Share.share({
      title: opts.dialogTitle || safeName,
      text: opts.dialogTitle || safeName,
      url: written.uri,
      dialogTitle: opts.dialogTitle || "حفظ أو مشاركة الملف",
    });
  } catch (err) {
    // User dismissed share sheet — not an error worth throwing.
    if (!/cancel/i.test(String(err))) throw err;
  }
};

// --------------------------------------------------------------------------
// Deep-link routing
// --------------------------------------------------------------------------

/**
 * Whitelist of internal application paths that the native deep-link handler
 * is allowed to route to. Anything outside this list is ignored to avoid
 * open-redirect style abuse via a malicious link.
 */
const ALLOWED_DEEP_LINK_PATHS = new Set<string>([
  "/payment-callback",
  "/reset-password",
  "/auth-callback",
  "/auth",
  "/",
]);

const supabaseImportPromise = () => import("@/integrations/supabase/client");

let deepLinkListenerRegistered = false;
let launchUrlHandled = false;

type NativeNavigate = (path: string, opts?: { replace?: boolean }) => void;

const routeNativeTarget = (target: string, navigate?: NativeNavigate) => {
  if (navigate) {
    navigate(target, { replace: true });
    return;
  }

  if (typeof window === "undefined") return;

  try {
    window.history.replaceState(window.history.state, "", target);
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
  } catch {
    window.location.replace(target);
  }
};

const getParams = (parsed: URL) => {
  const hash = parsed.hash?.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
  const hashParams = hash ? new URLSearchParams(hash) : new URLSearchParams();
  const queryParams = parsed.search ? new URLSearchParams(parsed.search.slice(1)) : new URLSearchParams();
  return { hashParams, queryParams };
};

const hydrateOAuthSessionFromUrl = async (parsed: URL) => {
  const { supabase } = await supabaseImportPromise();
  const { hashParams, queryParams } = getParams(parsed);

  // Some native OAuth providers return tokens in the fragment, others in the
  // query string. Read both so implicit and PKCE callbacks are deterministic.
  const access_token = hashParams.get("access_token") || queryParams.get("access_token");
  const refresh_token = hashParams.get("refresh_token") || queryParams.get("refresh_token");
  const code = queryParams.get("code") || hashParams.get("code");
  const oauthErr =
    queryParams.get("error_description") ||
    queryParams.get("error") ||
    hashParams.get("error_description") ||
    hashParams.get("error");

  console.info("[deeplink] auth-callback", {
    hasCode: !!code,
    hasHashTokens: !!(hashParams.get("access_token") && hashParams.get("refresh_token")),
    hasQueryTokens: !!(queryParams.get("access_token") && queryParams.get("refresh_token")),
    hasError: !!oauthErr,
  });

  if (oauthErr) {
    console.warn("[deeplink] oauth provider error", oauthErr);
    return;
  }

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) console.warn("[deeplink] setSession failed", error.message);
    return;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.warn("[deeplink] exchangeCodeForSession failed", error.message);
  }
};

const handleNativeDeepLinkUrl = async (raw: string, navigate?: NativeNavigate) => {
  if (!raw) return;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    console.warn("[deeplink] malformed url", raw);
    return;
  }

  // Only accept our own custom scheme, or universal-link https from
  // the canonical domain.
  const isCustomScheme = parsed.protocol === `${APP_URL_SCHEME}:`;
  const isCanonicalHttps =
    parsed.protocol === "https:" &&
    (parsed.hostname === "almasriaautoparts.com" ||
      parsed.hostname === "www.almasriaautoparts.com");
  if (!isCustomScheme && !isCanonicalHttps) {
    console.warn("[deeplink] rejected scheme", parsed.protocol, parsed.hostname);
    return;
  }

  // Custom scheme uses `host` as the "path" (e.g. com.almasria.autoparts://payment-callback).
  // Normalize both to a leading-slash path.
  const rawPath = isCustomScheme
    ? `/${parsed.hostname}${parsed.pathname || ""}`
    : parsed.pathname || "/";
  const path = rawPath.replace(/\/+/g, "/");

  if (!ALLOWED_DEEP_LINK_PATHS.has(path)) {
    console.warn("[deeplink] path not allowed", path);
    return;
  }

  if (path === "/auth-callback") {
    try {
      await hydrateOAuthSessionFromUrl(parsed);
    } catch (err) {
      console.warn("[deeplink] failed to hydrate oauth session", err);
    }
  }

  await closeInAppBrowser();

  const search = parsed.search || "";
  const target = `${path}${search}`;
  routeNativeTarget(target, navigate);
};

/**
 * Registers the single global `appUrlOpen` listener. Safe to call multiple
 * times — subsequent calls are no-ops. Must be called once at bootstrap
 * (from `src/main.tsx`).
 */
export const registerDeepLinkListener = (
  navigate?: NativeNavigate
): void => {
  if (!isNativePlatform() || deepLinkListenerRegistered) return;
  deepLinkListenerRegistered = true;

  App.addListener("appUrlOpen", async (event: URLOpenListenerEvent) => {
    try {
      await handleNativeDeepLinkUrl(event.url, navigate);
    } catch (err) {
      console.error("[deeplink] handler failure", err);
    }
  });

  if (!launchUrlHandled) {
    launchUrlHandled = true;
    App.getLaunchUrl()
      .then((launch) => {
        if (launch?.url) void handleNativeDeepLinkUrl(launch.url, navigate);
      })
      .catch((err) => console.warn("[deeplink] getLaunchUrl failed", err));
  }
};
