// Webhook receiver for Bosta status updates. Public, no JWT verification.
// Configure this URL in Bosta dashboard: <project>/functions/v1/bosta-webhook
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const WEBHOOK_SECRET = Deno.env.get("BOSTA_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Verify Bosta webhook secret. Bosta sends it in one of these headers/fields.
    if (WEBHOOK_SECRET) {
      const provided =
        req.headers.get("x-bosta-signature") ||
        req.headers.get("x-webhook-secret") ||
        req.headers.get("authorization") ||
        req.headers.get("x-api-key") ||
        new URL(req.url).searchParams.get("secret");
      const cleaned = (provided || "").replace(/^Bearer\s+/i, "").trim();
      if (cleaned !== WEBHOOK_SECRET) {
        console.warn("bosta-webhook: invalid secret", { provided: cleaned ? "***" : "(none)" });
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json().catch(() => ({}));
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const trackingNumber =
      payload?.trackingNumber || payload?.tracking_number ||
      payload?.delivery?.trackingNumber || payload?.data?.trackingNumber || null;
    const deliveryId =
      payload?._id || payload?.deliveryId || payload?.delivery?._id || payload?.data?._id || null;
    const eventType = payload?.event || payload?.type || payload?.state?.value || "update";
    const statusText =
      payload?.state?.value || payload?.masterStatus || payload?.status || payload?.data?.state?.value || "update";

    // Log raw event
    const { data: logged } = await admin.from("bosta_webhook_events").insert({
      event_type: eventType,
      tracking_number: trackingNumber,
      delivery_id: deliveryId,
      payload,
    }).select("id").maybeSingle();

    try {
      if (trackingNumber) {
        await admin.from("shipments").update({
          status: String(statusText),
          last_event: payload,
        }).eq("tracking_number", trackingNumber);

        await admin.from("orders").update({
          bosta_status: String(statusText),
        }).eq("bosta_tracking_number", trackingNumber);
      }
      if (logged?.id) {
        await admin.from("bosta_webhook_events").update({ processed: true }).eq("id", logged.id);
      }
    } catch (innerErr) {
      console.error("processing error", innerErr);
      if (logged?.id) {
        await admin.from("bosta_webhook_events").update({ error: String(innerErr) }).eq("id", logged.id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bosta-webhook error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
