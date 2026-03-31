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

    // Find orders in awaiting_payment/confirmed/pending older than 48 hours
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: expiredOrders, error: fetchErr } = await supabase
      .from("orders")
      .select("id, order_number, user_id, total_amount, status")
      .in("status", ["awaiting_payment", "confirmed", "pending"])
      .lt("created_at", cutoff);

    if (fetchErr) {
      console.error("Error fetching expired orders:", fetchErr);
      return new Response(
        JSON.stringify({ error: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log("No expired orders found");
      return new Response(
        JSON.stringify({ cancelled: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cancelledIds: string[] = [];
    const notifications: any[] = [];

    for (const order of expiredOrders) {
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id);

      if (!updateErr) {
        cancelledIds.push(order.id);

        // Notify the dealer
        notifications.push({
          user_id: order.user_id,
          title: "⏰ تم إلغاء طلبك تلقائياً — #" + order.order_number,
          message: `تم إلغاء طلبك رقم ${order.order_number} بقيمة ${(Number(order.total_amount)).toLocaleString()} ج.م لعدم إتمام الدفع خلال 48 ساعة. يمكنك إعادة الطلب في أي وقت.`,
          type: "order",
        });

        console.log(`Cancelled expired order ${order.order_number}`);
      }
    }

    // Notify admins too
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (admins && cancelledIds.length > 0) {
      for (const admin of admins) {
        notifications.push({
          user_id: admin.user_id,
          title: `⏰ إلغاء تلقائي — ${cancelledIds.length} طلب`,
          message: `تم إلغاء ${cancelledIds.length} طلب تلقائياً لعدم الدفع خلال 48 ساعة.`,
          type: "order",
        });
      }
    }

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }

    console.log(`Cancelled ${cancelledIds.length} expired orders`);

    return new Response(
      JSON.stringify({ cancelled: cancelledIds.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("cancel-expired-orders error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
