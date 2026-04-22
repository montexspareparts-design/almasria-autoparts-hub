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

    // Find users with cart items older than 24 hours who haven't ordered in the last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get distinct users with stale cart items
    const { data: staleCartUsers } = await supabase
      .from("dealer_cart_items")
      .select("user_id, created_at")
      .lt("updated_at", twentyFourHoursAgo);

    if (!staleCartUsers || staleCartUsers.length === 0) {
      return new Response(JSON.stringify({ success: true, reminded: 0, reason: "no stale carts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unique user IDs
    const userIds = [...new Set(staleCartUsers.map(c => c.user_id))];

    // Check which users already received a reminder in the last 24h (via notifications)
    const { data: recentReminders } = await supabase
      .from("notifications")
      .select("user_id")
      .in("user_id", userIds)
      .eq("type", "cart_reminder")
      .gt("created_at", twentyFourHoursAgo);

    const alreadyReminded = new Set((recentReminders || []).map(n => n.user_id));
    const usersToRemind = userIds.filter(id => !alreadyReminded.has(id));

    if (usersToRemind.length === 0) {
      return new Response(JSON.stringify({ success: true, reminded: 0, reason: "all already reminded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also check which users placed an order in the last 24h
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("user_id")
      .in("user_id", usersToRemind)
      .gt("created_at", twentyFourHoursAgo);

    const orderedRecently = new Set((recentOrders || []).map(o => o.user_id));
    const finalUsers = usersToRemind.filter(id => !orderedRecently.has(id));

    let reminded = 0;
    for (const userId of finalUsers) {
      // Get cart item count for this user
      const { count } = await supabase
        .from("dealer_cart_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, full_name")
        .eq("user_id", userId)
        .single();

      if (!profile?.phone) continue;

      const itemCount = count || 0;
      const msg = `👋 أهلاً ${profile.full_name || ""}!\n\nلديك ${itemCount} منتج في سلة المشتريات بانتظارك 🛒\n\nأكمل طلبك الآن قبل نفاد الكمية:\nhttps://almasria-autoparts-hub.lovable.app/dealer\n\nالمصرية جروب 🚗`;

      const waResult = await sendWhatsAppText(profile.phone, msg);
      if (!waResult.ok) {
        console.error(
          `Abandoned cart WhatsApp failed to ${waResult.formattedPhone}: ${waResult.error} (template_required=${waResult.requiresTemplate ? "yes" : "no"})`,
        );
        continue;
      }

      // Create in-app notification too
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "🛒 سلتك في انتظارك!",
        message: `لديك ${itemCount} منتج في السلة. أكمل طلبك الآن!`,
        type: "cart_reminder",
      });

      reminded++;
    }

    console.log(`Abandoned cart reminders sent: ${reminded}`);

    return new Response(JSON.stringify({ success: true, reminded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
