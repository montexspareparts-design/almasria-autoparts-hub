import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendWhatsApp(phone: string, message: string) {
  const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
  if (!accessToken || !phoneNumberId) return { ok: false };

  let formatted = phone.replace(/[\s\-\(\)]/g, "");
  if (formatted.startsWith("+")) formatted = formatted.slice(1);
  if (formatted.startsWith("0")) formatted = "2" + formatted;
  if (/^\d{10}$/.test(formatted)) formatted = "2" + formatted;

  const resp = await fetch(
    `https://crm.whats-meta.com/api/meta/v19.0/${phoneNumberId}/messages`,
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
  console.log(resp.ok ? `WhatsApp sent to ${formatted}` : `WhatsApp failed: ${JSON.stringify(data)}`);
  return { ok: resp.ok };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // Support both direct call and webhook trigger
    let priceListTitle: string;
    if (body.record) {
      // Webhook trigger
      if (!body.record.is_active) {
        return new Response(JSON.stringify({ skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      priceListTitle = body.record.title;
    } else {
      priceListTitle = body.title;
    }

    if (!priceListTitle) {
      return new Response(JSON.stringify({ error: "Missing title" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all active dealers
    const { data: dealers } = await supabase
      .from("dealer_accounts")
      .select("user_id")
      .eq("is_active", true);

    if (!dealers || dealers.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("phone, full_name, user_id")
      .in("user_id", dealers.map((d: any) => d.user_id));

    let sent = 0;
    for (const profile of profiles || []) {
      if (!profile.phone) continue;

      const msg = `📋 كشف أسعار جديد!\n\nتم إضافة كشف أسعار جديد: "${priceListTitle}"\n\n🔗 اطلع عليه الآن من حسابك:\nhttps://almasria-autoparts-hub.lovable.app/dealer\n\nالمصرية جروب 🚗`;

      await sendWhatsApp(profile.phone, msg);
      sent++;
    }

    console.log(`Price list WhatsApp sent to ${sent} dealers`);

    return new Response(JSON.stringify({ success: true, sent }), {
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
