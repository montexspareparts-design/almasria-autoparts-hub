import { supabase } from "@/integrations/supabase/client";
import { isNativePlatform, publicWebOrigin } from "@/lib/native";

export const PAYMOB_CALLBACK_PATH = "/payment-callback";
export const PAYMOB_ATTEMPT_SEPARATOR = "--pm--";
// Query flag added to the public callback URL when the payment attempt
// originated inside the native app, so the public page can offer a
// "return to app" deep link once done.
export const PAYMOB_NATIVE_FLAG = "src=ios";

export const isValidPaymobPublicKey = (key?: string | null) =>
  Boolean(key && (key.startsWith("egy_pk_") || key.startsWith("pak_pk_")));

/**
 * Builds the Paymob `return_url`.
 *
 * On the web: uses the current origin so preview / custom domains keep
 * working. On native: always the canonical HTTPS domain — Paymob will
 * reject `capacitor://` schemes and the app couldn't receive a redirect
 * to `capacitor://localhost` from a third-party origin anyway.
 */
export const buildPaymobReturnUrl = () => {
  const base = `${publicWebOrigin()}${PAYMOB_CALLBACK_PATH}`;
  return isNativePlatform() ? `${base}?${PAYMOB_NATIVE_FLAG}` : base;
};

export const normalizePaymobOrderReference = (reference?: string | null) =>
  reference ? reference.split(PAYMOB_ATTEMPT_SEPARATOR)[0] : null;


/**
 * Ensures a valid auth session before making payment requests.
 * Refreshes the token if expired, throws if no session exists.
 */
export const ensureActiveSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("SESSION_EXPIRED");
  }

  // Check if token expires within the next 60 seconds
  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);

  if (expiresAt - now < 60) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) {
      throw new Error("SESSION_EXPIRED");
    }
  }
};