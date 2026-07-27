import { registerPlugin } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIOS, APP_URL_SCHEME, openExternal } from "@/lib/native";

/**
 * Native Sign in with Apple.
 *
 * Web: this helper is a no-op — the UI hides the button off-native.
 * Native iOS: calls a small in-project Swift bridge (`AppleSignInPlugin`)
 * that uses Apple's AuthenticationServices framework. The identity token
 * is exchanged with Supabase via `signInWithIdToken({ provider: "apple" })`.
 *
 * Security: a cryptographically random raw nonce is generated in JS,
 * SHA-256 hashed, and the hash is sent to Apple. The raw nonce is sent
 * with the token to Supabase so Apple's signature can be verified.
 *
 * First-login name: Apple only returns the user's name on the very first
 * authorization. When present, we write it into Supabase user metadata
 * — but only if the current metadata doesn't already have a valid name,
 * so subsequent (nameless) logins never clobber existing customer data.
 */

interface AppleNativePlugin {
  signIn(options: { nonce: string }): Promise<{
    identityToken: string;
    email: string;
    givenName: string;
    familyName: string;
    user: string;
  }>;
}

const AppleSignIn = registerPlugin<AppleNativePlugin>("AppleSignIn");

const generateRawNonce = (length = 32): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._";
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[buf[i] % chars.length];
  return out;
};

const sha256Hex = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const isAppleSignInAvailable = (): boolean => isNativeIOS();

export class AppleSignInCanceledError extends Error {
  constructor() {
    super("canceled");
    this.name = "AppleSignInCanceledError";
  }
}

/**
 * Web-based Apple OAuth fallback (Supabase + SFSafariViewController).
 * Used when the in-app native Swift bridge is unavailable in the shipped
 * binary (e.g. "AppleSignIn plugin is not implemented on ios"). Apple
 * redirects back to `com.almasria.autoparts://auth-callback`, which the
 * global deep-link listener turns into a Supabase session.
 */
const startAppleOAuthFallback = async (): Promise<{ session: true }> => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: `${APP_URL_SCHEME}://auth-callback`,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Apple OAuth URL missing");
  await openExternal(data.url);
  return { session: true } as const;
};

export const startAppleSignIn = async (): Promise<{ session: true }> => {
  if (!isNativeIOS()) {
    throw new Error("Apple Sign In is only available on iOS");
  }

  const rawNonce = generateRawNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  let native;
  try {
    native = await AppleSignIn.signIn({ nonce: hashedNonce });
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
    if (message === "canceled") throw new AppleSignInCanceledError();
    // Native bridge missing in this binary → fall back to the hosted flow.
    if (/not implemented|unimplemented|not available|unavailable/i.test(message)) {
      console.warn("[apple] native bridge unavailable, using OAuth fallback");
      return startAppleOAuthFallback();
    }
    throw new Error(message || "Apple Sign In failed");
  }

  if (!native?.identityToken) {
    return startAppleOAuthFallback();
  }


  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: native.identityToken,
    nonce: rawNonce,
  });
  if (error) {
    const raw = (error.message || "").toLowerCase();
    if (raw.includes("audience")) {
      throw new Error(
        "إعداد Apple ناقص في الخادم: لازم يضاف معرّف التطبيق com.almasria.autoparts كـ Client ID مسموح به.",
      );
    }
    if (raw.includes("nonce")) {
      throw new Error("فشل التحقق الأمني من Apple. جرّب مرة أخرى.");
    }
    if (raw.includes("provider") && raw.includes("not enabled")) {
      throw new Error("تسجيل الدخول بحساب Apple غير مفعّل على الخادم.");
    }
    throw error;
  }

  if (!data?.session) throw new Error("Supabase did not return a session");

  // First-login: Apple gives fullName only once. Persist to user_metadata
  // WITHOUT overwriting an existing valid name from a prior session.
  const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const existingFullName =
    typeof meta.full_name === "string" ? meta.full_name.trim() : "";

  const given = (native.givenName || "").trim();
  const family = (native.familyName || "").trim();
  const composed = [given, family].filter(Boolean).join(" ").trim();

  if (composed && !existingFullName) {
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: composed,
          given_name: given || undefined,
          family_name: family || undefined,
        },
      });
    } catch (err) {
      console.warn("[apple] failed to persist first-login name", err);
    }
  }

  return { session: true } as const;
};
