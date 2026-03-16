import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, channel = "sms" } = await req.json();

    if (!phone || phone.length < 8) {
      return new Response(
        JSON.stringify({ error: "رقم الهاتف غير صحيح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhone) {
      return new Response(
        JSON.stringify({ error: "Twilio configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ─── Rate Limiting: 60-second cooldown ──────────────────────────────
    const { data: recentOtp } = await supabase
      .from("otp_codes")
      .select("created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1);

    if (recentOtp?.[0]) {
      const age = Date.now() - new Date(recentOtp[0].created_at).getTime();
      if (age < 60_000) {
        return new Response(
          JSON.stringify({ error: "يرجى الانتظار 60 ثانية قبل إعادة الإرسال" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── Rate Limiting: Max 5 OTPs per phone per hour ───────────────────
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: hourlyCount } = await supabase
      .from("otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", oneHourAgo);

    if ((hourlyCount ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز الحد الأقصى للمحاولات. حاول بعد ساعة." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ─── End Rate Limiting ──────────────────────────────────────────────

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTP for this phone
    await supabase.from("otp_codes").delete().eq("phone", phone);

    // Insert new OTP with 5 min expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase.from("otp_codes").insert({
      phone,
      code: otp,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number for Twilio
    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+20" + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith("20")) {
      formattedPhone = "+" + formattedPhone;
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+20" + formattedPhone;
    }

    let formattedTwilioPhone = twilioPhone.replace(/\D/g, "");
    if (formattedTwilioPhone.startsWith("0")) {
      formattedTwilioPhone = "+20" + formattedTwilioPhone.substring(1);
    } else if (!formattedTwilioPhone.startsWith("+")) {
      formattedTwilioPhone = "+" + formattedTwilioPhone;
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const TWILIO_WHATSAPP_SANDBOX = "+14155238886";

    const fromNumber = channel === "whatsapp"
      ? `whatsapp:${TWILIO_WHATSAPP_SANDBOX}`
      : formattedTwilioPhone;
    const toNumber = channel === "whatsapp"
      ? `whatsapp:${formattedPhone}`
      : formattedPhone;

    const body = new URLSearchParams({
      To: toNumber,
      From: fromNumber,
      Body: `كود التحقق الخاص بك في المصرية جروب: ${otp}\nصالح لمدة 5 دقائق.`,
    });

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!twilioRes.ok) {
      const errText = await twilioRes.text();
      console.error("Twilio error:", errText);
      return new Response(
        JSON.stringify({ error: "فشل إرسال الرسالة. تأكد من الرقم." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "تم إرسال كود التحقق" }),
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
