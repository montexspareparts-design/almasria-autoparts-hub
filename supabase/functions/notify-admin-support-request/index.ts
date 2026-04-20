import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_TOKEN = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
const META_PHONE_ID = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function formatEgyptianPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()+]/g, "");
  cleaned = cleaned.replace(/^002/, "").replace(/^0020/, "");
  if (cleaned.startsWith("0")) cleaned = "2" + cleaned;
  if (/^1\d{9}$/.test(cleaned)) cleaned = "20" + cleaned;
  return cleaned;
}

async function sendWhatsApp(toPhone: string, message: string) {
  if (!META_TOKEN || !META_PHONE_ID) return { success: false };
  const formatted = formatEgyptianPhone(toPhone);
  try {
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
          to: formatted,
          type: "text",
          text: { body: message },
        }),
      },
    );
    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return { success: false, error: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      customer_name = "عميل",
      customer_phone = "",
      message = "",
      request_type = "chatbot_contact",
      is_dealer = false,
    } = body || {};

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get admin notification phones
    const { data: phones } = await supabase
      .from("admin_notification_phones")
      .select("phone, label")
      .eq("is_active", true)
      .eq("notify_new_orders", true);

    if (!phones || phones.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabel =
      request_type === "chatbot_contact"
        ? "🤖 طلب تواصل من الشات بوت"
        : request_type === "callback"
          ? "📞 طلب اتصال"
          : "💬 طلب دعم";

    const dealerTag = is_dealer ? " (تاجر)" : "";
    const text = `${typeLabel}${dealerTag}

👤 العميل: ${customer_name}
📱 رقم العميل: ${customer_phone || "غير محدد"}

💬 الرسالة:
${(message || "").slice(0, 300)}

⚡ افتح لوحة الإدارة للرد فوراً:
https://almasriaautoparts.com/admin?section=daily-dashboard`;

    const results = await Promise.all(
      phones.map((p: any) => sendWhatsApp(p.phone, text)),
    );
    const sent = results.filter((r) => r.success).length;

    // Also send Browser Push notification to all staff (parallel, non-blocking)
    supabase.functions
      .invoke("notify-staff-push", {
        body: {
          title: `${typeLabel}${dealerTag}`,
          message: `${customer_name} — ${(message || "بدون تفاصيل").slice(0, 120)}`,
          url: "/admin?section=daily-dashboard",
          tag: `support-${Date.now()}`,
        },
      })
      .catch((e) => console.error("Staff push failed:", e));

    return new Response(JSON.stringify({ success: true, sent, total: phones.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-admin-support-request error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
