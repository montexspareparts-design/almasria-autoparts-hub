import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendWhatsApp(phone: string, message: string) {
  const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
  if (!accessToken || !phoneNumberId) return { ok: false };

  let formatted = phone.replace(/[\s\-\(\)]/g, "");
  if (formatted.startsWith("+")) formatted = formatted.slice(1);
  if (formatted.startsWith("0")) formatted = "2" + formatted;
  if (/^\d{10}$/.test(formatted)) formatted = "2" + formatted;

  const resp = await fetch(
    `https://crm.whats-meta.com/api/meta/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formatted,
        type: "text",
        text: { body: message },
      }),
    }
  );
  const data = await resp.json();
  console.log(resp.ok ? `WhatsApp sent to ${formatted}` : `WhatsApp failed: ${JSON.stringify(data)}`);
  return { ok: resp.ok };
}

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

      await sendWhatsApp(profile.phone, msg);

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
