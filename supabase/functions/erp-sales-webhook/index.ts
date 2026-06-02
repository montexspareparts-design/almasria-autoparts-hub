import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Al-Faisal ERP → Site sales reports receiver.
 *
 * Auth: header `x-webhook-secret` must equal erp_config.webhook_secret.
 *
 * Two events supported:
 *  1) sales.invoices  → header rows in erp_sales_invoices
 *  2) sales.items     → line rows in erp_sales_invoice_items
 *
 * Body shape:
 *   { "event": "sales.invoices" | "sales.items",
 *     "data": { "items": [ ... ] } }
 *
 * Idempotent: invoice_number is UNIQUE → re-sending overwrites via upsert.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Verify webhook secret ──
    const secret = req.headers.get("x-webhook-secret");
    const { data: cfg } = await supabase
      .from("erp_config").select("value")
      .eq("key", "webhook_secret").maybeSingle();
    if (!cfg || secret !== cfg.value) {
      return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    if (!body?.event || !body?.data) {
      return new Response(JSON.stringify({ error: "Missing event/data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { event, data } = body;
    const items: any[] = Array.isArray(data.items) ? data.items : [];

    // ─── SALES INVOICES (headers) ───
    if (event === "sales.invoices") {
      let upserted = 0;
      for (const it of items) {
        const invNum = String(it.invoice_number ?? it.invoiceNumber ?? "").trim();
        const invDate = it.invoice_date ?? it.invoiceDate;
        if (!invNum || !invDate) continue;

        const row = {
          invoice_number: invNum,
          invoice_date: new Date(invDate).toISOString(),
          customer_code: it.customer_code ?? it.customerCode ?? null,
          customer_name: it.customer_name ?? it.customerName ?? null,
          warehouse: it.warehouse ?? null,
          salesman: it.salesman ?? null,
          payment_method: it.payment_method ?? it.paymentMethod ?? null,
          total_amount: Number(it.total_amount ?? it.totalAmount ?? 0),
          discount_amount: Number(it.discount_amount ?? it.discountAmount ?? 0),
          tax_amount: Number(it.tax_amount ?? it.taxAmount ?? 0),
          net_amount: Number(it.net_amount ?? it.netAmount ?? 0),
          notes: it.notes ?? null,
          raw_payload: it,
        };

        const { error } = await supabase
          .from("erp_sales_invoices")
          .upsert(row, { onConflict: "invoice_number" });
        if (!error) upserted++;
      }

      await supabase.from("erp_sync_logs").insert({
        sync_type: "sales_invoices",
        direction: "inbound",
        payload: data,
        response: { upserted },
        status: "success",
      });

      return new Response(JSON.stringify({ success: true, upserted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SALES ITEMS (invoice lines) ───
    if (event === "sales.items") {
      // Lookup invoice IDs in batch
      const invoiceNums = Array.from(new Set(items
        .map((i) => String(i.invoice_number ?? i.invoiceNumber ?? "").trim())
        .filter(Boolean)));
      const { data: invs } = await supabase
        .from("erp_sales_invoices")
        .select("id, invoice_number")
        .in("invoice_number", invoiceNums);
      const invMap = new Map((invs ?? []).map((r) => [r.invoice_number, r.id]));

      const rows = items.map((it) => {
        const invNum = String(it.invoice_number ?? it.invoiceNumber ?? "").trim();
        return {
          invoice_id: invMap.get(invNum) ?? null,
          invoice_number: invNum,
          invoice_date: new Date(it.invoice_date ?? it.invoiceDate ?? Date.now()).toISOString(),
          erp_item_code: it.item_code ?? it.itemCode ?? it.erp_item_code ?? null,
          sku: it.sku ?? null,
          item_name: it.item_name ?? it.itemName ?? null,
          unit: it.unit ?? null,
          quantity: Number(it.quantity ?? it.qty ?? 0),
          unit_price: Number(it.unit_price ?? it.unitPrice ?? 0),
          discount_amount: Number(it.discount_amount ?? it.discountAmount ?? 0),
          total_amount: Number(it.total_amount ?? it.totalAmount ?? 0),
          raw_payload: it,
        };
      }).filter((r) => r.invoice_number);

      let inserted = 0;
      if (rows.length) {
        const { error, count } = await supabase
          .from("erp_sales_invoice_items")
          .insert(rows, { count: "exact" });
        if (!error) inserted = count ?? rows.length;
      }

      await supabase.from("erp_sync_logs").insert({
        sync_type: "sales_items",
        direction: "inbound",
        payload: data,
        response: { inserted },
        status: "success",
      });

      return new Response(JSON.stringify({ success: true, inserted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown event: ${event}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("erp-sales-webhook error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
