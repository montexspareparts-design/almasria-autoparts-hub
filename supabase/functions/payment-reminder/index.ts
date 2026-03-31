import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendWhatsApp(phone: string, message: string) {
  const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
  if (!accessToken || !phoneNumberId) return;

  let formatted = phone.replace(/[\s\-\(\)]/g, "");
  if (formatted.startsWith("+")) formatted = formatted.slice(1);
  if (formatted.startsWith("0")) formatted = "2" + formatted;
  if (/^\d{10}$/.test(formatted)) formatted = "2" + formatted;

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formatted,
          type: "text",
          text: { body: message },
        }),
      }
    );
    const data = await resp.json();
    if (resp.ok) {
      console.log(`WhatsApp sent to ${formatted}`);
    } else {
      console.error(`WhatsApp failed:`, JSON.stringify(data));
    }
  } catch (err) {
    console.error("WhatsApp send error:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ─── 30-min WhatsApp reminder ────────────────────────────────────────
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Orders created 30-60 min ago still awaiting payment (window to avoid re-sending)
    const { data: recentUnpaid } = await supabase
      .from("orders")
      .select("id, order_number, user_id, total_amount, created_at")
      .eq("status", "awaiting_payment")
      .lt("created_at", thirtyMinAgo)
      .gt("created_at", sixtyMinAgo);

    let whatsappRemindersSent = 0;

    for (const order of recentUnpaid || []) {
      // Check if already sent a WhatsApp reminder notification for this order
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", order.user_id)
        .eq("type", "payment_reminder_whatsapp")
        .ilike("message", `%${order.order_number}%`)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Get customer phone
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", order.user_id)
        .maybeSingle();

      if (profile?.phone) {
        const amount = Number(order.total_amount).toLocaleString("ar-EG");
        const paymentLink = `${supabaseUrl.replace('.supabase.co', '')}/payment?order_id=${order.id}&amount=${order.total_amount}`;

        // Use the published app URL from site_settings or fallback
        const { data: siteSetting } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "app_base_url")
          .maybeSingle();

        const baseUrl = siteSetting?.value || "https://almasria-autoparts-hub.lovable.app";
        const link = `${baseUrl}/payment?order_id=${order.id}&amount=${order.total_amount}`;

        const msg = `Reminder ⏰\nطلبك رقم ${order.order_number} لم يتم دفعه بعد\nالإجمالي ${amount} جنيه\n\nادفع من هنا:\n${link}`;

        await sendWhatsApp(profile.phone, msg);

        // Mark as sent to avoid duplicates
        await supabase.from("notifications").insert({
          user_id: order.user_id,
          title: "⏰ تذكير بالدفع",
          message: `تذكير: طلبك رقم ${order.order_number} بقيمة ${amount} ج.م لا يزال بانتظار الدفع.`,
          type: "payment_reminder_whatsapp",
        });

        whatsappRemindersSent++;
      }
    }

    // ─── 24-hour in-app reminder (existing logic) ────────────────────────
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: staleOrders, error } = await supabase
      .from("orders")
      .select("id, order_number, user_id, total_amount, updated_at")
      .eq("status", "awaiting_payment")
      .lt("updated_at", twentyFourHoursAgo);

    if (error) {
      console.error("Error fetching stale orders:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let remindersSent = 0;

    for (const order of staleOrders || []) {
      const { data: existingReminder } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", order.user_id)
        .eq("type", "warning")
        .ilike("message", `%${order.order_number}%تذكير%`)
        .limit(1);

      if (existingReminder && existingReminder.length > 0) continue;

      const total = Number(order.total_amount).toLocaleString("ar-EG");

      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "⏰ تذكير بالدفع",
        message: `تذكير: طلبك رقم ${order.order_number} بقيمة ${total} ج.م لا يزال بانتظار الدفع. يرجى إتمام الدفع لبدء التجهيز.`,
        type: "warning",
      });

      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: "⚠️ طلب معلق أكثر من 24 ساعة",
            message: `الطلب ${order.order_number} بقيمة ${total} ج.م لم يتم سداده بعد مرور 24 ساعة.`,
            type: "warning",
          });
        }
      }

      remindersSent++;
    }

    return new Response(
      JSON.stringify({ success: true, whatsappRemindersSent, inAppRemindersSent: remindersSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Payment reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
