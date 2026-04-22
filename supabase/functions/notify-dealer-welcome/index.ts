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

    const { phone, name, username, password, lead_id } = await req.json();

    if (!phone || !username || !password) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msg = `🎉 مبروك ${name || ""}!\n\nتم قبول طلبك كتاجر في المصرية جروب ✅\n\n📱 بيانات الدخول:\nاسم المستخدم: ${username}\nكلمة السر: ${password}\n\n🔗 سجل دخولك الآن:\nhttps://almasria-autoparts-hub.lovable.app/dealer-login\n\n⚠️ يرجى تغيير كلمة السر بعد أول تسجيل دخول.\n\nالمصرية جروب 🚗`;

    const waResult = await sendWhatsAppText(phone, msg);

    // Log send result for staff visibility
    try {
      await supabase.from("whatsapp_send_logs").insert({
        lead_id: lead_id || null,
        phone,
        recipient_name: name || null,
        template: "dealer_welcome",
        message_preview: msg.slice(0, 300),
        status: waResult.ok ? "sent" : (waResult.requiresTemplate ? "requires_template" : "failed"),
        error_message: waResult.ok ? null : (waResult.error || null),
        provider_response: waResult as any,
      });
    } catch (logErr) {
      console.error("Failed to log whatsapp send:", logErr);
    }

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
