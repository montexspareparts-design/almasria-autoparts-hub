import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ─── Authentication Check ─────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ─── End Auth Check ─────────────────────────────────────────────────

    const { action, data } = await req.json();

    // Admin-only actions
    if (action === "sync_stock" || action === "sync_prices") {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Forbidden — admin only" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch ERP config
    const { data: configs } = await supabase
      .from("erp_config")
      .select("key, value");

    const config: Record<string, string> = {};
    configs?.forEach((c: any) => (config[c.key] = c.value));

    const isMock = config.erp_mode === "mock";
    const baseUrl = config.erp_base_url || "";
    const apiKey = Deno.env.get("ERP_FAISAL_API_KEY") || config.erp_api_key || "";

    let result: any = null;
    let syncType = "";
    let referenceId = "";
    let referenceNumber = "";

    // ─── PUSH QUOTE TO ERP ───
    if (action === "push_quote") {
      syncType = "quote_push";
      referenceId = data.quote_id;
      referenceNumber = data.quote_number;

      const payload = {
        quote_number: data.quote_number,
        customer_name: data.customer_name,
        items: data.items?.map((item: any) => ({
          sku: item.sku,
          name: item.name_ar,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total_price,
        })),
        total_amount: data.total_amount,
        notes: data.notes || "",
      };

      if (isMock) {
        result = {
          success: true,
          erp_quote_id: `ERP-Q-${Date.now()}`,
          message: "Quote created in ERP (MOCK MODE)",
        };
      } else {
        const res = await fetch(`${baseUrl}/quotes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });
        result = await res.json();
        if (!res.ok)
          throw new Error(`ERP API error [${res.status}]: ${JSON.stringify(result)}`);
      }

      await supabase.from("erp_sync_logs").insert({
        sync_type: syncType,
        direction: "outbound",
        reference_id: referenceId,
        reference_number: referenceNumber,
        payload,
        response: result,
        status: isMock ? "mock" : "success",
      });
    }

    // ─── PUSH ORDER TO ERP ───
    else if (action === "push_order") {
      syncType = "order_push";
      referenceId = data.order_id;
      referenceNumber = data.order_number;

      const payload = {
        order_number: data.order_number,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        shipping_address: data.shipping_address,
        shipping_governorate: data.shipping_governorate,
        payment_method: data.payment_method,
        items: data.items?.map((item: any) => ({
          sku: item.sku,
          name: item.name_ar,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total_price,
        })),
        total_amount: data.total_amount,
        notes: data.notes || "",
      };

      if (isMock) {
        result = {
          success: true,
          erp_order_id: `ERP-O-${Date.now()}`,
          message: "Order created in ERP (MOCK MODE)",
        };
      } else {
        const res = await fetch(`${baseUrl}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });
        result = await res.json();
        if (!res.ok)
          throw new Error(`ERP API error [${res.status}]: ${JSON.stringify(result)}`);
      }

      await supabase.from("erp_sync_logs").insert({
        sync_type: syncType,
        direction: "outbound",
        reference_id: referenceId,
        reference_number: referenceNumber,
        payload,
        response: result,
        status: isMock ? "mock" : "success",
      });
    }

    // ─── SYNC STOCK FROM ERP ───
    else if (action === "sync_stock") {
      syncType = "stock_update";

      if (isMock) {
        const { data: products } = await supabase
          .from("products")
          .select("id, sku, stock_quantity")
          .eq("is_active", true)
          .limit(10);

        const updates = (products || []).map((p: any) => ({
          sku: p.sku,
          old_qty: p.stock_quantity,
          new_qty: Math.floor(Math.random() * 100) + 5,
        }));

        for (const u of updates) {
          await supabase
            .from("products")
            .update({ stock_quantity: u.new_qty })
            .eq("sku", u.sku);
        }

        result = {
          success: true,
          updated_count: updates.length,
          updates,
          message: "Stock synced from ERP (MOCK MODE)",
        };
      } else {
        const res = await fetch(`${baseUrl}/stock`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const erpStock = await res.json();
        if (!res.ok) throw new Error(`ERP API error: ${JSON.stringify(erpStock)}`);

        let updated = 0;
        for (const item of erpStock.items || []) {
          const { error } = await supabase
            .from("products")
            .update({ stock_quantity: item.quantity })
            .eq("sku", item.sku);
          if (!error) updated++;
        }
        result = { success: true, updated_count: updated };
      }

      await supabase.from("erp_sync_logs").insert({
        sync_type: syncType,
        direction: "inbound",
        payload: { action: "sync_stock" },
        response: result,
        status: isMock ? "mock" : "success",
      });
    }

    // ─── SYNC PRICES FROM ERP ───
    else if (action === "sync_prices") {
      syncType = "price_update";

      if (isMock) {
        const { data: products } = await supabase
          .from("products")
          .select("id, sku, base_price")
          .eq("is_active", true)
          .limit(10);

        const updates = (products || []).map((p: any) => ({
          sku: p.sku,
          old_price: p.base_price,
          new_price: Math.round(p.base_price * (0.9 + Math.random() * 0.2)),
        }));

        for (const u of updates) {
          await supabase
            .from("products")
            .update({ base_price: u.new_price })
            .eq("sku", u.sku);
        }

        result = {
          success: true,
          updated_count: updates.length,
          updates,
          message: "Prices synced from ERP (MOCK MODE)",
        };
      } else {
        const res = await fetch(`${baseUrl}/prices`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const erpPrices = await res.json();
        if (!res.ok) throw new Error(`ERP API error: ${JSON.stringify(erpPrices)}`);

        let updated = 0;
        for (const item of erpPrices.items || []) {
          const { error } = await supabase
            .from("products")
            .update({ base_price: item.price })
            .eq("sku", item.sku);
          if (!error) updated++;
        }
        result = { success: true, updated_count: updated };
      }

      await supabase.from("erp_sync_logs").insert({
        sync_type: syncType,
        direction: "inbound",
        payload: { action: "sync_prices" },
        response: result,
        status: isMock ? "mock" : "success",
      });
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("ERP sync error:", message);

    // Log failure
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("erp_sync_logs").insert({
        sync_type: "error",
        direction: "outbound",
        status: "failed",
        error_message: message,
      });
    } catch (_) {}

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
