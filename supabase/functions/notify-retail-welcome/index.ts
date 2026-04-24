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

    const { phone, name } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({ error: "Missing phone" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const greeting = name ? `أهلاً ${name} 👋` : "أهلاً بيك 👋";

    const msg = `${greeting}

🎉 شكراً لتسجيلك في *المصرية جروب* — الموزع الرسمي لقطع غيار وزيوت تويوتا الأصلية في مصر 🚗

✅ دلوقتي تقدر:
• تتصفح كتالوج قطع الغيار الأصلية
• تطلب أونلاين والشحن لحد عندك
• تتابع طلباتك خطوة بخطوة

🌐 الموقع: https://almasriaautoparts.com

لو محتاج مساعدة أو استفسار عن قطعة معينة، رد على الرسالة دي وفريقنا هيخدمك فوراً 💬

المصرية جروب — الجودة والثقة منذ سنوات 🏆`;

    const waResult = await sendWhatsAppText(phone, msg);

    try {
      await supabase.from("whatsapp_send_logs").insert({
        phone,
        recipient_name: name || null,
        template: "retail_welcome",
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
    console.error("Error in notify-retail-welcome:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
