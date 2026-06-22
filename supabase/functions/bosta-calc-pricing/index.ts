// Calculate Bosta shipping fees for a given destination city.
// Public (no auth) — used by checkout.
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

    const body = await req.json().catch(() => ({}));
    const { dropOffCity, pickupCity, cod = 0, size = "Normal", type = 10 } = body || {};

    if (!dropOffCity) {
      return new Response(JSON.stringify({ error: "dropOffCity required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`${BOSTA_BASE}/pricing/shipment-fees`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": BOSTA_API_KEY },
      body: JSON.stringify({ dropOffCity, pickupCity, cod, size, type }),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Bosta pricing error", status: res.status, details: raw }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fee = raw?.data?.shipmentFees ?? raw?.data?.priceBeforeVat ?? raw?.shipmentFees ?? null;

    return new Response(JSON.stringify({ success: true, fee, raw }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
