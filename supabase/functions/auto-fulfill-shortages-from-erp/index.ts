// Edge function: auto-fulfill-shortages-from-erp
// يُستدعى كل ساعة عبر cron.
// يفحص كل بلاغات النواقص المفتوحة (open/sourcing) ويقارن بكاش الفيصل.
// لو رصيد الفيصل >= الكمية المطلوبة → يحدّث البلاغ لـ fulfilled
// (الـ trigger trg_shortage_status_notify يبعت notification للموظف تلقائياً).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const summary = {
    started_at: new Date().toISOString(),
    open_requests: 0,
    cache_age_minutes: null as number | null,
    cache_refreshed: false,
    fulfilled: 0,
    still_short: 0,
    not_in_erp: 0,
    errors: [] as string[],
  };

  try {
    // 1) اجلب كل البلاغات المفتوحة + بيانات المنتج (لاستخراج SKU)
    const { data: reqs, error: reqsErr } = await supabase
      .from("stock_shortage_requests")
      .select("id, product_id, manual_sku, requested_quantity, products(sku)")
      .in("status", ["open", "sourcing"]);

    if (reqsErr) throw new Error(`Fetch requests failed: ${reqsErr.message}`);

    const openRequests = reqs || [];
    summary.open_requests = openRequests.length;
    if (openRequests.length === 0) {
      return new Response(JSON.stringify({ ok: true, summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) تحقق من عمر الكاش — لو أقدم من 55 دقيقة، اعمل refresh
    const { data: cacheStat } = await supabase
      .from("erp_full_catalog_cache")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let cacheAgeMin = Infinity;
    if (cacheStat?.fetched_at) {
      cacheAgeMin = (Date.now() - new Date(cacheStat.fetched_at).getTime()) / 60000;
      summary.cache_age_minutes = Math.round(cacheAgeMin);
    }

    if (cacheAgeMin > 55) {
      try {
        const refreshRes = await fetch(`${SUPABASE_URL}/functions/v1/erp-search-products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_KEY}`,
            "apikey": SERVICE_KEY,
          },
          body: JSON.stringify({ query: "", forceRefresh: true }),
        });
        if (refreshRes.ok) summary.cache_refreshed = true;
        else summary.errors.push(`Cache refresh HTTP ${refreshRes.status}`);
      } catch (e: any) {
        summary.errors.push(`Cache refresh error: ${e?.message || e}`);
      }
    }

    // 3) جمع كل الـ erp_ids المطلوبة
    const erpIds = new Set<string>();
    const reqWithErp = openRequests.map((r: any) => {
      const erpId = (r.manual_sku || r.products?.sku || "").trim();
      if (erpId) erpIds.add(erpId);
      return { ...r, erp_id: erpId };
    });

    if (erpIds.size === 0) {
      summary.not_in_erp = openRequests.length;
      return new Response(JSON.stringify({ ok: true, summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) اقرأ الأرصدة من الكاش
    const { data: cacheRows, error: cacheErr } = await supabase
      .from("erp_full_catalog_cache")
      .select("erp_id, qty")
      .in("erp_id", Array.from(erpIds));

    if (cacheErr) throw new Error(`Read cache failed: ${cacheErr.message}`);

    const qtyMap: Record<string, number> = {};
    (cacheRows || []).forEach((c: any) => { qtyMap[c.erp_id] = Number(c.qty || 0); });

    // 5) حدّث البلاغات اللي رصيدها كافي
    const toFulfill: string[] = [];
    const fulfillNotes: Record<string, string> = {};

    for (const r of reqWithErp) {
      if (!r.erp_id || !(r.erp_id in qtyMap)) {
        summary.not_in_erp++;
        continue;
      }
      const available = qtyMap[r.erp_id];
      if (available >= r.requested_quantity) {
        toFulfill.push(r.id);
        fulfillNotes[r.id] = `متاح في الفيصل (رصيد ${available} من المطلوب ${r.requested_quantity}) — مزامنة تلقائية`;
      } else {
        summary.still_short++;
      }
    }

    // تحديث على دفعات (كل بلاغ منفصل عشان admin_response مختلفة)
    for (const id of toFulfill) {
      const { error: updErr } = await supabase
        .from("stock_shortage_requests")
        .update({
          status: "fulfilled",
          admin_response: fulfillNotes[id],
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .in("status", ["open", "sourcing"]); // safety
      if (updErr) summary.errors.push(`Update ${id}: ${updErr.message}`);
      else summary.fulfilled++;
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    summary.errors.push(String(e?.message || e));
    return new Response(JSON.stringify({ ok: false, summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
