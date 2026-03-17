import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const statusMessages: Record<string, string> = {
  confirmed: "✅ تم تأكيد طلبك وسيتم تجهيزه قريباً",
  processing: "📦 طلبك قيد التجهيز الآن",
  shipped: "🚚 تم شحن طلبك! يمكنك متابعته من حسابك",
  delivered: "🎉 تم تسليم طلبك بنجاح. شكراً لتعاملك معنا!",
  cancelled: "❌ تم إلغاء طلبك. تواصل معنا لمزيد من التفاصيل",
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

    const { orderNumber, newStatus, customerPhone, customerName } = await req.json();

    if (!orderNumber || !newStatus || !customerPhone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: orderNumber, newStatus, customerPhone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhone) {
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ error: "Twilio not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusMsg = statusMessages[newStatus] || `تم تحديث حالة طلبك إلى: ${newStatus}`;
    const greeting = customerName ? `مرحباً ${customerName}،\n` : "";
    const body = `${greeting}${statusMsg}\n\nرقم الطلب: ${orderNumber}\n\n— المصرية جروب لقطع غيار السيارات`;

    // Clean phone number - ensure it starts with +
    let phone = customerPhone.replace(/\s/g, "");
    if (!phone.startsWith("+")) {
      phone = phone.startsWith("0") ? `+2${phone}` : `+${phone}`;
    }

    // Send via Twilio WhatsApp API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioAuthHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${twilioAuthHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: `whatsapp:${phone}`,
        From: `whatsapp:${twilioPhone}`,
        Body: body,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio WhatsApp error:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, error: data.message || "Failed to send WhatsApp" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("WhatsApp sent successfully, SID:", data.sid);

    return new Response(
      JSON.stringify({ success: true, sid: data.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
