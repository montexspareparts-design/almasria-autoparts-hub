// Add a single product from erp_full_catalog_cache into public.products
// Then optionally trigger image discovery for it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check — must be staff
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isStaff } = await userClient.rpc("is_staff", { _user_id: user.id });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden: staff only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const erpId = String(body?.erp_id ?? "").trim();
    const triggerImageDiscovery = body?.trigger_image_discovery !== false; // default true
    const brandHint = (body?.brand ?? "toyota_genuine") as string;

    if (!erpId) {
      return new Response(JSON.stringify({ error: "erp_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) Look up ERP cache row
    const { data: cacheRow, error: cacheErr } = await admin
      .from("erp_full_catalog_cache")
      .select("erp_id, name, qty, retail_price, wholesale_price")
      .eq("erp_id", erpId)
      .maybeSingle();

    if (cacheErr || !cacheRow) {
      return new Response(JSON.stringify({ error: "Item not found in ERP cache", details: cacheErr?.message }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Check if already exists
    const { data: existing } = await admin
      .from("products")
      .select("id, is_active")
      .or(`sku.eq.${erpId},erp_item_code.eq.${erpId}`)
      .maybeSingle();

    let productId: string | null = null;
    let action: "inserted" | "reactivated" | "already_active" = "inserted";

    if (existing) {
      productId = existing.id;
      if (!existing.is_active) {
        const { error: updErr } = await admin
          .from("products")
          .update({
            is_active: true,
            stock_quantity: cacheRow.qty ?? 0,
            base_price: (cacheRow.retail_price ?? 0) > 0 ? cacheRow.retail_price : undefined,
            name_ar: cacheRow.name,
          } as any)
          .eq("id", existing.id);
        if (updErr) throw updErr;
        action = "reactivated";
      } else {
        action = "already_active";
      }
    } else {
      // 3) Insert new product
      const { data: inserted, error: insErr } = await admin
        .from("products")
        .insert({
          sku: erpId,
          erp_item_code: erpId,
          name_ar: cacheRow.name,
          base_price: (cacheRow.retail_price ?? 0) > 0 ? cacheRow.retail_price : 0,
          stock_quantity: cacheRow.qty ?? 0,
          brand: brandHint,
          is_active: true,
          is_featured: false,
        } as any)
        .select("id")
        .single();

      if (insErr) throw insErr;
      productId = inserted.id;

      // Wholesale tier price
      if ((cacheRow.wholesale_price ?? 0) > 0) {
        await admin.from("product_tier_prices").insert({
          product_id: productId,
          tier: "wholesale_tier1",
          price: cacheRow.wholesale_price,
        } as any);
      }
    }

    // 4) Fire-and-forget: image discovery for this single SKU
    let imageDiscoveryQueued = false;
    if (triggerImageDiscovery && productId && action !== "already_active") {
      try {
        // Use waitUntil-style background fetch (best-effort)
        admin.functions.invoke("match-product-images-by-vision", {
          body: { dryRun: false, limit: 5, onlyUnassigned: true, sku: erpId },
        }).catch(() => {});
        imageDiscoveryQueued = true;
      } catch (_) {
        imageDiscoveryQueued = false;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      product_id: productId,
      action,
      image_discovery_queued: imageDiscoveryQueued,
      item: cacheRow,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
