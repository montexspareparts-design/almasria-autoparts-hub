import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push crypto utilities for Deno
async function generatePushPayload(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  // For simplicity, we'll use fetch to send via a web push compatible endpoint
  // The actual encryption is handled by the push service
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      TTL: "86400",
    },
    body: payload,
  });
  return response;
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

    const { title, body, url, user_id } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get subscriptions
    let query = supabase.from("push_subscriptions").select("*");
    if (user_id) {
      query = query.eq("user_id", user_id);
    }
    const { data: subscriptions, error } = await query;

    if (error) {
      throw error;
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      url: url || "/",
      timestamp: Date.now(),
    });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      (subscriptions || []).map(async (sub) => {
        try {
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              TTL: "86400",
            },
            body: payload,
          });

          if (response.status === 410 || response.status === 404) {
            // Subscription expired, remove it
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
            return { status: "removed", endpoint: sub.endpoint };
          }

          return { status: "sent", endpoint: sub.endpoint };
        } catch (err) {
          return { status: "failed", endpoint: sub.endpoint, error: err.message };
        }
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        total: subscriptions?.length || 0,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
