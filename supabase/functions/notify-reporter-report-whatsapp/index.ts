import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_TOKEN = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
const META_PHONE_ID = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Hard-coded recipient as requested
const RECIPIENT_PHONE = "01020412358";

const PROBLEM_LABELS: Record<string, string> = {
  price: "السعر",
  unavailable: "عدم التوافر",
  delay: "التأخير",
  no_response: "العميل لم يرد",
  system_issue: "مشكلة في السيستم",
};

function formatEgyptianPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()+]/g, "");
  cleaned = cleaned.replace(/^0020/, "").replace(/^002/, "");
  if (cleaned.startsWith("0")) cleaned = "2" + cleaned;
  if (/^1\d{9}$/.test(cleaned)) cleaned = "20" + cleaned;
  return cleaned;
}

async function sendWhatsApp(toPhone: string, message: string) {
  if (!META_TOKEN || !META_PHONE_ID) {
    console.error("Missing WhatsApp credentials");
    return { success: false, error: "missing_credentials" };
  }
  const formatted = formatEgyptianPhone(toPhone);
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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { report_id } = await req.json();
    if (!report_id) {
      return new Response(JSON.stringify({ error: "report_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: report, error } = await supabase
      .from("reporter_daily_reports")
      .select("*")
      .eq("id", report_id)
      .maybeSingle();

    if (error || !report) {
      return new Response(JSON.stringify({ error: "report_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", report.user_id)
      .maybeSingle();

    const staffName = profile?.full_name || profile?.email || "موظف الفيصل";
    const dateStr = new Date(report.report_date).toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const problemLabel = report.main_problem
      ? PROBLEM_LABELS[report.main_problem] || report.main_problem
      : "—";

    const salesFmt = Number(report.auto_total_sales || 0).toLocaleString("ar-EG");

    const message =
      `📋 *تقرير يومي - الفيصل*\n` +
      `━━━━━━━━━━━━━━━\n` +
      `👤 الموظف: ${staffName}\n` +
      `📅 التاريخ: ${dateStr}\n` +
      `━━━━━━━━━━━━━━━\n\n` +
      `🔹 *تلقائي من السيستم:*\n` +
      `📦 الطلبات: ${report.auto_orders_count}\n` +
      `🧾 الفواتير: ${report.auto_invoices_count}\n` +
      `💰 إجمالي المبيعات: ${salesFmt} ج.م\n\n` +
      `🔹 *تقرير الموظف:*\n` +
      `📊 عروض الأسعار: ${report.quotations_count}\n` +
      `📞 المكالمات: ${report.calls_count}\n` +
      `💬 عملاء واتساب: ${report.whatsapp_count}\n` +
      `📤 عروض/كشوف مرسلة: ${report.offers_sent_count}\n` +
      `✅ تحوّلت لطلبات: ${report.offers_converted_count}\n` +
      `❌ طلبات لم تكتمل: ${report.incomplete_orders_count}\n` +
      `👥 عملاء تمت متابعتهم: ${report.followups_count}\n` +
      `🆕 عملاء جدد: ${report.new_customers_count}\n` +
      `🎯 مهتمين ولم يتم إغلاقهم: ${report.lost_opportunities_count}\n` +
      `⚠️ أكبر مشكلة اليوم: ${problemLabel}\n` +
      `━━━━━━━━━━━━━━━`;

    const result = await sendWhatsApp(RECIPIENT_PHONE, message);

    return new Response(
      JSON.stringify({ success: result.success, recipient: RECIPIENT_PHONE }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("notify-reporter-report-whatsapp error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
