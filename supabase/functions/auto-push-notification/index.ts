import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "VAPID keys not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    webpush.setVapidDetails(
      "mailto:info@almasria-group.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // This function receives the notification record from a database webhook or direct call
    const body = await req.json();
    
    // Support both webhook format { record: {...} } and direct format
    const record = body.record || body;

    if (!record.user_id || !record.title) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notifType = record.type || "info";
    const isOrder = notifType === "order" || notifType === "order_edit";

    // Determine URL based on type
    let url = "/dealer?tab=notifications";
    if (notifType === "order" || notifType === "order_edit") url = "/dealer?tab=orders";
    else if (notifType === "price_list") url = "/dealer?tab=price_lists";
    else if (notifType === "offer") url = "/dealer?tab=offers";
    else if (notifType === "stock_alert") url = "/dealer?tab=stock_alerts";

    // Check if user is admin — route differently
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", record.user_id)
      .eq("role", "admin");

    if (roles && roles.length > 0) {
      // Admin routes
      if (notifType === "order") url = "/admin?section=orders";
      else if (notifType === "dealer_application") url = "/admin?section=dealers";
      else url = "/admin";
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", record.user_id);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "no_subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title: record.title,
      body: record.message,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      url,
      tag: notifType,
      priority: isOrder ? "high" : "normal",
      timestamp: Date.now(),
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 86400, urgency: isOrder ? "high" : "normal", topic: notifType }
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        console.error("Push error:", err.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Auto-push error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
