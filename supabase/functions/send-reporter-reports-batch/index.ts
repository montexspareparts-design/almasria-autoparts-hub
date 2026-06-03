import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JOB_NAME = "send-reporter-reports-batch";
const TARGET_CAIRO_HOUR = 18;

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
    notes: "auto batch delivery",
  });

  if (!error) return true;
  if (error.code === "23505") return false;
  throw error;
}

async function processBatch(payload: { force?: boolean; trigger?: string } = {}) {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const cairoNow = getCairoNowParts();
  const isCronTrigger = payload.trigger === "cron";
  const force = payload.force === true;

  if (isCronTrigger && !force && (cairoNow.hour !== TARGET_CAIRO_HOUR || cairoNow.minute >= 15)) {
    return {
      success: true,
      skipped: true,
      reason: "outside_cairo_window",
      cairo_time: `${cairoNow.date} ${cairoNow.timeLabel}`,
    };
  }

  if (isCronTrigger && !force) {
    const claimed = await claimScheduledDispatch(supabase, cairoNow.date, cairoNow.hour);
    if (!claimed) {
      return {
        success: true,
        skipped: true,
        reason: "already_dispatched",
        report_date: cairoNow.date,
      };
    }
  }

  const { data: reports, error } = await supabase
    .from("reporter_daily_reports")
    .select("id")
    .eq("report_date", cairoNow.date)
    .eq("is_submitted", true)
    .order("created_at", { ascending: true });
  if (error) throw error;

  console.log(`[batch] sending ${reports?.length || 0} reports for ${cairoNow.date}`);

  let sent = 0;
  let failed = 0;

  for (const report of reports || []) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/notify-reporter-report-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ report_id: report.id }),
      });
      const responseText = await res.text();

      if (res.ok) sent += 1;
      else failed += 1;

      console.log(`[batch] report ${report.id} -> ${res.status} ${responseText}`);
    } catch (error) {
      failed += 1;
      console.error(`[batch] report ${report.id} failed:`, error);
    }
  }

  return {
    success: failed === 0,
    report_date: cairoNow.date,
    total: reports?.length || 0,
    sent,
    failed,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json().catch(() => ({}));
    const result = await processBatch(payload);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[batch] fatal:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
