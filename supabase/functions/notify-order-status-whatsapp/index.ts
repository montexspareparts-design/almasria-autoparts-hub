import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppText } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STATUS_MESSAGES: Record<string, (orderNum: string, extra?: any) => string> = {
  shipped: (orderNum, extra) => {
    let msg = `🚚 تم شحن طلبك #${orderNum}`;
    if (extra?.shipping_company) msg += `\nشركة الشحن: ${extra.shipping_company}`;
    if (extra?.tracking_number) msg += `\nرقم البوليصة: ${extra.tracking_number}`;
    msg += `\n\nيمكنك متابعة طلبك من حسابك على الموقع`;
    msg += `\n\nشكراً لتعاملك مع المصرية جروب 🚗`;
    return msg;
  },
  delivered: (orderNum) =>
    `🎉 تم تسليم طلبك #${orderNum} بنجاح!\n\nشكراً لتعاملك مع المصرية جروب 🚗\nنتمنى لك تجربة ممتازة!`,
  confirmed: (orderNum) =>
    `✅ تمت الموافقة على طلبك #${orderNum}\nيرجى استكمال الدفع لبدء التجهيز.\n\nالمصرية جروب 🚗`,
  processing: (orderNum) =>
    `✅ تم استلام الدفع وطلبك #${orderNum} قيد التجهيز الآن.\n\nالمصرية جروب 🚗`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    let orderId: string;
    let newStatus: string;
    let orderNumber: string | undefined;
    let userId: string | undefined;

    if (body.type === "UPDATE" && body.table === "orders" && body.record) {
      if (body.old_record?.status === body.record.status) {
        return new Response(JSON.stringify({ skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      orderId = body.record.id;
      newStatus = body.record.status;
      orderNumber = body.record.order_number;
      userId = body.record.user_id;
    } else {
      orderId = body.order_id;
      newStatus = body.new_status;
      orderNumber = body.order_number;
      userId = body.user_id;
    }

    if (!orderId || !newStatus) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only send WhatsApp for these statuses
    const msgBuilder = STATUS_MESSAGES[newStatus];
    if (!msgBuilder) {
      return new Response(JSON.stringify({ skipped: true, reason: `status ${newStatus} not configured` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order details if missing
    let shippingCompany: string | null = null;
    let trackingNumber: string | null = null;
    if (!orderNumber || !userId || newStatus === "shipped") {
      const { data: order } = await supabase
        .from("orders")
        .select("order_number, user_id, shipping_company, tracking_number")
        .eq("id", orderId)
        .single();
      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      orderNumber = order.order_number;
      userId = order.user_id;
      shippingCompany = order.shipping_company;
      trackingNumber = order.tracking_number;
    }

    // Get customer phone
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, full_name")
      .eq("user_id", userId)
      .single();

    if (!profile?.phone) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "no phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = msgBuilder(orderNumber!, { shipping_company: shippingCompany, tracking_number: trackingNumber });
    const customerResult = await sendWhatsAppText(profile.phone, message);
    if (!customerResult.ok) {
      console.error(
        `Order status WhatsApp failed to ${customerResult.formattedPhone}: ${customerResult.error} (template_required=${customerResult.requiresTemplate ? "yes" : "no"})`,
      );
    }

    // Also notify admins for shipped/delivered
    if (newStatus === "shipped" || newStatus === "delivered") {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins?.length) {
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("phone")
          .in("user_id", admins.map((a: any) => a.user_id));

        const statusLabel = newStatus === "shipped" ? "تم شحنه" : "تم تسليمه";
        const adminMsg = `📦 طلب #${orderNumber} — ${statusLabel}\nالعميل: ${profile.full_name || "—"}\nالتليفون: ${profile.phone}`;
        for (const p of adminProfiles || []) {
          if (p.phone) {
            const adminResult = await sendWhatsAppText(p.phone, adminMsg);
            if (!adminResult.ok) {
              console.error(
                `Admin status WhatsApp failed to ${adminResult.formattedPhone}: ${adminResult.error} (template_required=${adminResult.requiresTemplate ? "yes" : "no"})`,
              );
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: customerResult.ok,
      customer_requires_template: customerResult.requiresTemplate ?? false,
      customer_error: customerResult.ok ? null : customerResult.error,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
