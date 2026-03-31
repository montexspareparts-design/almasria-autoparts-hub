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

// ─── Meta WhatsApp Business API Helper ──────────────────────────────────────
async function sendWhatsApp(phone: string, message: string) {
  const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken || !phoneNumberId) {
    console.error("Meta WhatsApp credentials not configured");
    return { ok: false, data: { error: "Meta WhatsApp not configured" } };
  }

  // Clean phone number — ensure it has country code without +
  let formatted = phone.replace(/[\s\-\(\)]/g, "");
  if (formatted.startsWith("+")) formatted = formatted.slice(1);
  if (formatted.startsWith("0")) formatted = "2" + formatted; // Egypt country code

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: formatted,
      type: "text",
      text: { body: message },
    }),
  });

  const data = await resp.json();
  if (resp.ok) {
    console.log(`WhatsApp sent to ${formatted}, ID: ${data.messages?.[0]?.id}`);
  } else {
    console.error(`WhatsApp failed to ${formatted}:`, JSON.stringify(data));
  }
  return { ok: resp.ok, data };
}
// ────────────────────────────────────────────────────────────────────────────

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

    const statusMsg = statusMessages[newStatus] || `تم تحديث حالة طلبك إلى: ${newStatus}`;
    const greeting = customerName ? `مرحباً ${customerName}،\n` : "";
    const body = `${greeting}${statusMsg}\n\nرقم الطلب: ${orderNumber}\n\n— المصرية جروب لقطع غيار السيارات`;

    const result = await sendWhatsApp(customerPhone, body);

    if (!result.ok) {
      return new Response(
        JSON.stringify({ success: false, error: result.data?.error?.message || "Failed to send WhatsApp" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.data?.messages?.[0]?.id }),
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
