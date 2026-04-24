import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Web Push imports
import * as jose from "https://deno.land/x/jose@v5.2.2/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "تم استلام الطلب",
  confirmed: "تمت الموافقة على طلبك",
  awaiting_payment: "طلبك بانتظار الدفع",
  processing: "جاري تجهيز طلبك",
  ready: "طلبك جاهز للاستلام",
  shipped: "تم شحن طلبك",
  delivered: "تم تسليم طلبك بنجاح ✅",
  cancelled: "تم إلغاء الطلب",
};

/** Convert VAPID key from URL-safe base64 to Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Send a Web Push notification using VAPID */
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  // For proper Web Push with VAPID, we need to use the web-push protocol
  // Using a simplified approach: POST with proper headers
  const endpoint = new URL(subscription.endpoint);
  
  // Create VAPID JWT
  const vapidJwt = await createVapidJwt(endpoint.origin, vapidPublicKey, vapidPrivateKey);
  
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Urgency: "high",
      Authorization: `vapid t=${vapidJwt}, k=${vapidPublicKey}`,
    },
    body: payload,
  });

  return response;
}

async function createVapidJwt(audience: string, publicKey: string, privateKey: string): Promise<string> {
  try {
    // Import the private key for signing
    const privateKeyData = urlBase64ToUint8Array(privateKey);
    
    const header = { typ: "JWT", alg: "ES256" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      aud: audience,
      exp: now + 12 * 60 * 60, // 12 hours
      sub: "mailto:info@almasria-group.com",
    };

    // Base64url encode
    const encodeBase64Url = (data: string) => {
      return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    };

    const headerB64 = encodeBase64Url(JSON.stringify(header));
    const payloadB64 = encodeBase64Url(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;

    // Import key and sign
    const key = await crypto.subtle.importKey(
      "raw",
      privateKeyData.buffer.slice(privateKeyData.byteOffset, privateKeyData.byteOffset + privateKeyData.byteLength) as ArrayBuffer,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(signingInput)
    );

    const sigB64 = encodeBase64Url(String.fromCharCode(...new Uint8Array(signature)));
    return `${headerB64}.${payloadB64}.${sigB64}`;
  } catch (e) {
    console.error("VAPID JWT creation failed:", e);
    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";

    const body = await req.json();

    // Support both direct calls and database webhook triggers
    let orderId: string;
    let newStatus: string;
    let orderNumber: string | undefined;
    let userId: string | undefined;

    if (body.type === "UPDATE" && body.table === "orders" && body.record) {
      // Database webhook trigger
      const oldRecord = body.old_record;
      const newRecord = body.record;
      
      // Only proceed if status actually changed
      if (oldRecord?.status === newRecord.status) {
        return new Response(JSON.stringify({ skipped: true, reason: "status unchanged" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      orderId = newRecord.id;
      newStatus = newRecord.status;
      orderNumber = newRecord.order_number;
      userId = newRecord.user_id;
    } else {
      // Direct call
      orderId = body.order_id;
      newStatus = body.new_status;
      orderNumber = body.order_number;
      userId = body.user_id;
    }

    if (!orderId || !newStatus) {
      return new Response(
        JSON.stringify({ error: "order_id and new_status are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order details if missing
    if (!orderNumber || !userId) {
      const { data: order } = await supabase
        .from("orders")
        .select("order_number, user_id, erp_order_code")
        .eq("id", orderId)
        .single();
      
      if (!order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      orderNumber = order.order_number;
      userId = order.user_id;
    }

    // Get push subscriptions for this user
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "no subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusLabel = STATUS_LABELS[newStatus] || `حالة الطلب: ${newStatus}`;
    const title = `طلب #${orderNumber}`;
    const pushBody = statusLabel;
    const url = "/dealer";

    const payload = JSON.stringify({
      title,
      body: pushBody,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      url,
      tag: `order-${orderId}`,
      timestamp: Date.now(),
    });

    // Also create an in-app notification
    await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message: pushBody,
      type: "order_update",
    });

    // Send push to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              TTL: "86400",
              Urgency: "high",
            },
            body: payload,
          });

          if (response.status === 410 || response.status === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            return { status: "expired", endpoint: sub.endpoint };
          }

          if (!response.ok) {
            return { status: "failed", code: response.status, endpoint: sub.endpoint };
          }

          return { status: "sent", endpoint: sub.endpoint };
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          return { status: "error", endpoint: sub.endpoint, error: errMsg };
        }
      })
    );

    console.log(`Push sent for order ${orderNumber} → status ${newStatus}:`, results);

    return new Response(
      JSON.stringify({ success: true, sent: subscriptions.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Push notification error:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
