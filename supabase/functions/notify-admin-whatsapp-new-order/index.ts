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
  if (!META_TOKEN || !META_PHONE_ID) {
    console.error("Missing WhatsApp credentials");
    return { success: false };
  }
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
      order_number,
      total_amount,
      customer_name,
      customer_phone,
      pickup_branch,
      shipping_governorate,
    } = body;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // جلب أرقام الموظفين المفعلين
    const { data: phones } = await supabase
      .from("admin_notification_phones")
      .select("phone, label")
      .eq("is_active", true)
      .eq("notify_new_orders", true);

    if (!phones || phones.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "لا توجد أرقام مفعلة" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const totalFmt = Number(total_amount).toLocaleString("ar-EG");
    const location = pickup_branch ? `استلام: ${pickup_branch}` : shipping_governorate ? `شحن: ${shipping_governorate}` : "";

    const message =
      `🆕 *طلب جديد - المصرية جروب*\n\n` +
      `📦 رقم الطلب: ${order_number}\n` +
      `👤 العميل: ${customer_name}\n` +
      `📱 الموبايل: ${customer_phone || "غير متاح"}\n` +
      `💰 الإجمالي: ${totalFmt} ج.م\n` +
      (location ? `📍 ${location}\n` : "") +
      `\n⚡ يرجى التواصل مع العميل خلال 15 دقيقة لتأكيد الطلب.`;

    const results = await Promise.allSettled(
      phones.map((p) => sendWhatsApp(p.phone, message)),
    );

    const sent = results.filter((r) => r.status === "fulfilled" && (r.value as any).success).length;

    return new Response(
      JSON.stringify({ success: true, sent, total: phones.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
