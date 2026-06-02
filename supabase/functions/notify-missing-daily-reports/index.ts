import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const META_TOKEN = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
const META_PHONE_ID = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
const RECIPIENT_PHONE = "01020412358";

function formatEgyptianPhone(p: string): string {
  let c = p.replace(/[\s\-()+]/g, "").replace(/^0020/, "").replace(/^002/, "");
  if (c.startsWith("0")) c = "2" + c;
  if (/^1\d{9}$/.test(c)) c = "20" + c;
  return c;
}

async function sendWhatsApp(toPhone: string, message: string) {
  if (!META_TOKEN || !META_PHONE_ID) return { ok: false, error: "missing_credentials" };
  const res = await fetch(`https://graph.facebook.com/v21.0/${META_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: formatEgyptianPhone(toPhone),
      type: "text",
      text: { body: message },
    }),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function processMissing() {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Today's date in Africa/Cairo
    const cairoNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
    const today = cairoNow.toISOString().slice(0, 10);
    const dateLabel = cairoNow.toLocaleDateString("ar-EG", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    // Active reporters (admins + moderators + reporters)
    const { data: staffRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "moderator", "reporter"]);
    const staffIds = Array.from(new Set((staffRoles ?? []).map((r: any) => r.user_id)));
    if (staffIds.length === 0) return;

    // Who already submitted today's reporter daily report
    const { data: submitted } = await supabase
      .from("reporter_daily_reports")
      .select("user_id")
      .eq("report_date", today)
      .eq("is_submitted", true)
      .in("user_id", staffIds);
    const submittedSet = new Set((submitted ?? []).map((r: any) => r.user_id));
    const missing = staffIds.filter((id) => !submittedSet.has(id));

    if (missing.length === 0) {
      await sendWhatsApp(RECIPIENT_PHONE,
        `✅ *تقارير الموظفين - ${dateLabel}*\n━━━━━━━━━━━━━━━\nكل الموظفين قدّموا التقرير اليومي.`
      );
      return;
    }

    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", missing);
    const nameMap = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name || p.email || "موظف"]));
    const namesList = missing.map((id, i) => `${i + 1}. ${nameMap.get(id) || "موظف"}`).join("\n");

    const message =
      `⚠️ *موظفون لم يقدّموا التقرير اليومي*\n` +
      `📅 ${dateLabel}\n` +
      `━━━━━━━━━━━━━━━\n` +
      `عدد المتأخرين: ${missing.length}\n\n` +
      `${namesList}\n` +
      `━━━━━━━━━━━━━━━`;

    const waResult = await sendWhatsApp(RECIPIENT_PHONE, message);
    console.log(`[missing] WhatsApp sent: ${waResult.ok}, missing: ${missing.length}`);

    // Also notify the staff themselves
    const staffNotifs = missing.map((uid) => ({
      user_id: uid,
      title: "⏰ لم تُقدّم تقرير اليوم",
      message: `الساعة 9 مساءً ولم نستلم تقريرك اليومي عن ${dateLabel}. الرجاء استكماله الآن.`,
      type: "warning",
    }));
    await supabase.from("notifications").insert(staffNotifs);
  } catch (e) {
    console.error("[missing] fatal:", e);
  }
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // @ts-ignore EdgeRuntime
  EdgeRuntime.waitUntil(processMissing());
  return new Response(JSON.stringify({ ok: true, queued: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
