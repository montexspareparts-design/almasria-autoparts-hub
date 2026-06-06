import { lovable } from "@/integrations/lovable/index";

export const startGoogleOAuth = async (redirectUri: string) => {
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: redirectUri,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
};