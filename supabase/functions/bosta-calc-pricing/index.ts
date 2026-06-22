// Calculate Bosta shipping fees for a given destination city.
// Public (no auth) — used by checkout.
// Uses the official Bosta Pricing Annex (1.5A) zone-based rate card.
// Tries Bosta's live pricing API first; falls back to the contractual rate
// card so checkout never blocks.
//
// Rate card (Forward Delivery, EGP, before VAT) — Pickup from Zone 1:
//   Z1 Cairo & Giza .................. 85
//   Z2 Alexandria + suburbs .......... 92
//   Z3 Delta & Canal ................. 99
//   Z4 Fayoum/BeniSuef/Minya/Asyut/Sohag 114
//   Z5 Qena/Luxor/Aswan/RedSea/Matrouh 131
//   Z6 North Coast ................... 135
//   Z7 Sharm El Sheikh / New Valley .. 151
// + 14% VAT
// + COD fee: 1% of amount exceeding 2000 EGP
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BOSTA_API_KEY = Deno.env.get("BOSTA_API_KEY");
const BOSTA_BASE = "https://app.bosta.co/api/v2";
const VAT_RATE = 0.14;

// Forward Delivery base price per zone (EGP, before VAT)
const ZONE_BASE: Record<number, number> = {
  1: 85, 2: 92, 3: 99, 4: 114, 5: 131, 6: 135, 7: 151,
};

// Map governorate (English name as used by checkout) → Bosta zone
const CITY_TO_ZONE: Record<string, number> = {
  // Zone 1
  Cairo: 1, Giza: 1,
  // Zone 2
  Alexandria: 2,
  // Zone 3 — Delta & Canal
  Qalyubia: 3, Monufia: 3, Sharqia: 3, Gharbia: 3, Dakahlia: 3,
  Beheira: 3, Damietta: 3, "Kafr El Sheikh": 3, "Port Said": 3,
  Ismailia: 3, Suez: 3,
  // Zone 4
  Fayoum: 4, "Beni Suef": 4, Minya: 4, Assiut: 4, Sohag: 4,
  // Zone 5
  Qena: 5, Luxor: 5, Aswan: 5, "Red Sea": 5, Matrouh: 5,
  // Zone 6
  "North Coast": 6,
  // Zone 7
  "South Sinai": 7, "North Sinai": 7, "New Valley": 7,
};

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

function calcCodFee(cod: number): number {
  if (!cod || cod <= 2000) return 0;
  return Math.round((cod - 2000) * 0.01);
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

    let source: "bosta" | "rate_card" = "bosta";
    let zone: number | null = null;
    let baseFee = 0;
    let vat = 0;
    let codFee = 0;

    if (fee == null) {
      source = "rate_card";
      zone = CITY_TO_ZONE[dropOffCity] ?? 3; // default to Delta zone if unknown
      baseFee = ZONE_BASE[zone];
      vat = Math.round(baseFee * VAT_RATE);
      codFee = calcCodFee(Number(cod) || 0);
      fee = baseFee + vat + codFee;
    }

    return new Response(JSON.stringify({
      success: true, fee, source, zone, baseFee, vat, codFee, lastError,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
