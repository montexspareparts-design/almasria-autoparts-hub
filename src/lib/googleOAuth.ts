import { lovable } from "@/integrations/lovable/index";

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

    return requestedUrl.toString();
  } catch {
    return `${currentUrl.origin}${currentUrl.pathname}`;
  }
};

export const startGoogleOAuth = async (redirectUri: string) => {
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