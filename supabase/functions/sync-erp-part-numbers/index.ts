// Bulk-sync part numbers from official ERP excel into erp_full_catalog_cache + products
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Row {
  erp_id: string;
  part_number: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { rows } = (await req.json()) as { rows: Row[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "rows required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Update erp_full_catalog_cache by erp_id
    let cacheUpdated = 0;
    let productsUpdated = 0;
    const CHUNK = 500;

    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = rows.slice(i, i + CHUNK);

      // Build a temp values list and use rpc-like approach via raw upsert is not possible.
      // Use parallel updates per chunk via a single SQL through postgres function.
      const ids = batch.map((r) => r.erp_id);
      const pns = batch.map((r) => r.part_number);

      const { data, error } = await sb.rpc("apply_erp_part_numbers", {
        p_erp_ids: ids,
        p_part_numbers: pns,
      });
      if (error) throw error;
      cacheUpdated += (data?.[0]?.cache_updated as number) ?? 0;
      productsUpdated += (data?.[0]?.products_updated as number) ?? 0;
    }

    return new Response(
      JSON.stringify({ ok: true, total: rows.length, cacheUpdated, productsUpdated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
