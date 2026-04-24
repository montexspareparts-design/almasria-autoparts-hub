import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_TOKEN = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
const META_PHONE_ID = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Thresholds (minutes)
const STALL_THRESHOLD_MIN = 90;     // No successful sync in 90 min => stalled
const FAILURE_WINDOW_MIN = 30;      // Look at last 30 min of logs
const FAILURE_COUNT_THRESHOLD = 3;  // 3+ failures in window => alert

function formatEgyptianPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()+]/g, "");
  cleaned = cleaned.replace(/^002/, "").replace(/^0020/, "");
  if (cleaned.startsWith("0")) cleaned = "2" + cleaned;
  if (/^1\d{9}$/.test(cleaned)) cleaned = "20" + cleaned;
  return cleaned;
}

async function sendWhatsApp(toPhone: string, message: string) {
  if (!META_TOKEN || !META_PHONE_ID) return { success: false };
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
    return { success: res.ok };
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return { success: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const now = new Date();
    const failureWindow = new Date(now.getTime() - FAILURE_WINDOW_MIN * 60_000).toISOString();
    const stallWindow = new Date(now.getTime() - STALL_THRESHOLD_MIN * 60_000).toISOString();

    const alerts: Array<{
      key: string;
      type: string;
      sync_type: string | null;
      title: string;
      body: string;
      details: any;
    }> = [];

    // 1) Check for repeated FAILURES per sync_type in the recent window
    const { data: recentLogs } = await supabase
      .from("erp_sync_logs")
      .select("sync_type, status, error_message, reference_number, created_at")
      .gte("created_at", failureWindow);

    if (recentLogs && recentLogs.length > 0) {
      const failuresByType = new Map<string, any[]>();
      for (const log of recentLogs) {
        if (log.status === "failed" || log.status === "error") {
          const arr = failuresByType.get(log.sync_type) || [];
          arr.push(log);
          failuresByType.set(log.sync_type, arr);
        }
      }

      for (const [syncType, fails] of failuresByType) {
        if (fails.length >= FAILURE_COUNT_THRESHOLD) {
          // Bucket alert per hour to avoid spam
          const hourBucket = now.toISOString().slice(0, 13);
          const sample = fails[0];
          alerts.push({
            key: `failures:${syncType}:${hourBucket}`,
            type: "repeated_failures",
            sync_type: syncType,
            title: "🚨 فشل متكرر في مزامنة ERP",
            body: `حدث ${fails.length} فشل في "${syncType}" خلال آخر ${FAILURE_WINDOW_MIN} دقيقة.\n\nآخر خطأ:\n${(sample.error_message || "غير محدد").slice(0, 200)}\n\nراجع لوحة الإدارة الآن.`,
            details: { count: fails.length, sample_error: sample.error_message, sample_ref: sample.reference_number },
          });
        }
      }
    }

    // 2) Check for STALL - no successful sync in threshold window
    const { data: lastSuccess } = await supabase
      .from("erp_sync_logs")
      .select("created_at, sync_type")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: anyLog } = await supabase
      .from("erp_sync_logs")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (anyLog && (!lastSuccess || lastSuccess.created_at < stallWindow)) {
      const lastSuccessAt = lastSuccess?.created_at || "غير معروف";
      const stallHourBucket = now.toISOString().slice(0, 13);
      alerts.push({
        key: `stall:global:${stallHourBucket}`,
        type: "stalled",
        sync_type: null,
        title: "⏰ مزامنة ERP متوقفة",
        body: `لم تُسجَّل أي مزامنة ناجحة منذ أكثر من ${STALL_THRESHOLD_MIN} دقيقة.\n\nآخر نجاح: ${lastSuccessAt}\n\nقد يكون هناك مشكلة في الاتصال بنظام الفيصل.`,
        details: { last_success_at: lastSuccessAt },
      });
    }

    if (alerts.length === 0) {
      return new Response(JSON.stringify({ success: true, alerts: 0, checked_at: now.toISOString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin phones + admin user_ids
    const [{ data: phones }, { data: adminRoles }] = await Promise.all([
      supabase.from("admin_notification_phones").select("phone").eq("is_active", true),
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
    ]);

    let totalSent = 0;
    let totalAlerts = 0;

    for (const alert of alerts) {
      // Dedupe via unique alert_key insert
      const { error: insertErr } = await supabase
        .from("erp_sync_alerts")
        .insert({
          alert_key: alert.key,
          alert_type: alert.type,
          sync_type: alert.sync_type,
          details: alert.details,
        });

      if (insertErr) {
        // Already alerted in this bucket — skip
        continue;
      }

      totalAlerts++;
      const fullBody = `${alert.body}\n\n🔗 https://almasriaautoparts.com/admin?section=erp-sync-status`;

      // WhatsApp to admin phones
      if (phones && phones.length > 0) {
        const results = await Promise.all(phones.map((p: any) => sendWhatsApp(p.phone, `${alert.title}\n\n${fullBody}`)));
        totalSent += results.filter((r) => r.success).length;
      }

      // In-app notifications to all admins
      if (adminRoles && adminRoles.length > 0) {
        const notifs = adminRoles.map((r: any) => ({
          user_id: r.user_id,
          title: alert.title,
          message: alert.body.slice(0, 500),
          type: "erp_sync_alert",
        }));
        await supabase.from("notifications").insert(notifs);
      }

      // Update notified_admins counter
      await supabase
        .from("erp_sync_alerts")
        .update({ notified_admins: totalSent })
        .eq("alert_key", alert.key);
    }

    return new Response(
      JSON.stringify({ success: true, alerts: totalAlerts, whatsapp_sent: totalSent, checked_at: now.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("monitor-erp-sync-failures error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
