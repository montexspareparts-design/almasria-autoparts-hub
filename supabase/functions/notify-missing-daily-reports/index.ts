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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Yesterday's date in Africa/Cairo timezone
    const now = new Date();
    const cairoNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
    const yesterday = new Date(cairoNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const yDate = yesterday.toISOString().slice(0, 10);
    const yLabel = yesterday.toLocaleDateString("ar-EG", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    // 1) All staff (admins + moderators)
    const { data: staffRoles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "moderator"]);
    if (rolesErr) throw rolesErr;

    const staffIds = Array.from(new Set((staffRoles ?? []).map((r: any) => r.user_id)));
    if (staffIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, reminded: 0, reason: "no staff" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Who already submitted yesterday
    const { data: submitted, error: subErr } = await supabase
      .from("staff_daily_reports")
      .select("staff_user_id")
      .eq("report_date", yDate)
      .in("staff_user_id", staffIds);
    if (subErr) throw subErr;

    const submittedSet = new Set((submitted ?? []).map((r: any) => r.staff_user_id));
    const missing = staffIds.filter((id) => !submittedSet.has(id));

    if (missing.length === 0) {
      return new Response(JSON.stringify({ ok: true, reminded: 0, message: "كل الموظفين قدّموا" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Build staff reminder notifications + admin summary
    const staffNotifs = missing.map((uid) => ({
      user_id: uid,
      title: "⏰ لم تُقدّم تقرير أمس",
      message: `لم نستلم تقريرك اليومي عن ${yLabel}. الرجاء استكمال التقرير قبل الساعة 11 صباحاً اليوم.`,
      type: "warning",
    }));

    // Fetch missing staff names for admin summary
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", missing);
    const nameMap = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name || p.email || "موظف"]));
    const namesList = missing.map((id) => nameMap.get(id) || "موظف").join("، ");

    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminNotifs = (admins ?? []).map((a: any) => ({
      user_id: a.user_id,
      title: "📋 موظفون لم يقدّموا تقرير أمس",
      message: `${missing.length} موظف لم يقدّم تقرير ${yLabel}: ${namesList}`,
      type: "warning",
    }));

    const { error: insErr } = await supabase
      .from("notifications")
      .insert([...staffNotifs, ...adminNotifs]);
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ ok: true, reminded: missing.length, date: yDate }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("notify-missing-daily-reports error:", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
