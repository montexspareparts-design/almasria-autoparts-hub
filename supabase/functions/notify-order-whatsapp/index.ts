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
    const { orderNumber, totalAmount, customerPhone, paymentLink } =
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

    let msg = `طلبك رقم ${orderNumber}\nالإجمالي ${amountFormatted} جنيه`;

    if (paymentLink) {
      msg += `\n\nادفع من هنا:\n${paymentLink}`;
    }

    await sendWhatsApp(customerPhone, msg);

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
