// Shared Geidea helpers. All credentials come from environment secrets.
// Switching between test and live is a single env var: GEIDEA_ENV.

export type GeideaEnv = "test" | "live";

export const geideaEnv = (): GeideaEnv =>
  (Deno.env.get("GEIDEA_ENV") || "test").toLowerCase() === "live" ? "live" : "test";

export const geideaApiBase = () =>
  geideaEnv() === "live"
    ? "https://api.merchant.geidea.net"
    : "https://api-merchant.staging.geidea.net";

export const geideaCheckoutScript = () =>
  geideaEnv() === "live"
    ? "https://www.merchant.geidea.net/hpp/geideaCheckout.min.js"
    : "https://www.merchant.staging.geidea.net/hpp/geideaCheckout.min.js";

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
