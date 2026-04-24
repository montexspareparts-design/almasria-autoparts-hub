import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppText } from "../_shared/whatsapp.ts";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 30 minutes threshold (was 24h previously)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get distinct users with cart items not updated in 30+ minutes
    const { data: staleCartUsers } = await supabase
      .from("dealer_cart_items")
      .select("user_id, updated_at")
      .lt("updated_at", thirtyMinutesAgo);

    if (!staleCartUsers || staleCartUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, reminded: 0, reason: "no stale carts" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = [...new Set(staleCartUsers.map((c) => c.user_id))];

    // Skip users already reminded in last 24h
    const { data: recentReminders } = await supabase
      .from("notifications")
      .select("user_id")
      .in("user_id", userIds)
      .eq("type", "cart_reminder")
      .gt("created_at", oneDayAgo);

    const alreadyReminded = new Set(
      (recentReminders || []).map((n) => n.user_id)
    );
    const usersToRemind = userIds.filter((id) => !alreadyReminded.has(id));

    if (usersToRemind.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          reminded: 0,
          reason: "all already reminded",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip users who placed an order in the last 24h
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("user_id")
      .in("user_id", usersToRemind)
      .gt("created_at", oneDayAgo);

    const orderedRecently = new Set(
      (recentOrders || []).map((o) => o.user_id)
    );
    const finalUsers = usersToRemind.filter((id) => !orderedRecently.has(id));

    // Pre-fetch all staff for notifications
    const { data: staffRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "moderator"]);
    const staffIds = (staffRoles || []).map((r) => r.user_id);

    let reminded = 0;
    let staffNotified = 0;

    for (const userId of finalUsers) {
      const { count } = await supabase
        .from("dealer_cart_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, full_name")
        .eq("user_id", userId)
        .single();

      const itemCount = count || 0;
      const customerName = profile?.full_name || "عميل";

      // Send WhatsApp to customer (if phone)
      if (profile?.phone) {
        const msg = `👋 أهلاً ${profile.full_name || ""}!\n\nلديك ${itemCount} منتج في سلة المشتريات بانتظارك 🛒\n\nأكمل طلبك الآن قبل نفاد الكمية:\nhttps://almasria-autoparts-hub.lovable.app/dealer\n\nالمصرية جروب 🚗`;

        const waResult = await sendWhatsAppText(profile.phone, msg);
        if (!waResult.ok) {
          console.error(
            `Abandoned cart WA failed: ${waResult.error} (template_required=${waResult.requiresTemplate ? "yes" : "no"})`
          );
        }

        // In-app notification for the customer
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "🛒 سلتك في انتظارك!",
          message: `لديك ${itemCount} منتج في السلة. أكمل طلبك الآن!`,
          type: "cart_reminder",
        });
        reminded++;
      }

      // Notify all staff about the abandoned cart lead
      if (staffIds.length > 0) {
        const phoneInfo = profile?.phone ? ` (${profile.phone})` : "";
        const staffNotifs = staffIds.map((sid) => ({
          user_id: sid,
          title: "🛒 عميل ساب السلة - متابعة فورية",
          message: `العميل "${customerName}"${phoneInfo} أضاف ${itemCount} منتج للسلة ولم يكمل الطلب منذ 30+ دقيقة. يحتاج متابعة! [user:${userId}]`,
          type: "cart_abandonment",
        }));
        await supabase.from("notifications").insert(staffNotifs);
        staffNotified += staffNotifs.length;
      }
    }

    console.log(
      `Cart abandonment: ${reminded} customers reminded, ${staffNotified} staff alerts sent`
    );

    return new Response(
      JSON.stringify({ success: true, reminded, staffNotified }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
