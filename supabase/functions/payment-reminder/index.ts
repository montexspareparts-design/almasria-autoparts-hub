import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendWhatsApp(to: string, body: string) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER") || "+14155238886";

  if (!accountSid || !authToken) {
    console.warn("Twilio credentials not configured, skipping WhatsApp");
    return null;
  }

  // Format Egyptian phone: remove leading 0, add +20
  let phone = to.replace(/\s+/g, "").replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "20" + phone.slice(1);
  if (!phone.startsWith("20")) phone = "20" + phone;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = btoa(`${accountSid}:${authToken}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: `whatsapp:+${phone}`,
        From: `whatsapp:${fromNumber}`,
        Body: body,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Twilio WhatsApp error:", data);
      return null;
    }
    console.log("WhatsApp sent to", phone, "sid:", data.sid);
    return data.sid;
  } catch (err) {
    console.error("WhatsApp send failed:", err);
    return null;
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

    // Find orders awaiting_payment for more than 24 hours
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

    if (!staleOrders || staleOrders.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending payment reminders needed", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let remindersSent = 0;
    let whatsappSent = 0;

    for (const order of staleOrders) {
      // Avoid duplicate reminders
      const { data: existingReminder } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", order.user_id)
        .eq("type", "payment_reminder")
        .ilike("message", `%${order.order_number}%`)
        .limit(1);

      if (existingReminder && existingReminder.length > 0) {
        continue;
      }

      const total = Number(order.total_amount).toLocaleString("ar-EG");

      // In-app notification to dealer
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "⏰ تذكير بالدفع",
        message: `تذكير: طلبك رقم ${order.order_number} بقيمة ${total} ج.م لا يزال بانتظار الدفع. يرجى إتمام الدفع لبدء التجهيز.`,
        type: "payment_reminder",
      });

      // Get dealer phone from dealer_applications
      const { data: dealerApp } = await supabase
        .from("dealer_applications")
        .select("phone, business_name")
        .eq("user_id", order.user_id)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();

      if (dealerApp?.phone) {
        const whatsappMsg =
          `⏰ تذكير بالدفع — المصرية جروب\n\n` +
          `مرحباً ${dealerApp.business_name}،\n` +
          `طلبك رقم #${order.order_number} بقيمة ${total} ج.م لا يزال بانتظار الدفع منذ أكثر من 24 ساعة.\n\n` +
          `يرجى إتمام الدفع (تحويل بنكي / InstaPay / محفظة) لبدء تجهيز طلبك.\n\n` +
          `للاستفسار تواصل معنا مباشرة 📞`;

        const sid = await sendWhatsApp(dealerApp.phone, whatsappMsg);
        if (sid) whatsappSent++;
      }

      // Notify admins
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: "⚠️ طلب معلق أكثر من 24 ساعة",
            message: `الطلب ${order.order_number} (${dealerApp?.business_name || "تاجر"}) بقيمة ${total} ج.م لم يتم سداده بعد مرور 24 ساعة.`,
            type: "warning",
          });
        }
      }

      remindersSent++;
    }

    return new Response(
      JSON.stringify({ success: true, remindersSent, whatsappSent }),
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
