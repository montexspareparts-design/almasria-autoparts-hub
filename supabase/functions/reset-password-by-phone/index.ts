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
    const { phone, code, new_password } = await req.json();

    if (!phone || !code || !new_password) {
      return new Response(
        JSON.stringify({ success: false, error: "بيانات ناقصة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseRL = createClient(supabaseUrl, serviceRoleKey);

    // Rate limit: max 3 password reset attempts per phone per 15 minutes
    const { data: allowed } = await supabaseRL.rpc("check_rate_limit", {
      _identifier: phone,
      _action: "reset_password",
      _max_requests: 3,
      _window_seconds: 900,
    });

    if (!allowed) {
      return new Response(
        JSON.stringify({ success: false, error: "محاولات كثيرة. حاول بعد 15 دقيقة." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify OTP
    const { data: otpData, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("code", code)
      .gt("expires_at", new Date().toISOString())
      .eq("verified", false)
      .maybeSingle();

    if (otpError || !otpData) {
      return new Response(
        JSON.stringify({ success: false, error: "كود التحقق غير صحيح أو منتهي الصلاحية" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as verified
    await supabase.from("otp_codes").update({ verified: true }).eq("id", otpData.id);

    // Find user by synthetic email
    const digits = phone.replace(/\D/g, "");
    const syntheticEmail = `${digits}@phone.almasria.app`;

    // List users to find by email
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(
        JSON.stringify({ success: false, error: "خطأ في البحث عن الحساب" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = usersData.users.find(u => u.email === syntheticEmail);
    
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: "لم يتم العثور على حساب مرتبط بهذا الرقم" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: new_password,
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "فشل تحديث كلمة المرور" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up OTP codes for this phone
    await supabase.from("otp_codes").delete().eq("phone", phone);

    return new Response(
      JSON.stringify({ success: true, message: "تم تغيير كلمة المرور بنجاح" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
