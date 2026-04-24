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
    const { phone, channel = "whatsapp" } = await req.json();

    if (!phone || phone.length < 8) {
      return new Response(
        JSON.stringify({ error: "رقم الهاتف غير صحيح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metaAccessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
    const metaPhoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");

    if (!metaAccessToken || !metaPhoneNumberId) {
      console.error("Meta WhatsApp configuration missing");
      return new Response(
        JSON.stringify({ error: "WhatsApp configuration missing" }),
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

    // Format phone number for WhatsApp (E.164 without +)
    let formattedPhone = phone.replace(/\D/g, "");
    // Handle international prefix 002 or 0020
    if (formattedPhone.startsWith("0020")) {
      formattedPhone = formattedPhone.substring(2); // Remove "00", keep "20..."
    } else if (formattedPhone.startsWith("002")) {
      formattedPhone = formattedPhone.substring(2);
    }
    // If starts with 0, add Egypt code
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "20" + formattedPhone.substring(1);
    }
    // If doesn't start with country code, add Egypt
    if (!formattedPhone.startsWith("20")) {
      formattedPhone = "20" + formattedPhone;
    }

    const messageBody = `كود التحقق الخاص بك في المصرية جروب: ${otp}\nصالح لمدة 5 دقائق.`;

    // Send via Meta WhatsApp Business API
    const metaUrl = `https://graph.facebook.com/v21.0/${metaPhoneNumberId}/messages`;

    const metaRes = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${metaAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: messageBody,
        },
      }),
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      console.error("Meta WhatsApp error:", JSON.stringify(metaData));
      return new Response(
        JSON.stringify({ error: "فشل إرسال الرسالة عبر واتساب. تأكد من الرقم." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("WhatsApp OTP sent successfully to:", formattedPhone);

    return new Response(
      JSON.stringify({ success: true, message: "تم إرسال كود التحقق عبر واتساب" }),
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
