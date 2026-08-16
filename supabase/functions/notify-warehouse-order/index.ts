import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_TOKEN = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
const META_PHONE_ID = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// أ. عبدالحميد - مسؤول المخازن
const WAREHOUSE_PHONE = "201156332243";

function formatEgyptianPhone(phone: string): string {
  let cleaned = String(phone).replace(/[\s\-()+]/g, "");
  cleaned = cleaned.replace(/^00/, "");
  if (cleaned.startsWith("0")) cleaned = "2" + cleaned;
  if (/^1\d{9}$/.test(cleaned)) cleaned = "20" + cleaned;
  return cleaned;
}

async function sendWhatsApp(toPhone: string, message: string) {
  if (!META_TOKEN || !META_PHONE_ID) {
    console.error("Missing WhatsApp credentials");
    return { success: false, error: "missing_credentials" };
  }
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${META_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${META_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formatEgyptianPhone(toPhone),
        type: "text",
        text: { body: message },
      }),
    },
  );
  const data = await res.json();
  if (!res.ok) console.error("WhatsApp API error:", JSON.stringify(data));
  return { success: res.ok, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const orderId = body.order_id as string | undefined;
    if (!orderId) {
      return new Response(JSON.stringify({ success: false, error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, total_amount, shipping_cost, payment_method, status, pickup_branch, shipping_governorate, shipping_address, notes, user_id, created_at, order_items(quantity, unit_price, products:product_id(name_ar, sku, erp_item_code))",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      return new Response(JSON.stringify({ success: false, error: "order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // بيانات العميل
    let customerName = "عميل";
    let customerPhone = "";
    if (order.user_id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", order.user_id)
        .maybeSingle();
      if (prof?.full_name) customerName = prof.full_name;
      if (prof?.phone) customerPhone = String(prof.phone);
    }
    if (!customerPhone && order.shipping_address) {
      const m = String(order.shipping_address).match(/01\d{8,10}/);
      if (m) customerPhone = m[0].slice(0, 11);
    }

    const items = (order.order_items || []) as any[];
    const itemsText = items.length
      ? items
          .map((it, i) => {
            const p = it.products || {};
            const code = p.erp_item_code || p.sku || "-";
            return `${i + 1}) ${p.name_ar || "صنف"}\n   كود: ${code} | الكمية: ${it.quantity} | السعر: ${Number(
              it.unit_price,
            ).toLocaleString("ar-EG")} ج.م`;
          })
          .join("\n")
      : "لا توجد أصناف";

    const location = order.pickup_branch
      ? `استلام من فرع: ${order.pickup_branch}`
      : order.shipping_governorate
        ? `شحن إلى: ${order.shipping_governorate}`
        : "";

    const message =
      `✅ *طلب مدفوع - تجهيز مخزن*\n\n` +
      `📦 رقم الطلب: ${order.order_number}\n` +
      `💳 طريقة الدفع: ${order.payment_method || "-"}\n` +
      `💰 الإجمالي: ${Number(order.total_amount).toLocaleString("ar-EG")} ج.م\n\n` +
      `👤 *بيانات العميل*\n` +
      `الاسم: ${customerName}\n` +
      `الموبايل: ${customerPhone || "غير متاح"}\n` +
      (order.shipping_address ? `العنوان: ${order.shipping_address}\n` : "") +
      (location ? `${location}\n` : "") +
      `\n🧾 *الأصناف (${items.length})*\n${itemsText}\n` +
      (order.notes ? `\n📝 ملاحظات: ${order.notes}\n` : "") +
      `\n⚡ برجاء تجهيز الطلب.`;

    const result = await sendWhatsApp(WAREHOUSE_PHONE, message);

    await supabase.from("whatsapp_send_logs").insert({
      phone: WAREHOUSE_PHONE,
      recipient_name: "أ. عبدالحميد - المخازن",
      template: "warehouse_new_paid_order",
      message_preview: message.slice(0, 500),
      status: result.success ? "sent" : "failed",
      error_message: result.success ? null : JSON.stringify(result.data ?? {}),
      provider_response: (result.data ?? {}) as any,
    });

    return new Response(JSON.stringify({ success: result.success, order: order.order_number }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-warehouse-order error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
