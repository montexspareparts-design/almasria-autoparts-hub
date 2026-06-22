// Calculate Bosta shipping fees for a given destination city.
// Public (no auth) — used by checkout.
// Tries multiple Bosta pricing endpoints. Falls back to a static governorate
// rate table when Bosta's API is unavailable so checkout never blocks.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BOSTA_API_KEY = Deno.env.get("BOSTA_API_KEY");
const BOSTA_BASE = "https://app.bosta.co/api/v2";

// Static fallback (EGP) — kept conservative & realistic; used only if Bosta
// pricing API is unreachable/unsupported for this account.
const FALLBACK_FEES: Record<string, number> = {
  Cairo: 60, Giza: 60, Alexandria: 75, Qalyubia: 70, Sharqia: 80,
  Dakahlia: 85, Gharbia: 80, Monufia: 80, Beheira: 85, "Kafr El Sheikh": 90,
  Damietta: 90, "Port Said": 90, Ismailia: 85, Suez: 85, "North Coast": 110,
  Matrouh: 130, "Red Sea": 130, "South Sinai": 140, "North Sinai": 140,
  Fayoum: 90, "Beni Suef": 95, Minya: 100, Assiut: 110, Sohag: 120,
  Qena: 130, Luxor: 140, Aswan: 150, "New Valley": 160,
};
const DEFAULT_FALLBACK = 90;

async function tryFetch(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BOSTA_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": BOSTA_API_KEY! },
    body: JSON.stringify(body),
  });
  const raw = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, raw };
}

function extractFee(raw: any): number | null {
  return raw?.data?.shipmentFees ?? raw?.data?.priceBeforeVat ?? raw?.data?.price
    ?? raw?.shipmentFees ?? raw?.price ?? raw?.data?.total ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { dropOffCity, pickupCity = "Cairo", cod = 0, size = "Normal", type = 10 } = body || {};

    if (!dropOffCity) {
      return new Response(JSON.stringify({ error: "dropOffCity required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fee: number | null = null;
    let lastError: any = null;

    if (BOSTA_API_KEY) {
      const attempts = [
        { path: "/pricing/shipment-fees", body: { dropOffCity, pickupCity, cod, size, type } },
        { path: "/pricing/calculator",   body: { dropOffCity, pickupCity, cod, size, type } },
        { path: "/pricing/shipment",     body: { dropOffCity, pickupCity, cod, size, type } },
        { path: "/deliveries/pricing",   body: { dropOffCity, pickupCity, cod, size, type } },
      ];
      for (const a of attempts) {
        try {
          const r = await tryFetch(a.path, a.body);
          if (r.ok) { fee = extractFee(r.raw); if (fee != null) break; }
          else lastError = { path: a.path, status: r.status, details: r.raw };
        } catch (e) { lastError = String(e); }
      }
    }

    let source: "bosta" | "fallback" = "bosta";
    if (fee == null) {
      source = "fallback";
      fee = FALLBACK_FEES[dropOffCity] ?? DEFAULT_FALLBACK;
    }

    return new Response(JSON.stringify({ success: true, fee, source, lastError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
