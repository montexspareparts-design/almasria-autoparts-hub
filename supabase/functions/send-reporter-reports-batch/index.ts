import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function processBatch() {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const cairoNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
    const today = cairoNow.toISOString().slice(0, 10);

    const { data: reports, error } = await supabase
      .from("reporter_daily_reports")
      .select("id")
      .eq("report_date", today)
      .eq("is_submitted", true);
    if (error) throw error;

    console.log(`[batch] sending ${reports?.length || 0} reports for ${today}`);
    for (const r of reports || []) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/notify-reporter-report-whatsapp`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
            body: JSON.stringify({ report_id: r.id }),
          },
        );
        console.log(`[batch] report ${r.id} -> ${res.status}`);
      } catch (e) {
        console.error(`[batch] report ${r.id} failed:`, e);
      }
    }
  } catch (err) {
    console.error("[batch] fatal:", err);
  }
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // @ts-ignore EdgeRuntime is available in Supabase Edge runtime
  EdgeRuntime.waitUntil(processBatch());
  return new Response(
    JSON.stringify({ success: true, queued: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
