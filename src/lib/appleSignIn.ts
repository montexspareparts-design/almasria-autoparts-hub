import { supabase } from "@/integrations/supabase/client";
import { isNativeIOS, APP_URL_SCHEME, openExternal } from "@/lib/native";

/**
 * Production-safe Sign in with Apple for the iOS shell.
 *
 * Web: this helper is a no-op — the UI hides the button off-native.
 * Native iOS: starts the backend-hosted Apple OAuth flow in SFSafariViewController
 * and returns through `com.almasria.autoparts://auth-callback`.
 *
 * The previous native AuthenticationServices sheet is intentionally not used
 * as the primary path because the real TestFlight video shows iOS returning
 * "Sign Up Not Completed" before the app can exchange a token. OAuth keeps one
 * deterministic path, supports PKCE/implicit callbacks through the global
 * deep-link listener, and avoids the failing native sheet entirely.
 */

type AppleSignInResult = { session: true } | { redirected: true };

export const isAppleSignInAvailable = (): boolean => isNativeIOS();

export class AppleSignInCanceledError extends Error {
  constructor() {
    super("canceled");
    this.name = "AppleSignInCanceledError";
  }
}

const startAppleOAuth = async (): Promise<AppleSignInResult> => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: `${APP_URL_SCHEME}://auth-callback`,
      skipBrowserRedirect: true,
      queryParams: {
        response_mode: "form_post",
      },
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Apple OAuth URL missing");
  await openExternal(data.url);
  return { redirected: true } as const;
};

export const startAppleSignIn = async (): Promise<AppleSignInResult> => {
  if (!isNativeIOS()) {
    throw new Error("Apple Sign In is only available on iOS");
  }

  try {
    return await startAppleOAuth();
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
    const lower = message.toLowerCase();
    if (lower.includes("cancel") || lower.includes("closed")) {
      throw new AppleSignInCanceledError();
    }
    if (lower.includes("audience") || lower.includes("client")) {
      throw new Error(
        "إعداد Apple ناقص: تأكد من حفظ Client ID و Redirect URL في إعدادات تسجيل الدخول بآبل.",
      );
    }
    if (lower.includes("provider") && lower.includes("not enabled")) {
      throw new Error("تسجيل الدخول بحساب Apple غير مفعّل على الخادم.");
    }
    throw new Error(message || "Apple Sign In failed");
  }
};
