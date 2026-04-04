import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Toyota model code mapping (positions 4-8 of VIN)
const toyotaModelMap: Record<string, string> = {
  // Corolla variants
  "ZRE15": "Corolla", "ZRE17": "Corolla", "ZRE18": "Corolla",
  "NRE18": "Corolla", "ZWE21": "Corolla", "MZEA1": "Corolla",
  "NRE21": "Corolla",
  // Camry variants
  "ASV50": "Camry", "ASV70": "Camry", "GSV50": "Camry",
  "GSV70": "Camry", "AXVA7": "Camry", "AXVH7": "Camry",
  // Yaris
  "NSP15": "Yaris", "NHP13": "Yaris", "KSP13": "Yaris",
  "MXPA1": "Yaris", "MXPH1": "Yaris",
  // Hilux
  "GUN12": "Hilux", "GUN13": "Hilux", "GUN12": "Hilux",
  "TGN12": "Hilux", "KUN25": "Hilux", "KUN26": "Hilux",
  // Land Cruiser
  "GRJ20": "Land Cruiser", "URJ20": "Land Cruiser",
  "VDJ20": "Land Cruiser", "GRJ15": "Land Cruiser Prado",
  "TRJ15": "Land Cruiser Prado", "GDJ15": "Land Cruiser Prado",
  // Fortuner
  "GUN15": "Fortuner", "TGN15": "Fortuner", "GUN16": "Fortuner",
  // RAV4
  "ASA44": "RAV4", "AXAH5": "RAV4", "MXAA5": "RAV4",
  // Avalon
  "GSX40": "Avalon", "GSX50": "Avalon",
  // Rush
  "F800R": "Rush",
  // Hiace
  "TRH22": "Hiace", "KDH20": "Hiace", "GDH30": "Hiace",
  // Coaster
  "HDB51": "Coaster", "XZB70": "Coaster",
};

// Arabic model name mapping
const modelArabicMap: Record<string, string> = {
  "Corolla": "كورولا",
  "Camry": "كامري",
  "Yaris": "ياريس",
  "Hilux": "هايلكس",
  "Land Cruiser": "لاندكروزر",
  "Land Cruiser Prado": "برادو",
  "Fortuner": "فورتشنر",
  "RAV4": "راف فور",
  "Avalon": "افالون",
  "Rush": "راش",
  "Hiace": "هاي اس",
  "Coaster": "كوستر",
};

function decodeVIN(vin: string) {
  const upperVin = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
  
  if (upperVin.length !== 17) {
    return { valid: false, error: "VIN must be exactly 17 characters" };
  }

  // Extract year from position 10
  const yearChar = upperVin[9];
  const yearMap: Record<string, number> = {
    "A": 2010, "B": 2011, "C": 2012, "D": 2013, "E": 2014,
    "F": 2015, "G": 2016, "H": 2017, "J": 2018, "K": 2019,
    "L": 2020, "M": 2021, "N": 2022, "P": 2023, "R": 2024,
    "S": 2025, "T": 2026, "V": 2027, "W": 2028, "X": 2029,
    "Y": 2030, "1": 2031, "2": 2032, "3": 2033,
  };
  const year = yearMap[yearChar] || null;

  // Check if it's a Toyota (starts with JT, MR0, or specific WMI codes)
  const isToyota = upperVin.startsWith("JT") || upperVin.startsWith("MR0") || 
                   upperVin.startsWith("SB1") || upperVin.startsWith("AHT");

  // Try to identify model from positions 4-8
  let model: string | null = null;
  const modelCode5 = upperVin.substring(3, 8);
  const modelCode4 = upperVin.substring(3, 7);
  
  for (const [code, name] of Object.entries(toyotaModelMap)) {
    if (modelCode5.startsWith(code) || modelCode4.startsWith(code.substring(0, 4))) {
      model = name;
      break;
    }
  }

  return {
    valid: true,
    vin: upperVin,
    is_toyota: isToyota,
    year,
    model,
    model_ar: model ? modelArabicMap[model] || model : null,
    manufacturer: isToyota ? "Toyota" : "Unknown",
    plant_code: upperVin[10],
    serial: upperVin.substring(11),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vin } = await req.json();
    
    if (!vin || typeof vin !== "string") {
      return new Response(
        JSON.stringify({ error: "VIN is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const decoded = decodeVIN(vin);
    
    if (!decoded.valid) {
      return new Response(
        JSON.stringify({ error: decoded.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search for compatible products
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    let products: any[] = [];

    if (decoded.model) {
      // Search by compatible_models containing the model name
      const modelSearchTerms = [decoded.model];
      if (decoded.model_ar) modelSearchTerms.push(decoded.model_ar);

      for (const term of modelSearchTerms) {
        const { data } = await sb
          .from("products")
          .select("id, name_ar, name_en, sku, image_url, base_price, brand, stock_quantity, compatible_models, category_id, year_from, year_to")
          .eq("is_active", true)
          .contains("compatible_models", [term])
          .limit(50);

        if (data) {
          for (const p of data) {
            if (!products.find(ep => ep.id === p.id)) {
              // Filter by year if available
              if (decoded.year && p.year_from && p.year_to) {
                if (decoded.year >= p.year_from && decoded.year <= p.year_to) {
                  products.push(p);
                }
              } else {
                products.push(p);
              }
            }
          }
        }
      }

      // Also search by name containing the model
      if (products.length < 10 && decoded.model_ar) {
        const { data } = await sb
          .from("products")
          .select("id, name_ar, name_en, sku, image_url, base_price, brand, stock_quantity, compatible_models, category_id")
          .eq("is_active", true)
          .ilike("name_ar", `%${decoded.model_ar}%`)
          .limit(30);

        if (data) {
          for (const p of data) {
            if (!products.find(ep => ep.id === p.id)) {
              products.push(p);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        decoded,
        products: products.slice(0, 50),
        total_found: products.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("decode-vin error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
