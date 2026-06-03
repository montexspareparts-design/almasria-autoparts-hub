import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JOB_NAME = "reporter-daily-reminder";
const TARGET_CAIRO_HOUR = 17;

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
  };
}

async function claimScheduledDispatch(supabase: ReturnType<typeof createClient>, dispatchDate: string, hour: number) {
  const { error } = await supabase.from("reporter_schedule_dispatches").insert({
    job_name: JOB_NAME,
    dispatch_date: dispatchDate,
    dispatch_hour: hour,
    trigger_source: "cron",
    notes: "daily reminder",
  });

  if (!error) return true;
  if (error.code === "23505") return false;
  throw error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const payload = await req.json().catch(() => ({}));
    const cairoNow = getCairoNowParts();
    const isCronTrigger = payload.trigger === "cron";
    const force = payload.force === true;

    if (isCronTrigger && !force && (cairoNow.hour !== TARGET_CAIRO_HOUR || cairoNow.minute >= 15)) {
      return new Response(JSON.stringify({ success: true, notified: 0, reason: "outside_cairo_window", cairo_time: `${cairoNow.date} ${cairoNow.timeLabel}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isCronTrigger && !force) {
      const claimed = await claimScheduledDispatch(supabase, cairoNow.date, cairoNow.hour);
      if (!claimed) {
        return new Response(JSON.stringify({ success: true, notified: 0, reason: "already_dispatched", report_date: cairoNow.date }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get all reporter users
    const { data: reporters } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "reporter");

    if (!reporters || reporters.length === 0) {
      return new Response(JSON.stringify({ success: true, notified: 0, reason: "no_reporters" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reporterIds = reporters.map((r) => r.user_id);

    // Get reporters who already submitted today
    const { data: submitted } = await supabase
      .from("reporter_daily_reports")
      .select("user_id")
      .eq("report_date", cairoNow.date)
      .eq("is_submitted", true)
      .in("user_id", reporterIds);

    const submittedIds = new Set((submitted || []).map((s) => s.user_id));
    const pendingIds = reporterIds.filter((id) => !submittedIds.has(id));

    if (pendingIds.length === 0) {
      return new Response(JSON.stringify({ success: true, notified: 0, reason: "all_submitted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert in-app notifications (works while user has the site open)
    const rows = pendingIds.map((uid) => ({
      user_id: uid,
      title: "⏰ تذكير: تقرير اليوم",
      message: "لسه ما سلّمتش تقرير اليوم. افتح صفحة التقرير وكمّل الإجابات قبل آخر اليوم.",
      type: "reporter_reminder",
    }));

    await supabase.from("notifications").insert(rows);

    return new Response(
      JSON.stringify({ success: true, notified: pendingIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("reporter-daily-reminder error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
