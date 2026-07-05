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
  if (typeof window === "undefined") return;
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
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(OAUTH_RETURN_TO_KEY);
  if (!value) return null;
  sessionStorage.removeItem(OAUTH_RETURN_TO_KEY);
  return value.startsWith("/") ? value : "/";
};

/**
 * Starts the Google OAuth flow.
 *
 *  - Web: Lovable-managed OAuth (popup + web_message). Unchanged.
 *
 *  - Native iOS (Capacitor): Supabase OAuth via SFSafariViewController
 *    (@capacitor/browser). Google redirects back to the custom URL scheme
 *    `com.almasria.autoparts://auth-callback`, which is captured by the
 *    global `appUrlOpen` listener registered in `src/lib/native.ts`. That
 *    listener parses `access_token` + `refresh_token` from the URL hash,
 *    calls `supabase.auth.setSession(...)`, closes the in-app browser, and
 *    navigates to the intended route.
 *
 *    No third-party Google plugin is used. The only iOS-side requirement
 *    is that the custom scheme is registered in Info.plist (already done)
 *    and `com.almasria.autoparts://auth-callback` is on the Supabase
 *    Auth "Additional Redirect URLs" allow-list.
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
    if (!data?.url) throw new Error("No OAuth URL returned by Supabase");
    await openExternal(data.url);
    return { redirected: true } as const;
  }

  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: getStableOAuthRedirectUri(redirectUri),
    extraParams: { prompt: "select_account" },
  });

  if (result.error) throw result.error;
  return result;
};
