import { supabase } from "@/integrations/supabase/client";

/**
 * Push a new order to Al Faisal ERP system (fire-and-forget)
 */
export const pushOrderToERP = async (orderId: string) => {
  try {
    const { data: order } = await supabase
      .from("orders")
      .select("*, order_items(*, products:product_id(name_ar, sku, erp_item_code))")
      .eq("id", orderId)
      .single();

    if (!order) return;

    const [profileRes, dealerRes] = await Promise.all([
      supabase.from("profiles").select("full_name, phone").eq("user_id", order.user_id).maybeSingle(),
      supabase.from("dealer_accounts").select("erp_customer_code, tier").eq("user_id", order.user_id).maybeSingle(),
    ]);

    await supabase.functions.invoke("erp-sync-outbound", {
      body: {
        action: "push_order",
        data: {
          order_id: order.id,
          order_number: order.order_number,
          customer_name: profileRes.data?.full_name || "",
          customer_phone: profileRes.data?.phone || "",
          erp_customer_code: dealerRes.data?.erp_customer_code || "",
          customer_tier: dealerRes.data?.tier || "retail",
          shipping_address: order.shipping_address || "",
          shipping_governorate: order.shipping_governorate || "",
          payment_method: order.payment_method || "",
          items: (order.order_items || []).map((item: any) => ({
            sku: item.products?.sku || "",
            erp_item_code: item.products?.erp_item_code || "",
            name_ar: item.products?.name_ar || "",
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          })),
          total_amount: order.total_amount,
          notes: order.notes || "",
        },
      },
    });

    console.log(`[ERP] Order ${order.order_number} pushed successfully`);
  } catch (err) {
    console.error("[ERP] Failed to push order:", err);
  }
};

/**
 * Push a new quote to Al Faisal ERP system (fire-and-forget)
 */
export const pushQuoteToERP = async (quoteId: string) => {
  try {
    const { data: quote } = await supabase
      .from("dealer_quotes")
      .select("*, dealer_quote_items(*, products:product_id(name_ar, sku, erp_item_code))")
      .eq("id", quoteId)
      .single();

    if (!quote) return;

    const [profileRes, dealerRes] = await Promise.all([
      supabase.from("profiles").select("full_name, phone").eq("user_id", quote.user_id).maybeSingle(),
      supabase.from("dealer_accounts").select("erp_customer_code, tier").eq("user_id", quote.user_id).maybeSingle(),
    ]);

    await supabase.functions.invoke("erp-sync-outbound", {
      body: {
        action: "push_quote",
        data: {
          quote_id: quote.id,
          quote_number: quote.quote_number,
          customer_name: profileRes.data?.full_name || "",
          erp_customer_code: dealerRes.data?.erp_customer_code || "",
          customer_tier: dealerRes.data?.tier || "retail",
          items: (quote.dealer_quote_items || []).map((item: any) => ({
            sku: item.products?.sku || "",
            erp_item_code: item.products?.erp_item_code || "",
            name_ar: item.products?.name_ar || "",
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          })),
          total_amount: quote.total_amount,
          notes: quote.notes || "",
        },
      },
    });

    console.log(`[ERP] Quote ${quote.quote_number} pushed successfully`);
  } catch (err) {
    console.error("[ERP] Failed to push quote:", err);
  }
};
