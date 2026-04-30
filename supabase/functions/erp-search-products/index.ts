// Edge function: erp-search-products
// Fetches the FULL Faisal ERP catalog (~12k items) and caches it in DB for 1 hour.
// Used by staff to search for items not in our 422-item curated catalog
// when reporting stock shortages.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedToken: string | null = null;
let tokenExpiry = 0;

function isValidJwt(s: string | null): boolean {
  if (!s) return false;
  const t = s.trim();
  // Reject HTML/error pages and ensure JWT-like 3-part dot-separated structure
  if (t.startsWith("<") || /<\/?html|<!doctype/i.test(t)) return false;
  const parts = t.split(".");
  if (parts.length < 2) return false;
  // Header chars must be safe for HTTP header value (no CR/LF, no spaces inside)
  if (/[\r\n\s]/.test(t)) return false;
  return t.length > 40 && t.length < 4096;
}

async function getErpToken(baseUrl: string): Promise<string> {
  if (cachedToken && isValidJwt(cachedToken) && Date.now() < tokenExpiry - 300_000) return cachedToken;
  // Invalidate any previously bad cached value
  cachedToken = null;

  const username = Deno.env.get("ERP_FAISAL_USERNAME");
  const password = Deno.env.get("ERP_FAISAL_PASSWORD");
  if (!username || !password) throw new Error("ERP credentials not configured");

  const res = await fetch(`${baseUrl}/Ecommerce/Authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const text = await res.text();
  let jwt: string | null = null;
  try {
    const data = JSON.parse(text);
    if (typeof data === "string") jwt = data;
    else jwt = data.JwtToken || data.jwtToken || data.token || data.access_token || null;
  } catch {
    const trimmed = text.trim().replace(/^"|"$/g, "");
    if (isValidJwt(trimmed)) jwt = trimmed;
  }
  if (!res.ok || !isValidJwt(jwt)) {
    throw new Error(`ERP auth failed [${res.status}] at ${baseUrl}: ${text.substring(0, 200)}`);
  }
  cachedToken = jwt;
  tokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
  return cachedToken!;
}

async function refreshCacheFromErp(supabase: any, baseUrl: string): Promise<{ total: number }> {
  const token = await getErpToken(baseUrl);
  const res = await fetch(`${baseUrl}/Ecommerce/products`, {
    method: "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ERP /products failed [${res.status}]: ${text.substring(0, 200)}`);
  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error("ERP returned non-JSON"); }
  const list: any[] = Array.isArray(data) ? data : (data.data || data.items || []);

  // Map to cache rows
  const rows = list
    .map((p) => {
      const erp_id = String(p.id ?? p.code ?? "").trim();
      const name = String(p.name ?? p.itemName ?? p.description ?? "").trim();
      if (!erp_id || !name) return null;
      return {
        erp_id,
        name,
        qty: Math.floor(Number(p.qty ?? p.quantity ?? 0)),
        retail_price: Number(p.retailPrice ?? p.price ?? 0) || null,
        wholesale_price: Number(p.wholesaleprice ?? p.wholesalePrice ?? 0) || null,
        fetched_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (rows.length === 0) throw new Error("ERP returned 0 items — refusing to clear cache");

  // Upsert in batches of 500 to avoid payload limits
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("erp_full_catalog_cache")
      .upsert(slice, { onConflict: "erp_id" });
    if (error) throw new Error(`Cache upsert failed: ${error.message}`);
  }

  // Update meta
  await supabase
    .from("erp_full_catalog_meta")
    .update({ last_synced_at: new Date().toISOString(), total_items: rows.length, last_error: null })
    .eq("id", 1);

  return { total: rows.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Service client for cache ops + staff check
    const admin = createClient(supabaseUrl, serviceKey);

    // Verify staff role (admin/moderator/reporter)
    const { data: isStaff, error: staffErr } = await admin.rpc("is_staff", { _user_id: userId });
    if (staffErr || !isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden — staff only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const query: string = String(body.q ?? body.query ?? "").trim();
    const forceRefresh: boolean = !!body.refresh;
    const healthOnly: boolean = !!body.health;
    const compareSample: boolean = !!body.compareSample;
    const applyStockSync: boolean = !!body.applyStockSync;
    const sampleSize: number = Math.min(50, Math.max(1, Number(body.sampleSize) || 5));
    const sampleProductIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];

    // Read base URL from erp_config (single source of truth across all ERP edge functions)
    const { data: cfgRow } = await admin
      .from("erp_config")
      .select("value")
      .eq("key", "erp_base_url")
      .maybeSingle();
    let baseUrl = (cfgRow?.value || Deno.env.get("ERP_FAISAL_BASE_URL") || "https://api.alfaysalerp.com").trim();
    baseUrl = baseUrl.replace(/\/+$/, ""); // strip trailing slash

    // Check cache freshness
    const { data: meta } = await admin
      .from("erp_full_catalog_meta")
      .select("last_synced_at, total_items")
      .eq("id", 1)
      .maybeSingle();

    const lastSync = meta?.last_synced_at ? new Date(meta.last_synced_at).getTime() : 0;
    const isStale = !lastSync || Date.now() - lastSync > CACHE_TTL_MS;

    let refreshed = false;
    let refreshError: string | null = null;
    if (forceRefresh || isStale || healthOnly || compareSample) {
      try {
        const r = await refreshCacheFromErp(admin, baseUrl);
        refreshed = true;
        console.log(`[erp-search] refreshed cache: ${r.total} items`);
      } catch (e: any) {
        refreshError = String(e.message);
        console.error("[erp-search] refresh failed:", refreshError);
        await admin
          .from("erp_full_catalog_meta")
          .update({ last_error: refreshError.substring(0, 500) })
          .eq("id", 1);
        if (!lastSync && !healthOnly && !compareSample) throw e;
      }
    }

    // Compare sample mode: pick N products from our 422-item catalog and diff against Faisal cache
    if (compareSample) {
      let prodQuery = admin
        .from("products")
        .select("id, name_ar, sku, erp_item_code, stock_quantity, safety_stock, base_price, updated_at")
        .eq("is_active", true)
        .not("erp_item_code", "is", null);

      if (sampleProductIds.length > 0) {
        prodQuery = prodQuery.in("id", sampleProductIds);
      } else {
        prodQuery = prodQuery.limit(sampleSize);
      }

      const { data: products, error: prodErr } = await prodQuery;
      if (prodErr) throw new Error(`Failed to load products: ${prodErr.message}`);

      // Pick random N if no specific IDs were requested
      let pool = products || [];
      if (sampleProductIds.length === 0 && pool.length > sampleSize) {
        pool = [...pool].sort(() => Math.random() - 0.5).slice(0, sampleSize);
      }

      const erpIds = pool.map((p: any) => String(p.erp_item_code));
      const { data: erpRows } = await admin
        .from("erp_full_catalog_cache")
        .select("erp_id, name, qty, retail_price, wholesale_price, fetched_at")
        .in("erp_id", erpIds);

      // Pull wholesale tier price from product_tier_prices
      const { data: tierRows } = await admin
        .from("product_tier_prices")
        .select("product_id, tier, price")
        .in("product_id", pool.map((p: any) => p.id))
        .eq("tier", "wholesale_tier1");

      const erpMap = new Map((erpRows || []).map((r: any) => [String(r.erp_id), r]));
      const tierMap = new Map((tierRows || []).map((r: any) => [r.product_id, Number(r.price)]));

      const round = (n: any) => Number.isFinite(Number(n)) ? Math.round(Number(n) * 100) / 100 : null;
      const diff = (a: any, b: any) => {
        if (a == null || b == null) return null;
        return round(Number(a) - Number(b));
      };
      // Tolerance: prices within 1 piaster (0.01 EGP) considered identical (rounding/float noise)
      const priceMatch = (a: number | null, b: number | null) => {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return Math.abs(Number(a) - Number(b)) < 0.01;
      };

      const erpSyncedAt = meta?.last_synced_at ? new Date(meta.last_synced_at).getTime() : 0;

      // Get last SUCCESSFUL real (non-dry-run) stock sync to detect "stale sync" pattern
      const { data: lastRealSync } = await admin
        .from("erp_sync_logs")
        .select("created_at, response")
        .eq("sync_type", "stock_update")
        .eq("direction", "inbound")
        .eq("status", "success")
        .not("response->updated", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const lastRealSyncAt = lastRealSync?.created_at ? new Date(lastRealSync.created_at).getTime() : 0;
      const hoursSinceRealSync = lastRealSyncAt > 0 ? Math.round((Date.now() - lastRealSyncAt) / 3_600_000) : null;

      const comparison = pool.map((p: any) => {
        const erp = erpMap.get(String(p.erp_item_code)) || null;
        const siteWholesaleRaw = tierMap.get(p.id) ?? null;
        const siteWholesale = siteWholesaleRaw != null ? round(siteWholesaleRaw) : null;
        const siteRetail = round(p.base_price);
        const siteStock = Number(p.stock_quantity ?? 0);
        const safety = Number(p.safety_stock ?? 0);
        const erpRetail = erp ? round(erp.retail_price) : null;
        const erpWholesale = erp ? round(erp.wholesale_price) : null;
        const erpStockRaw = erp ? Number(erp.qty ?? 0) : null;
        // Site stock = ERP raw - safety_stock (after applying safety reserve). Compare against this.
        const erpStockAvailable = erpStockRaw != null ? Math.max(0, erpStockRaw - safety) : null;
        const stockMatch = erpStockAvailable != null && erpStockAvailable === siteStock;

        // ===== Stock mismatch reason diagnosis =====
        let reasonCode: string | null = null;
        let reasonText: string | null = null;
        if (!erp) {
          reasonCode = "mapping_missing";
          reasonText = `كود ERP "${p.erp_item_code}" غير موجود في كتالوج الفيصل — مشكلة mapping`;
        } else if (stockMatch) {
          reasonCode = "ok";
          reasonText = "مطابق ✓";
        } else {
          const diffVal = (erpStockAvailable ?? 0) - siteStock;
          const siteUpdatedAt = p.updated_at ? new Date(p.updated_at).getTime() : 0;
          const stale = siteUpdatedAt > 0 && erpSyncedAt > 0 && siteUpdatedAt < erpSyncedAt - 60_000;
          // Heuristics:
          if (siteStock > (erpStockRaw ?? 0)) {
            // Site has MORE stock than Faisal raw → impossible unless site wasn't decremented after Faisal sales
            reasonCode = "stale_site_stock";
            reasonText = `رصيد الموقع (${siteStock}) أعلى من الفيصل الخام (${erpStockRaw}) — لم يُحدَّث منذ آخر بيع في الفيصل`;
          } else if (safety > 0 && siteStock + safety === erpStockRaw) {
            reasonCode = "safety_stock_applied";
            reasonText = `الفرق = احتياطي الأمان (${safety}) — حساب طبيعي`;
          } else if (stale) {
            reasonCode = "stale_sync";
            reasonText = `آخر تحديث للموقع: ${new Date(siteUpdatedAt).toLocaleDateString("ar-EG")} — أقدم من آخر مزامنة فيصل`;
          } else if (Math.abs(diffVal) <= 2) {
            reasonCode = "minor_drift";
            reasonText = `فرق بسيط (${diffVal > 0 ? "+" : ""}${diffVal}) — حركة بيع/استلام بعد المزامنة`;
          } else {
            reasonCode = "data_drift";
            reasonText = `اختلاف ${diffVal > 0 ? "+" : ""}${diffVal} — يحتاج مزامنة يدوية`;
          }
        }

        return {
          product_id: p.id,
          name_ar: p.name_ar,
          sku: p.sku,
          erp_item_code: p.erp_item_code,
          found_in_erp: !!erp,
          erp_name: erp?.name || null,
          stock: {
            site: siteStock,
            erp: erpStockAvailable,
            erp_raw: erpStockRaw,
            safety_stock: safety,
            diff: erpStockAvailable != null ? erpStockAvailable - siteStock : null,
            match: stockMatch,
            note: safety > 0 ? `الفيصل ${erpStockRaw} − احتياطي ${safety} = ${erpStockAvailable}` : null,
            reason_code: reasonCode,
            reason_text: reasonText,
            site_updated_at: p.updated_at,
          },
          retail_price: { site: siteRetail, erp: erpRetail, diff: diff(erpRetail, siteRetail), match: priceMatch(siteRetail, erpRetail) },
          wholesale_price: { site: siteWholesale, erp: erpWholesale, diff: diff(erpWholesale, siteWholesale), match: priceMatch(siteWholesale, erpWholesale) },
          fetched_at: erp?.fetched_at || null,
        };
      });

      const summary = {
        sampled: comparison.length,
        found_in_erp: comparison.filter((c) => c.found_in_erp).length,
        missing_in_erp: comparison.filter((c) => !c.found_in_erp).length,
        stock_mismatches: comparison.filter((c) => c.found_in_erp && !c.stock.match).length,
        retail_price_mismatches: comparison.filter((c) => c.found_in_erp && !c.retail_price.match).length,
        wholesale_price_mismatches: comparison.filter((c) => c.found_in_erp && !c.wholesale_price.match).length,
      };

      // Optionally apply stock sync: update site stock to match Faisal (after safety_stock reserve)
      let applied: { updated: number; errors: number } | null = null;
      if (applyStockSync) {
        let updated = 0, errors = 0;
        for (const c of comparison) {
          if (!c.found_in_erp || c.stock.match || c.stock.erp == null) continue;
          const { error: upErr } = await admin
            .from("products")
            .update({ stock_quantity: c.stock.erp })
            .eq("id", c.product_id);
          if (upErr) errors++; else updated++;
        }
        applied = { updated, errors };
      }

      return new Response(JSON.stringify({
        success: true,
        refreshed,
        refresh_error: refreshError,
        summary,
        comparison,
        applied,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Health mode: return sync diagnostics + Faisal vs site comparison
    if (healthOnly) {
      const [{ count: faisalTotal }, { count: faisalRetail }, { count: faisalWholesale }, { count: siteTotal }, { count: siteInStock }, { data: metaNow }] = await Promise.all([
        admin.from("erp_full_catalog_cache").select("*", { count: "exact", head: true }),
        admin.from("erp_full_catalog_cache").select("*", { count: "exact", head: true }).gt("retail_price", 0),
        admin.from("erp_full_catalog_cache").select("*", { count: "exact", head: true }).gt("wholesale_price", 0),
        admin.from("products").select("*", { count: "exact", head: true }),
        admin.from("products").select("*", { count: "exact", head: true }).gt("stock_quantity", 0),
        admin.from("erp_full_catalog_meta").select("last_synced_at, total_items, last_error").eq("id", 1).maybeSingle(),
      ]);

      // Quick recent sync activity
      const { data: recentSyncs } = await admin
        .from("erp_sync_logs")
        .select("sync_type, status, created_at, error_message")
        .order("created_at", { ascending: false })
        .limit(10);

      return new Response(JSON.stringify({
        success: true,
        health: {
          base_url: baseUrl,
          refreshed,
          refresh_error: refreshError,
          faisal: {
            total: faisalTotal || 0,
            with_retail_price: faisalRetail || 0,
            with_wholesale_price: faisalWholesale || 0,
          },
          site: {
            total: siteTotal || 0,
            in_stock: siteInStock || 0,
          },
          meta: metaNow,
          recent_syncs: recentSyncs || [],
        },
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Search via RPC (uses caller's auth context for RLS-style role check)
    const { data: results, error: searchErr } = await userClient.rpc("search_erp_full_catalog", {
      _q: query,
    });
    if (searchErr) throw new Error(`Search failed: ${searchErr.message}`);

    // Get fresh meta
    const { data: metaNow } = await admin
      .from("erp_full_catalog_meta")
      .select("last_synced_at, total_items")
      .eq("id", 1)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        results: results || [],
        count: (results || []).length,
        cache: {
          last_synced_at: metaNow?.last_synced_at,
          total_items: metaNow?.total_items,
          refreshed,
          ttl_minutes: CACHE_TTL_MS / 60000,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[erp-search-products] error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
