import { Capacitor, registerPlugin } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIOS } from "@/lib/native";

/**
 * Production-safe Sign in with Apple for the iOS shell.
 *
 * Web: this helper is a no-op — the UI hides the button off-native.
 * Native iOS: uses Apple's official AuthenticationServices bridge and then
 * exchanges the returned Apple identity token with the backend via
 * `signInWithIdToken`.
 *
 * Do NOT use the browser OAuth fallback here. Apple OAuth requires a Services
 * ID as the first client ID, while this production iOS app is configured around
 * the native bundle ID. The deterministic native path avoids that mismatch.
 */

type AppleSignInResult = { session: true } | { redirected: true };

type NativeAppleCredential = {
  identityToken?: string;
  email?: string;
  givenName?: string;
  familyName?: string;
  user?: string;
};

type AppleSignInNativePlugin = {
  signIn(options: { nonce: string }): Promise<NativeAppleCredential>;
};

const AppleSignIn = registerPlugin<AppleSignInNativePlugin>("AppleSignIn");

export const isAppleSignInAvailable = (): boolean => isNativeIOS();

export class AppleSignInCanceledError extends Error {
  constructor() {
    super("canceled");
    this.name = "AppleSignInCanceledError";
  }
}

const createNonce = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const sha256Hex = async (value: string) => {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const displayNameFromApple = (credential: NativeAppleCredential) => {
  const fullName = [credential.givenName, credential.familyName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return fullName || null;
};

const saveFirstAppleName = async (credential: NativeAppleCredential) => {
  const fullName = displayNameFromApple(credential);
  if (!fullName && !credential.email) return;

  try {
    await supabase.auth.updateUser({
      data: {
        ...(fullName ? { full_name: fullName } : {}),
        ...(credential.givenName ? { given_name: credential.givenName } : {}),
        ...(credential.familyName ? { family_name: credential.familyName } : {}),
        ...(credential.email ? { email: credential.email } : {}),
        ...(credential.user ? { apple_user_id: credential.user } : {}),
      },
    });
  } catch (err) {
    console.warn("[apple] metadata backfill skipped", err);
  }
};

const startNativeAppleTokenSignIn = async (): Promise<AppleSignInResult> => {
  if (Capacitor.getPlatform() !== "ios") {
    throw new Error("Apple Sign In native bridge is only available on iOS");
  }

  const rawNonce = createNonce();
  const hashedNonce = await sha256Hex(rawNonce);
  const credential = await AppleSignIn.signIn({ nonce: hashedNonce });
  const identityToken = credential.identityToken?.trim();

  if (!identityToken) {
    throw new Error("ERR-APPLE-001: Apple did not return an identity token");
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
    nonce: rawNonce,
  });

  if (error) throw error;

  await saveFirstAppleName(credential);
  return { session: true } as const;
};

export const startAppleSignIn = async (): Promise<AppleSignInResult> => {
  if (!isNativeIOS()) {
    throw new Error("Apple Sign In is only available on iOS");
  }

  try {
    return await startNativeAppleTokenSignIn();
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
    const lower = message.toLowerCase();
    if (lower.includes("cancel") || lower.includes("closed")) {
      throw new AppleSignInCanceledError();
    }
    if (lower.includes("not implemented") || lower.includes("unavailable")) {
      throw new Error("ERR-APPLE-002: بيلد iOS قديم ولا يحتوي AppleSignInPlugin — لازم Archive/TestFlight جديد بعد آخر كود.");
    }
    if (lower.includes("audience") || lower.includes("client")) {
      throw new Error(
        "ERR-APPLE-003: Apple Client ID لازم يحتوي Bundle ID: com.almasria.autoparts في إعدادات الباك إند.",
      );
    }
    if (lower.includes("invalid nonce") || lower.includes("nonce")) {
      throw new Error("ERR-APPLE-004: فشل تحقق Apple nonce — استخدم آخر بيلد iOS بعد المزامنة.");
    }
    if (lower.includes("provider") && lower.includes("not enabled")) {
      throw new Error("ERR-APPLE-005: تسجيل الدخول بحساب Apple غير مفعّل في الباك إند.");
    }
    throw new Error(message || "ERR-APPLE-000: Apple Sign In failed");
  }
};
