// Sends Web Push notifications to ALL staff (admins + moderators) for new support requests
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function createVapidJwt(audience: string, _publicKey: string, privateKey: string): Promise<string> {
  const privateKeyData = urlBase64ToUint8Array(privateKey);
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: "mailto:info@almasria-group.com",
  };
  const encodeBase64Url = (data: string) =>
    btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const headerB64 = encodeBase64Url(JSON.stringify(header));
  const payloadB64 = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    privateKeyData.buffer.slice(privateKeyData.byteOffset, privateKeyData.byteOffset + privateKeyData.byteLength) as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  );
  const sigB64 = encodeBase64Url(String.fromCharCode(...new Uint8Array(signature)));
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";

    const body = await req.json();
    const {
      title = "🔔 طلب جديد",
      message = "طلب دعم جديد",
      url = "/admin?section=daily-dashboard",
      tag = `staff-${Date.now()}`,
    } = body || {};

    // Get all staff user IDs
    const { data: staffRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "moderator"]);

    if (!staffRoles || staffRoles.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "no staff" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const staffUserIds = staffRoles.map((r: any) => r.user_id);

    // Get push subscriptions for all staff
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", staffUserIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "no staff subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      url,
      tag,
      timestamp: Date.now(),
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          const endpoint = new URL(sub.endpoint);
          const vapidJwt = await createVapidJwt(endpoint.origin, vapidPublicKey, vapidPrivateKey);

          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              TTL: "86400",
              Urgency: "high",
              Authorization: `vapid t=${vapidJwt}, k=${vapidPublicKey}`,
            },
            body: payload,
          });

          if (response.status === 410 || response.status === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            return { status: "expired", endpoint: sub.endpoint };
          }
          if (!response.ok) {
            return { status: "failed", code: response.status };
          }
          return { status: "sent" };
        } catch (err) {
          return { status: "error", error: String(err) };
        }
      }),
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).status === "sent",
    ).length;

    console.log(`Staff push: ${sent}/${subscriptions.length} delivered`);

    return new Response(
      JSON.stringify({ success: true, sent, total: subscriptions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("notify-staff-push error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
