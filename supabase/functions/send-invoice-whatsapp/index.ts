import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppText } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const branchLabels: Record<string, string> = {
  ossim: "أوسيم",
  luxor: "الأقصر",
  tawfiqia: "التوفيقية",
};

const statusLabels: Record<string, string> = {
  awaiting_payment: "💳 بانتظار الدفع",
  processing: "📦 جاري التجهيز",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId, statusContext } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch order with items + product names + customer profile
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id, order_number, total_amount, status, payment_method,
        shipping_governorate, shipping_address, pickup_branch,
        coupon_code, coupon_discount, user_id,
        items:order_items(quantity, unit_price, total_price, product:products(name_ar, sku))
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: orderErr?.message || "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles").select("full_name, phone").eq("user_id", order.user_id).maybeSingle();

    const customerPhone = profile?.phone;
    if (!customerPhone) {
      return new Response(JSON.stringify({ error: "Customer phone not found", success: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build invoice message
    const items = order.items || [];
    const itemsTotal = items.reduce((s: number, it: any) => s + Number(it.total_price || 0), 0);
    const total = Number(order.total_amount || 0);
    const discount = Number(order.coupon_discount || 0);
    const shipping = Math.max(0, total - itemsTotal + discount);

    const fmt = (n: number) => Number(n).toLocaleString("ar-EG");
    const status = statusContext || order.status;
    const statusLine = statusLabels[status] || "🧾 فاتورتك";

    const lines: string[] = [
      `${statusLine}`,
      `أهلاً ${profile?.full_name || "عميلنا الكريم"} 👋`,
      ``,
      `🧾 *فاتورة طلبك من المصرية لقطع غيار السيارات*`,
      `رقم الطلب: *${order.order_number}*`,
      ``,
      `*الأصناف:*`,
      ...items.map((it: any, i: number) => {
        const name = it.product?.name_ar || "صنف";
        const sku = it.product?.sku ? ` (${it.product.sku})` : "";
        return `${i + 1}. ${name}${sku}\n   ${it.quantity} × ${fmt(it.unit_price)} = ${fmt(it.total_price)} ج.م`;
      }),
      ``,
      `💵 إجمالي الأصناف: ${fmt(itemsTotal)} ج.م`,
    ];

    if (shipping > 0) lines.push(`🚚 الشحن: ${fmt(shipping)} ج.م`);
    if (discount > 0) lines.push(`🎟️ خصم${order.coupon_code ? ` (${order.coupon_code})` : ""}: -${fmt(discount)} ج.م`);

    lines.push(``, `💰 *الإجمالي المطلوب: ${fmt(total)} ج.م*`);

    if (order.pickup_branch && branchLabels[order.pickup_branch]) {
      lines.push(`🏢 فرع الاستلام: ${branchLabels[order.pickup_branch]}`);
    } else if (order.shipping_governorate) {
      lines.push(`📍 محافظة الشحن: ${order.shipping_governorate}`);
    }

    if (status === "awaiting_payment") {
      lines.push(``, `🔔 برجاء استكمال الدفع لبدء تجهيز الطلب.`);
    } else if (status === "processing") {
      lines.push(``, `✅ تم استلام الدفع وجارٍ تجهيز طلبك الآن.`);
    }

    lines.push(``, `شكراً لتعاملك مع المصرية جروب 🚗`);

    const msg = lines.join("\n");
    const result = await sendWhatsAppText(customerPhone, msg);

    return new Response(JSON.stringify({
      success: result.ok,
      formattedPhone: result.formattedPhone,
      requiresTemplate: result.requiresTemplate ?? false,
      error: result.ok ? null : result.error,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-invoice-whatsapp error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message, success: false }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
