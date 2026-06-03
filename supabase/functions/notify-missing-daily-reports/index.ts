import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const META_TOKEN = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
const META_PHONE_ID = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
const RECIPIENT_PHONE = "01020412358";
const JOB_NAME = "notify-missing-daily-reports";
const TARGET_CAIRO_HOUR = 21;

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

function getCairoNowParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    timeLabel: `${parts.hour}:${parts.minute}:${parts.second}`,
    dateLabel: new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date()),
  };
}

async function claimScheduledDispatch(supabase: ReturnType<typeof createClient>, dispatchDate: string, hour: number) {
  const { error } = await supabase.from("reporter_schedule_dispatches").insert({
    job_name: JOB_NAME,
    dispatch_date: dispatchDate,
    dispatch_hour: hour,
    trigger_source: "cron",
    notes: "missing daily reports alert",
  });

  if (!error) return true;
  if (error.code === "23505") return false;
  throw error;
}

async function processMissing(payload: { force?: boolean; trigger?: string } = {}) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const cairoNow = getCairoNowParts();
  const isCronTrigger = payload.trigger === "cron";
  const force = payload.force === true;

  if (isCronTrigger && !force && (cairoNow.hour !== TARGET_CAIRO_HOUR || cairoNow.minute >= 15)) {
    return {
      ok: true,
      skipped: true,
      reason: "outside_cairo_window",
      cairo_time: `${cairoNow.date} ${cairoNow.timeLabel}`,
    };
  }

  if (isCronTrigger && !force) {
    const claimed = await claimScheduledDispatch(supabase, cairoNow.date, cairoNow.hour);
    if (!claimed) {
      return { ok: true, skipped: true, reason: "already_dispatched", report_date: cairoNow.date };
    }
  }

  const { data: staffRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "moderator", "reporter"]);
  const staffIds = Array.from(new Set((staffRoles ?? []).map((role: any) => role.user_id)));
  if (staffIds.length === 0) return { ok: true, skipped: true, reason: "no_staff" };

  const { data: submitted } = await supabase
    .from("reporter_daily_reports")
    .select("user_id")
    .eq("report_date", cairoNow.date)
    .eq("is_submitted", true)
    .in("user_id", staffIds);
  const submittedSet = new Set((submitted ?? []).map((row: any) => row.user_id));
  const missing = staffIds.filter((id) => !submittedSet.has(id));

  if (missing.length === 0) {
    const waResult = await sendWhatsApp(
      RECIPIENT_PHONE,
      `✅ *تقارير الموظفين - ${cairoNow.dateLabel}*\n━━━━━━━━━━━━━━━\nكل الموظفين قدّموا التقرير اليومي.`,
    );
    return { ok: waResult.ok, missing: 0, report_date: cairoNow.date };
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, email")
    .in("user_id", missing);
  const nameMap = new Map((profiles ?? []).map((profile: any) => [profile.user_id, profile.full_name || profile.email || "موظف"]));
  const namesList = missing.map((id, index) => `${index + 1}. ${nameMap.get(id) || "موظف"}`).join("\n");

  const message =
    `⚠️ *موظفون لم يقدّموا التقرير اليومي*\n` +
    `📅 ${cairoNow.dateLabel}\n` +
    `━━━━━━━━━━━━━━━\n` +
    `عدد المتأخرين: ${missing.length}\n\n` +
    `${namesList}\n` +
    `━━━━━━━━━━━━━━━`;

  const waResult = await sendWhatsApp(RECIPIENT_PHONE, message);
  console.log(`[missing] WhatsApp sent: ${waResult.ok}, missing: ${missing.length}`);

  const staffNotifs = missing.map((uid) => ({
    user_id: uid,
    title: "⏰ لم تُقدّم تقرير اليوم",
    message: `الساعة 9 مساءً ولم نستلم تقريرك اليومي عن ${cairoNow.dateLabel}. الرجاء استكماله الآن.`,
    type: "warning",
  }));
  await supabase.from("notifications").insert(staffNotifs);

  return { ok: waResult.ok, missing: missing.length, report_date: cairoNow.date };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json().catch(() => ({}));
    const result = await processMissing(payload);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.ok ? 200 : 500,
    });
  } catch (error) {
    console.error("[missing] fatal:", error);
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
