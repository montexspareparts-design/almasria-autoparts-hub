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

    const { phone, name, username, password } = await req.json();

    if (!phone || !username || !password) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msg = `🎉 مبروك ${name || ""}!\n\nتم قبول طلبك كتاجر في المصرية جروب ✅\n\n📱 بيانات الدخول:\nاسم المستخدم: ${username}\nكلمة السر: ${password}\n\n🔗 سجل دخولك الآن:\nhttps://almasria-autoparts-hub.lovable.app/dealer-login\n\n⚠️ يرجى تغيير كلمة السر بعد أول تسجيل دخول.\n\nالمصرية جروب 🚗`;

    const waResult = await sendWhatsAppText(phone, msg);

    return new Response(JSON.stringify({
      success: waResult.ok,
      requires_template: waResult.requiresTemplate ?? false,
      error: waResult.ok ? null : waResult.error,
    }), {
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
