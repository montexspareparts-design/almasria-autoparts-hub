import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find orders that have been awaiting_payment for more than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: staleOrders, error } = await supabase
      .from("orders")
      .select("id, order_number, user_id, total_amount, updated_at")
      .eq("status", "awaiting_payment")
      .lt("updated_at", twentyFourHoursAgo);

    if (error) {
      console.error("Error fetching stale orders:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!staleOrders || staleOrders.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending payment reminders needed", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let remindersSent = 0;

    for (const order of staleOrders) {
      // Check if we already sent a reminder for this order (avoid spam)
      const { data: existingReminder } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", order.user_id)
        .eq("type", "warning")
        .ilike("message", `%${order.order_number}%تذكير%`)
        .limit(1);

      if (existingReminder && existingReminder.length > 0) {
        continue; // Already reminded
      }

      const total = Number(order.total_amount).toLocaleString("ar-EG");

      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "⏰ تذكير بالدفع",
        message: `تذكير: طلبك رقم ${order.order_number} بقيمة ${total} ج.م لا يزال بانتظار الدفع. يرجى إتمام الدفع لبدء التجهيز.`,
        type: "warning",
      });

      // Also notify admins about stale payment
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: "⚠️ طلب معلق أكثر من 24 ساعة",
            message: `الطلب ${order.order_number} بقيمة ${total} ج.م لم يتم سداده بعد مرور 24 ساعة.`,
            type: "warning",
          });
        }
      }

      remindersSent++;
    }

    return new Response(
      JSON.stringify({ success: true, remindersSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Payment reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
