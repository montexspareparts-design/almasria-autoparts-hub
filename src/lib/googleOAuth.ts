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
 *  - Web: Lovable-managed OAuth (popup + web_message).
 *
 *  - Native iOS: Uses `@codetrix-studio/capacitor-google-auth` — the
 *    native Google Sign-In SDK. Returns an ID token which we exchange
 *    for a Supabase session via `supabase.auth.signInWithIdToken`. This
 *    is the App Store–compliant path (no in-app browser popup).
 *
 *    Prerequisites (one-time setup by the iOS developer):
 *      1. Create an "iOS" OAuth Client ID in Google Cloud Console with
 *         Bundle ID `com.almasria.autoparts`.
 *      2. Put `REVERSED_CLIENT_ID` into Info.plist CFBundleURLSchemes
 *         (see the second URL Type block).
 *      3. Put the iOS client ID into `GIDClientID` in Info.plist.
 *      4. Also create a "Web" OAuth Client ID and add its client ID as
 *         the `serverClientId` below (needed so Google returns an ID
 *         token audience Supabase accepts).
 */

// Web OAuth client ID — this is a PUBLIC identifier, safe to commit.
// TODO: iOS developer to replace after creating the Web OAuth Client
// in Google Cloud Console (same project as the iOS client).
const GOOGLE_WEB_CLIENT_ID = "REPLACE_WITH_WEB_CLIENT_ID.apps.googleusercontent.com";

let googleAuthInitialized = false;
const initNativeGoogleAuth = async () => {
  if (!isNativePlatform() || googleAuthInitialized) return;
  const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
  await GoogleAuth.initialize({
    clientId: GOOGLE_WEB_CLIENT_ID, // Web client ID for token audience
    scopes: ["profile", "email"],
    grantOfflineAccess: false,
  });
  googleAuthInitialized = true;
};

export const startGoogleOAuth = async (redirectUri: string) => {
  setOAuthReturnTo(redirectUri);

  if (isNativePlatform()) {
    try {
      await initNativeGoogleAuth();
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser?.authentication?.idToken;
      if (!idToken) throw new Error("No ID token from Google");

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      if (error) throw error;
      return { redirected: false, session: true } as const;
    } catch (err) {
      // Fallback to browser-based OAuth if native SDK not yet configured
      console.warn("[googleOAuth] native path failed, falling back to browser", err);
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
      if (data?.url) await openExternal(data.url);
      return { redirected: true } as const;
    }
  }

  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: getStableOAuthRedirectUri(redirectUri),
    extraParams: { prompt: "select_account" },
  });

  if (result.error) throw result.error;
  return result;
};
