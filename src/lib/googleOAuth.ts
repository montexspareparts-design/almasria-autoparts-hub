import { lovable } from "@/integrations/lovable/index";

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

export const startGoogleOAuth = async (redirectUri: string) => {
  setOAuthReturnTo(redirectUri);

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