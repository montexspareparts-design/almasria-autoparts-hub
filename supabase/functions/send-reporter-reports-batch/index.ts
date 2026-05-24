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

    // Today's date in Africa/Cairo
    const cairoNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
    const today = cairoNow.toISOString().slice(0, 10);

    const { data: reports, error } = await supabase
      .from("reporter_daily_reports")
      .select("id")
      .eq("report_date", today)
      .eq("is_submitted", true);

    if (error) throw error;

    const results: any[] = [];
    for (const r of reports || []) {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/notify-reporter-report-whatsapp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ report_id: r.id }),
        },
      );
      results.push({ id: r.id, ok: res.ok });
    }

    return new Response(
      JSON.stringify({ success: true, date: today, sent: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-reporter-reports-batch error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
