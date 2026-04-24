import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { dealerUserId, dealerEmail, status, businessName, reviewNotes } = await req.json();

    if (!dealerUserId || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isApproved = status === "approved";
    const title = isApproved ? "تمت الموافقة على طلبك! 🎉" : "تم رفض طلبك";
    const message = isApproved
      ? `مبروك! تمت الموافقة على طلب التسجيل كتاجر لـ "${businessName}". يمكنك الآن الاستفادة من أسعار الجملة.`
      : `نأسف، تم رفض طلب التسجيل كتاجر لـ "${businessName}".${reviewNotes ? ` السبب: ${reviewNotes}` : " يمكنك التواصل معنا لمزيد من التفاصيل."}`;

    // Create in-app notification
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: dealerUserId,
      title,
      message,
      type: isApproved ? "success" : "error",
    });

    if (notifError) {
      console.error("Error creating notification:", notifError);
    }

    // Send email notification via Resend (if API key is available)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey && dealerEmail) {
      const emailHtml = `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #e94560; margin: 0;">المصرية جروب</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
            <h2 style="color: ${isApproved ? "#16a34a" : "#dc2626"};">${title}</h2>
            <p style="color: #333; line-height: 1.8; font-size: 16px;">${message}</p>
            ${isApproved ? `<a href="https://www.almasriaautoparts.com/dealer" style="display: inline-block; background: #e94560; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">الدخول إلى حسابك</a>` : ""}
          </div>
          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 16px;">المصرية جروب لقطع غيار السيارات</p>
        </div>
      `;

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "المصرية جروب <noreply@almasriaautoparts.com>",
            to: [dealerEmail],
            subject: title,
            html: emailHtml,
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error("Resend API error:", errText);
        }
      } catch (emailErr) {
        console.error("Email sending error:", emailErr);
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email notification");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
