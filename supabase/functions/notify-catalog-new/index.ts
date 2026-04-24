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

    // ─── Admin Authentication Check ─────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden — admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ─── End Auth Check ─────────────────────────────────────────────────

    const { catalogTitle, catalogCategory } = await req.json();

    if (!catalogTitle) {
      return new Response(
        JSON.stringify({ error: "catalogTitle is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active wholesale dealers
    const { data: dealers, error: dealersError } = await supabase
      .from("dealer_accounts")
      .select("user_id, tier")
      .eq("is_active", true)
      .in("tier", ["wholesale_tier1", "wholesale_tier2"]);

    if (dealersError) throw dealersError;

    if (!dealers || dealers.length === 0) {
      console.log("No active wholesale dealers found");
      return new Response(
        JSON.stringify({ success: true, notified: 0, whatsappSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = dealers.map((d) => d.user_id);

    // Get phone numbers and names from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, phone, full_name")
      .in("user_id", userIds);

    if (profilesError) throw profilesError;

    const profileMap = new Map(
      (profiles || []).map((p) => [p.user_id, p])
    );

    // ─── In-app notifications ───────────────────────────────────────────
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      title: "📄 كتالوج جديد متاح!",
      message: `تم إضافة كتالوج جديد: "${catalogTitle}". يمكنك الاطلاع عليه الآن من صفحة الكتالوجات.`,
      type: "info",
    }));

    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Notification insert error:", notifError);
    } else {
      console.log(`Inserted ${notifications.length} in-app notifications`);
    }

    // ─── WhatsApp via Twilio ────────────────────────────────────────────
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    let whatsappSent = 0;

    if (twilioSid && twilioToken && twilioPhone) {
      const messageBody =
        `📄 *المصرية جروب - كتالوج جديد*\n\n` +
        `تم إضافة كتالوج جديد: *${catalogTitle}*\n` +
        (catalogCategory ? `الفئة: ${catalogCategory}\n` : "") +
        `\nيمكنك الاطلاع عليه من خلال حسابك:\nhttps://www.almasriaautoparts.com/catalogs`;

      for (const dealer of dealers) {
        const profile = profileMap.get(dealer.user_id);
        if (!profile?.phone) continue;

        let phone = profile.phone.replace(/\D/g, "");
        if (phone.startsWith("0")) phone = "2" + phone;
        if (!phone.startsWith("+")) phone = "+" + phone;

        try {
          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                From: `whatsapp:${twilioPhone}`,
                To: `whatsapp:${phone}`,
                Body: messageBody,
              }),
            }
          );

          if (res.ok) {
            whatsappSent++;
            console.log(`WhatsApp sent to ${phone}`);
          } else {
            const errText = await res.text();
            console.error(`WhatsApp error for ${phone}:`, errText);
          }
        } catch (e) {
          console.error(`Failed to send WhatsApp to ${phone}:`, e);
        }
      }
    } else {
      console.log("Twilio credentials not configured – skipping WhatsApp");
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified: userIds.length,
        whatsappSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-catalog-new:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
