import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const today = new Date().toISOString().slice(0, 10);

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
      .eq("report_date", today)
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
