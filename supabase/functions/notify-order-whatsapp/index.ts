import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendWhatsApp(phone: string, message: string) {
  const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken || !phoneNumberId) {
    console.warn("Meta WhatsApp credentials not configured — skipping");
    return { ok: false };
  }

  let formatted = phone.replace(/[\s\-\(\)]/g, "");
  if (formatted.startsWith("+")) formatted = formatted.slice(1);
  if (formatted.startsWith("0")) formatted = "2" + formatted;
  if (/^\d{10}$/.test(formatted)) formatted = "2" + formatted;

  const resp = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
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
    }
  );

  const data = await resp.json();
  if (resp.ok) {
    console.log(`WhatsApp sent to ${formatted}, ID: ${data.messages?.[0]?.id}`);
  } else {
    console.error(`WhatsApp failed to ${formatted}:`, JSON.stringify(data));
  }
  return { ok: resp.ok };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderNumber, totalAmount, customerPhone, paymentLink, customerName } =
      await req.json();

    if (!orderNumber || !customerPhone) {
      return new Response(
        JSON.stringify({ error: "Missing orderNumber or customerPhone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountFormatted = totalAmount
      ? Number(totalAmount).toLocaleString("ar-EG")
      : "—";

    let msg = `طلبك جاهز 👌\nرقم الطلب: ${orderNumber}\nالإجمالي: ${amountFormatted} جنيه`;

    if (paymentLink) {
      msg += `\n\nادفع الآن لتأكيد الطلب فورًا:\n${paymentLink}`;
    }

    // Send to customer
    await sendWhatsApp(customerPhone, msg);

    // Send to all admin phones
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("phone")
        .in("user_id", admins.map((a: { user_id: string }) => a.user_id));

      const clientName = customerName || customerPhone;
      const adminMsg = `🆕 طلب جديد #${orderNumber}\nالعميل: ${clientName}\nالإجمالي: ${amountFormatted} جنيه`;
      for (const p of adminProfiles || []) {
        if (p.phone) await sendWhatsApp(p.phone, adminMsg);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
