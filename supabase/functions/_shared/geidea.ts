// Shared Geidea helpers. All credentials come from environment secrets.
// Switching between test and live is a single env var: GEIDEA_ENV.

export type GeideaEnv = "test" | "live";

export const geideaEnv = (): GeideaEnv =>
  (Deno.env.get("GEIDEA_ENV") || "test").toLowerCase() === "live" ? "live" : "test";

export const geideaApiBase = () =>
  // Egypt environment uses the same production endpoint for both test and live;
  // the merchant account/credentials determine the mode. For KSA/UAE, add region-specific branches.
  "https://api.merchant.geidea.net";

export const geideaCheckoutScript = () =>
  "https://www.merchant.geidea.net/hpp/geideaCheckout.min.js";

export const geideaCredentials = () => {
  const publicKey = Deno.env.get("GEIDEA_MERCHANT_PUBLIC_KEY");
  const apiPassword = Deno.env.get("GEIDEA_API_PASSWORD");
  if (!publicKey || !apiPassword) throw new Error("Geidea credentials are not configured");
  return { publicKey, apiPassword };
};

export const geideaBasicAuth = () => {
  const { publicKey, apiPassword } = geideaCredentials();
  return "Basic " + btoa(`${publicKey}:${apiPassword}`);
};

const hmacSha256Base64 = async (data: string, key: string) => {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
};

/** Geidea formats amounts with exactly two decimals in the signature payload. */
export const geideaAmountString = (amount: number) => amount.toFixed(2);

/** Builds the timestamp Geidea expects in the create-session signature. */
export const geideaTimestamp = () => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const h = String(now.getUTCHours()).padStart(2, "0");
  const min = String(now.getUTCMinutes()).padStart(2, "0");
  const s = String(now.getUTCSeconds()).padStart(2, "0");
  return `${y}/${m}/${d} ${h}:${min}:${s}`;
};

/** Create-session signature: Base64(HMAC-SHA256(publicKey + amount + currency + merchantReferenceId + timestamp, apiPassword)). */
export const geideaCreateSessionSignature = async (payload: {
  amount: number;
  currency: string;
  merchantReferenceId?: string | null;
  timestamp?: string | null;
}) => {
  const { publicKey, apiPassword } = geideaCredentials();
  const amountStr = geideaAmountString(payload.amount);
  const currency = payload.currency ?? "";
  const merchantReferenceId = payload.merchantReferenceId ?? "";
  const timestamp = payload.timestamp ?? geideaTimestamp();
  const data = `${publicKey}${amountStr}${currency}${merchantReferenceId}${timestamp}`;
  return hmacSha256Base64(data, apiPassword);
};


/**
 * Verifies a Geidea callback signature server-side.
 * Geidea documents the signature as
 *   Base64(HMAC-SHA256(publicKey + orderId + amount + currency + timestamp, apiPassword))
 * with a variant that also includes the response code. Both are accepted; a
 * callback that matches neither is rejected.
 */
export const verifyGeideaSignature = async (payload: {
  signature?: string | null;
  orderId?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  timestamp?: string | null;
  responseCode?: string | null;
  merchantReferenceId?: string | null;
}) => {
  if (!payload.signature) return false;
  const { publicKey, apiPassword } = geideaCredentials();

  const amountStr = geideaAmountString(Number(payload.amount ?? 0));
  const orderId = payload.orderId ?? "";
  const currency = payload.currency ?? "";
  const timestamp = payload.timestamp ?? "";
  const responseCode = payload.responseCode ?? "";
  const merchantRef = payload.merchantReferenceId ?? "";

  const candidates = [
    `${publicKey}${orderId}${amountStr}${currency}${timestamp}`,
    `${publicKey}${orderId}${responseCode}${amountStr}${currency}${timestamp}`,
    `${publicKey}${orderId}${responseCode}${merchantRef}${amountStr}${currency}${timestamp}`,
  ];

  for (const data of candidates) {
    const computed = await hmacSha256Base64(data, apiPassword);
    if (computed === payload.signature) return true;
  }
  return false;
};
