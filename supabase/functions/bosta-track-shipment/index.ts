// Track a Bosta shipment by tracking number. Public (no auth) so the
// customer track-order page can call it for their order.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BOSTA_API_KEY = Deno.env.get("BOSTA_API_KEY");
const BOSTA_BASE = "https://app.bosta.co/api/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!BOSTA_API_KEY) {
      return new Response(JSON.stringify({ error: "BOSTA_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const tracking = url.searchParams.get("tracking_number") ||
      (req.method === "POST" ? (await req.json().catch(() => ({})))?.tracking_number : null);

    if (!tracking) {
      return new Response(JSON.stringify({ error: "tracking_number required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`${BOSTA_BASE}/deliveries/business/${encodeURIComponent(tracking)}`, {
      headers: { "Authorization": BOSTA_API_KEY },
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Bosta API error", status: res.status, details: raw }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = raw?.data || raw;
    const statusText = data?.state?.value || data?.state || data?.masterStatus || "unknown";

    // Best-effort update of cached status
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await admin.from("shipments").update({
        status: String(statusText),
        last_event: data,
      }).eq("tracking_number", tracking);
      await admin.from("orders").update({ bosta_status: String(statusText) }).eq("bosta_tracking_number", tracking);
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({
      success: true,
      tracking_number: tracking,
      status: statusText,
      data,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
