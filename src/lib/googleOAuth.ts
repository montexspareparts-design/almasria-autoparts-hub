import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { APP_URL_SCHEME, isNativePlatform, openExternal } from "@/lib/native";

const OAUTH_RETURN_TO_KEY = "almasria_oauth_return_to";

const getStableOAuthRedirectUri = (requestedRedirectUri: string) => {
  if (typeof window === "undefined") {
    return requestedRedirectUri;
  }

  const currentUrl = new URL(window.location.href);

  try {
    const requestedUrl = new URL(requestedRedirectUri, currentUrl.origin);

    if (requestedUrl.hostname !== currentUrl.hostname) {
      requestedUrl.protocol = currentUrl.protocol;
      requestedUrl.host = currentUrl.host;
    }

    return requestedUrl.origin;
  } catch {
    return currentUrl.origin;
  }
};

export const setOAuthReturnTo = (redirectUri: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const currentUrl = new URL(window.location.href);
    const requestedUrl = new URL(redirectUri, currentUrl.origin);
    const returnTo = `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}` || "/";
    sessionStorage.setItem(OAUTH_RETURN_TO_KEY, returnTo.startsWith("/") ? returnTo : "/");
  } catch {
    sessionStorage.setItem(OAUTH_RETURN_TO_KEY, "/auth");
  }
};

export const consumeOAuthReturnTo = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const value = sessionStorage.getItem(OAUTH_RETURN_TO_KEY);
  if (!value) {
    return null;
  }

  sessionStorage.removeItem(OAUTH_RETURN_TO_KEY);
  return value.startsWith("/") ? value : "/";
};

/**
 * Starts the Google OAuth flow.
 *
 *  - On the web: unchanged. Uses the Lovable-managed OAuth abstraction
 *    which handles popup/web_message inside the browser or preview iframe.
 *
 *  - On native iOS: the Lovable managed flow relies on a popup +
 *    `web_message` postMessage, which is unavailable inside a WKWebView
 *    hosted on `capacitor://localhost`. Instead we call Supabase directly
 *    with `skipBrowserRedirect: true`, open the returned Google URL in
 *    Safari View Controller via Capacitor Browser, and rely on the global
 *    `appUrlOpen` listener (see `src/lib/native.ts`) to catch the redirect
 *    to `com.almasria.autoparts://auth-callback#access_token=...` and hand
 *    it to `supabase.auth.setSession()`.
 *
 *    The custom scheme `com.almasria.autoparts://auth-callback` MUST be
 *    added to the Supabase Auth "Additional Redirect URLs" allow-list.
 */
export const startGoogleOAuth = async (redirectUri: string) => {
  setOAuthReturnTo(redirectUri);

  if (isNativePlatform()) {
    const nativeRedirect = `${APP_URL_SCHEME}://auth-callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: nativeRedirect,
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw error;
    if (data?.url) {
      await openExternal(data.url);
    }
    return { redirected: true } as const;
  }

  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: getStableOAuthRedirectUri(redirectUri),
    extraParams: {
      prompt: "select_account",
    },
  });

  if (result.error) {
    throw result.error;
  }

  return result;
};
