import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// APNs (Apple Push Notification service) — ES256 JWT + HTTP/2 push
// ============================================================================

const APNS_HOST = (Deno.env.get("APNS_ENV") || "production") === "production"
  ? "https://api.push.apple.com"
  : "https://api.sandbox.push.apple.com";

let cachedJwt: { token: string; issuedAt: number } | null = null;

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToBinaryDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function importApnsKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("APNS_PRIVATE_KEY");
  if (!raw) throw new Error("APNS_PRIVATE_KEY not configured");
  const der = pemToBinaryDer(raw);
  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function getApnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  // Apple rejects tokens older than ~1h; refresh every 45min
  if (cachedJwt && now - cachedJwt.issuedAt < 45 * 60) return cachedJwt.token;

  const kid = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  if (!kid || !teamId) throw new Error("APNS_KEY_ID / APNS_TEAM_ID not configured");

  const header = { alg: "ES256", kid, typ: "JWT" };
  const claims = { iss: teamId, iat: now };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;

  const key = await importApnsKey();
  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    key,
    new TextEncoder().encode(signingInput),
  ));

  const token = `${signingInput}.${base64UrlEncode(sig)}`;
  cachedJwt = { token, issuedAt: now };
  return token;
}

async function sendApnsPush(token: string, payload: {
  title: string;
  body: string;
  url?: string;
}): Promise<{ ok: boolean; status: number; reason?: string }> {
  try {
    const jwt = await getApnsJwt();
    const bundleId = Deno.env.get("APNS_BUNDLE_ID") || "com.almasria.autoparts";

    const body = {
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: "default",
        "mutable-content": 1,
      },
      url: payload.url || "/",
    };

    const res = await fetch(`${APNS_HOST}/3/device/${token}`, {
      method: "POST",
      headers: {
        "authorization": `bearer ${jwt}`,
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) return { ok: true, status: res.status };
    const text = await res.text().catch(() => "");
    let reason: string | undefined;
    try { reason = JSON.parse(text)?.reason; } catch { reason = text; }
    return { ok: false, status: res.status, reason };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, reason: msg };
  }
}

// ============================================================================
// Main handler
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Admin Authentication Check ─────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden — admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ─── End Auth Check ─────────────────────────────────────────────────

    const { title, body, url, user_id } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── WEB PUSH (VAPID / push_subscriptions) ─────────────────────────
    let webQuery = supabase.from("push_subscriptions").select("*");
    if (user_id) webQuery = webQuery.eq("user_id", user_id);
    const { data: subscriptions } = await webQuery;

    const payload = JSON.stringify({
      title,
      body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      url: url || "/",
      timestamp: Date.now(),
    });

    const webResults = await Promise.allSettled(
      (subscriptions || []).map(async (sub) => {
        try {
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", TTL: "86400" },
            body: payload,
          });
          if (response.status === 410 || response.status === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            return { channel: "web", status: "removed", endpoint: sub.endpoint };
          }
          return { channel: "web", status: "sent", endpoint: sub.endpoint };
        } catch (err) {
          return { channel: "web", status: "failed", error: String(err) };
        }
      })
    );

    // ─── APNs PUSH (iOS device_tokens) ────────────────────────────────
    let iosResults: unknown[] = [];
    const hasApnsKey = !!Deno.env.get("APNS_PRIVATE_KEY");
    if (hasApnsKey) {
      let iosQuery = supabase.from("device_tokens").select("*").eq("platform", "ios");
      if (user_id) iosQuery = iosQuery.eq("user_id", user_id);
      const { data: iosTokens } = await iosQuery;

      iosResults = await Promise.all(
        (iosTokens || []).map(async (row) => {
          const r = await sendApnsPush(row.token, { title, body, url });
          // Invalid tokens → clean up
          if (!r.ok && (r.status === 410 || r.reason === "BadDeviceToken" || r.reason === "Unregistered")) {
            await supabase.from("device_tokens").delete().eq("id", row.id);
            return { channel: "ios", status: "removed", reason: r.reason };
          }
          return { channel: "ios", status: r.ok ? "sent" : "failed", reason: r.reason, http: r.status };
        })
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        web_total: subscriptions?.length || 0,
        ios_total: iosResults.length,
        apns_configured: hasApnsKey,
        web_results: webResults,
        ios_results: iosResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[send-push] error:", errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
