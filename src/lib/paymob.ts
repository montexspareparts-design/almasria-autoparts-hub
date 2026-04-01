import { supabase } from "@/integrations/supabase/client";

export const PAYMOB_CALLBACK_PATH = "/payment-callback";
export const PAYMOB_ATTEMPT_SEPARATOR = "--pm--";

export const isValidPaymobPublicKey = (key?: string | null) =>
  Boolean(key && (key.startsWith("egy_pk_") || key.startsWith("pak_pk_")));

export const buildPaymobReturnUrl = () =>
  `${window.location.origin}${PAYMOB_CALLBACK_PATH}`;

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