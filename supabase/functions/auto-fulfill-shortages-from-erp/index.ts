// Edge function: auto-fulfill-shortages-from-erp
// يُستدعى كل ساعة عبر cron — أو يدويًا من زر "افحص دلوقتي" في شاشة طلبات الفريق.
// عند الاستدعاء اليدوي (forceRefresh=true) بنعمل refresh كامل للكاش من الفيصل قبل المقارنة،
// عشان لو الموظف لسه زوّد رصيد دلوقتي ميستناش الساعة الجاية.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let cachedToken: string | null = null;
let tokenExpiry = 0;

function isValidJwt(s: string | null): boolean {
  if (!s) return false;
  const t = s.trim();
  if (t.startsWith("<") || /<\/?html|<!doctype/i.test(t)) return false;
  const parts = t.split(".");
  if (parts.length < 2) return false;
  if (/[\r\n\s]/.test(t)) return false;
  return t.length > 40 && t.length < 4096;
}

async function getErpToken(baseUrl: string): Promise<string> {
  if (cachedToken && isValidJwt(cachedToken) && Date.now() < tokenExpiry - 300_000) return cachedToken;
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
    throw new Error(`ERP auth failed [${res.status}]: ${text.substring(0, 200)}`);
  }
  cachedToken = jwt;
  tokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
  return cachedToken!;
}

async function refreshErpCacheDirect(supabase: any, baseUrl: string): Promise<{ total: number }> {
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
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("erp_full_catalog_cache")
      .upsert(slice, { onConflict: "erp_id" });
    if (error) throw new Error(`Cache upsert failed: ${error.message}`);
  }
  await supabase
    .from("erp_full_catalog_meta")
    .update({ last_synced_at: new Date().toISOString(), total_items: rows.length, last_error: null })
    .eq("id", 1);
  return { total: rows.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // اقرأ الباراميترات: forceRefresh من الزر اليدوي يجبرنا على refresh للكاش
  let forceRefresh = false;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      forceRefresh = !!(body?.forceRefresh ?? body?.refresh ?? body?.force);
    }
  } catch { /* ignore */ }

  const summary = {
    started_at: new Date().toISOString(),
    open_requests: 0,
    cache_age_minutes: null as number | null,
    cache_refreshed: false,
    refresh_error: null as string | null,
    fulfilled: 0,
    fulfilled_count: 0, // alias للتوافق مع UI
    checked_count: 0,
    still_short: 0,
    not_in_erp: 0,
    errors: [] as string[],
  };

  try {
    // 1) اجلب البلاغات المفتوحة
    const { data: reqs, error: reqsErr } = await supabase
      .from("stock_shortage_requests")
      .select("id, product_id, manual_sku, requested_quantity, products(sku)")
      .in("status", ["open", "sourcing"]);

    if (reqsErr) throw new Error(`Fetch requests failed: ${reqsErr.message}`);

    const openRequests = reqs || [];
    summary.open_requests = openRequests.length;
    summary.checked_count = openRequests.length;

    if (openRequests.length === 0) {
      return new Response(JSON.stringify({ ok: true, summary, ...summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) عمر الكاش
    const { data: meta } = await supabase
      .from("erp_full_catalog_meta")
      .select("last_synced_at")
      .eq("id", 1)
      .maybeSingle();

    let cacheAgeMin = Infinity;
    if (meta?.last_synced_at) {
      cacheAgeMin = (Date.now() - new Date(meta.last_synced_at).getTime()) / 60000;
      summary.cache_age_minutes = Math.round(cacheAgeMin);
    }

    // 3) Refresh للكاش لو: استدعاء يدوي (forceRefresh) أو الكاش أقدم من 55 دقيقة
    if (forceRefresh || cacheAgeMin > 55) {
      try {
        // اقرأ baseUrl من erp_config
        const { data: cfgRow } = await supabase
          .from("erp_config")
          .select("value")
          .eq("key", "erp_base_url")
          .maybeSingle();
        let baseUrl = (cfgRow?.value || Deno.env.get("ERP_FAISAL_BASE_URL") || "https://api.alfaysalerp.com").trim();
        baseUrl = baseUrl.replace(/\/+$/, "");

        const r = await refreshErpCacheDirect(supabase, baseUrl);
        summary.cache_refreshed = true;
        console.log(`[auto-fulfill] cache refreshed: ${r.total} items (forceRefresh=${forceRefresh})`);
      } catch (e: any) {
        summary.refresh_error = String(e?.message || e);
        summary.errors.push(`Cache refresh: ${summary.refresh_error}`);
        console.error("[auto-fulfill] refresh failed:", summary.refresh_error);
        // ما نوقفش — نكمل بالكاش القديم
      }
    }

    // 4) جمع erp_ids
    const erpIds = new Set<string>();
    const reqWithErp = openRequests.map((r: any) => {
      const erpId = (r.manual_sku || r.products?.sku || "").trim();
      if (erpId) erpIds.add(erpId);
      return { ...r, erp_id: erpId };
    });

    if (erpIds.size === 0) {
      summary.not_in_erp = openRequests.length;
      return new Response(JSON.stringify({ ok: true, summary, ...summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) أرصدة الكاش
    const { data: cacheRows, error: cacheErr } = await supabase
      .from("erp_full_catalog_cache")
      .select("erp_id, qty")
      .in("erp_id", Array.from(erpIds));

    if (cacheErr) throw new Error(`Read cache failed: ${cacheErr.message}`);

    const qtyMap: Record<string, number> = {};
    (cacheRows || []).forEach((c: any) => { qtyMap[c.erp_id] = Number(c.qty || 0); });

    // 6) تحديث البلاغات اللي رصيدها كافي
    const toFulfill: { id: string; note: string }[] = [];
    for (const r of reqWithErp) {
      if (!r.erp_id || !(r.erp_id in qtyMap)) {
        summary.not_in_erp++;
        continue;
      }
      const available = qtyMap[r.erp_id];
      if (available >= r.requested_quantity) {
        toFulfill.push({
          id: r.id,
          note: `متاح في الفيصل (رصيد ${available} من المطلوب ${r.requested_quantity}) — مزامنة ${forceRefresh ? "يدوية" : "تلقائية"}`,
        });
      } else {
        summary.still_short++;
      }
    }

    for (const item of toFulfill) {
      const { error: updErr } = await supabase
        .from("stock_shortage_requests")
        .update({
          status: "fulfilled",
          admin_response: item.note,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .in("status", ["open", "sourcing"]);
      if (updErr) summary.errors.push(`Update ${item.id}: ${updErr.message}`);
      else {
        summary.fulfilled++;
        summary.fulfilled_count++;
      }
    }

    return new Response(JSON.stringify({ ok: true, summary, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    summary.errors.push(String(e?.message || e));
    return new Response(JSON.stringify({ ok: false, summary, ...summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
