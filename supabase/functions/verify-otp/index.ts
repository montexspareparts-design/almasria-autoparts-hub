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
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ valid: false, error: "بيانات ناقصة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Rate limit: max 5 verify attempts per phone per 5 minutes
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _identifier: phone,
      _action: "verify_otp",
      _max_requests: 5,
      _window_seconds: 300,
    });

    if (!allowed) {
      return new Response(
        JSON.stringify({ valid: false, error: "محاولات كثيرة. حاول بعد 5 دقائق." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the secure verify_otp_code function that compares bcrypt hashes
    const { data: isValid, error } = await supabase.rpc("verify_otp_code", {
      _phone: phone,
      _code: code,
    });

    if (error || !isValid) {
      return new Response(
        JSON.stringify({ valid: false, error: "كود التحقق غير صحيح أو منتهي الصلاحية" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ valid: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
