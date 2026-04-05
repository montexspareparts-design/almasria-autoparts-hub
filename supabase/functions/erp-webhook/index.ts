import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify webhook secret
    const webhookSecret = req.headers.get("x-webhook-secret");
    const { data: secretConfig } = await supabase
      .from("erp_config")
      .select("value")
      .eq("key", "webhook_secret")
      .maybeSingle();

    if (!secretConfig || webhookSecret !== secretConfig.value) {
      return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { event, data } = body;

    console.log("Webhook received:", event, JSON.stringify(data));

    // ─── ORDER UPDATED FROM ERP ───
    if (event === "order.updated") {
      const orderNumber = data.order_number;

      // Find the order
      const { data: order } = await supabase
        .from("orders")
        .select("*, order_items(*, product:products(name_ar, sku, erp_item_code))")
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (!order) {
        console.error("Order not found:", orderNumber);
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update order items if provided
      if (data.items && Array.isArray(data.items)) {
        for (const erpItem of data.items) {
          // Match by erp_item_code first, then SKU
          const matchingItem = order.order_items?.find(
            (i: any) => 
              (erpItem.itemCode && i.product?.erp_item_code === erpItem.itemCode) ||
              (erpItem.sku && i.product?.sku === erpItem.sku)
          );

          if (matchingItem) {
            if (erpItem.removed) {
              await supabase.from("order_items").delete().eq("id", matchingItem.id);
            } else if (erpItem.quantity !== undefined) {
              const newUnitPrice = erpItem.unitPrice !== undefined ? Number(erpItem.unitPrice) : Number(matchingItem.unit_price);
              await supabase
                .from("order_items")
                .update({
                  quantity: erpItem.quantity,
                  unit_price: newUnitPrice,
                  total_price: erpItem.quantity * newUnitPrice,
                })
                .eq("id", matchingItem.id);
            }
          }
        }

        // Recalculate total
        const { data: updatedItems } = await supabase
          .from("order_items")
          .select("total_price")
          .eq("order_id", order.id);

        const newTotal = (updatedItems || []).reduce(
          (sum: number, i: any) => sum + Number(i.total_price),
          0
        );

        await supabase
          .from("orders")
          .update({ total_amount: newTotal, status: "pending_approval" })
          .eq("id", order.id);

        // Notify customer
        const changeDetails = data.items
          .map((i: any) =>
            i.removed
              ? `❌ حذف: ${i.sku}`
              : `🔄 ${i.sku}: الكمية ← ${i.quantity}`
          )
          .join("\n");

        await supabase.from("notifications").insert({
          user_id: order.user_id,
          title: "📝 تم تعديل طلبك من النظام — يرجى الموافقة أو الرفض",
          message: `[order_edit:${order.id}]\nتم تعديل طلبك رقم ${orderNumber} من نظام الإدارة.\n\nالتغييرات:\n${changeDetails}\n\n💰 الإجمالي الجديد: ${newTotal.toLocaleString("ar-EG")} ج.م`,
          type: "order_edit",
        });
      }

      // Update order status if provided
      if (data.status) {
        await supabase
          .from("orders")
          .update({ status: data.status })
          .eq("id", order.id);
      }

      // Log
      await supabase.from("erp_sync_logs").insert({
        sync_type: "order_update",
        direction: "inbound",
        reference_id: order.id,
        reference_number: orderNumber,
        payload: data,
        response: { success: true },
        status: "success",
      });

      return new Response(
        JSON.stringify({ success: true, message: "Order updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── STOCK UPDATE FROM ERP ───
    else if (event === "stock.updated") {
      const updates = data.items || [];
      let updated = 0;

      for (const item of updates) {
        const { error } = await supabase
          .from("products")
          .update({ stock_quantity: item.quantity })
          .eq("sku", item.sku);
        if (!error) updated++;
      }

      await supabase.from("erp_sync_logs").insert({
        sync_type: "stock_update",
        direction: "inbound",
        payload: data,
        response: { success: true, updated_count: updated },
        status: "success",
      });

      return new Response(
        JSON.stringify({ success: true, updated_count: updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── PRICE UPDATE FROM ERP ───
    else if (event === "price.updated") {
      const updates = data.items || [];
      let updated = 0;

      for (const item of updates) {
        const updateData: any = { base_price: item.price };
        if (item.sale_price !== undefined) updateData.sale_price = item.sale_price;

        const { error } = await supabase
          .from("products")
          .update(updateData)
          .eq("sku", item.sku);
        if (!error) updated++;
      }

      // Notify dealers about price changes
      const { data: dealers } = await supabase
        .from("dealer_accounts")
        .select("user_id")
        .eq("is_active", true);

      if (dealers && dealers.length > 0) {
        const notifications = dealers.map((d: any) => ({
          user_id: d.user_id,
          title: "💰 تحديث أسعار جديد",
          message: `تم تحديث أسعار ${updated} صنف. تصفح كشوفات الأسعار للاطلاع على الأسعار الجديدة.`,
          type: "info",
        }));
        await supabase.from("notifications").insert(notifications);
      }

      await supabase.from("erp_sync_logs").insert({
        sync_type: "price_update",
        direction: "inbound",
        payload: data,
        response: { success: true, updated_count: updated },
        status: "success",
      });

      return new Response(
        JSON.stringify({ success: true, updated_count: updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown event: ${event}` }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
