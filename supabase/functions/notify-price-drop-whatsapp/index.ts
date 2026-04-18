import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const metaToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");

    const { productId, productName, sku, oldPrice, newPrice, dealerUserIds } = await req.json();

    if (!productId || !Array.isArray(dealerUserIds) || dealerUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get phone numbers of dealers
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, phone, full_name")
      .in("user_id", dealerUserIds);

    const dropPercent = (((oldPrice - newPrice) / oldPrice) * 100).toFixed(1);
    const message =
      `🎉 *سعر أفضل!*\n\n` +
      `المنتج الذي سألت عنه انخفض سعره:\n\n` +
      `📦 ${productName}\n` +
      `🔖 رقم القطعة: ${sku}\n\n` +
      `❌ السعر القديم: ${Number(oldPrice).toLocaleString("ar-EG")} ج.م\n` +
      `✅ السعر الجديد: ${Number(newPrice).toLocaleString("ar-EG")} ج.م\n` +
      `💰 وفر ${dropPercent}%\n\n` +
      `اطلبه الآن من بوابة التاجر 🛒`;

    let sentCount = 0;
    const errors: string[] = [];

    for (const profile of profiles || []) {
      if (!profile.phone) continue;

      // Normalize Egyptian phone to E.164: 01xxxxxxxxx -> 201xxxxxxxxx
      let phone = profile.phone.replace(/\D/g, "");
      if (phone.startsWith("0")) phone = "2" + phone;
      if (!phone.startsWith("20")) phone = "20" + phone.replace(/^20/, "");

      try {
        if (metaToken && phoneNumberId) {
          const res = await fetch(
            `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${metaToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: phone,
                type: "text",
                text: { body: message },
              }),
            }
          );
          const result = await res.json();
          if (res.ok) {
            sentCount++;
          } else {
            errors.push(`${phone}: ${JSON.stringify(result)}`);
          }
        }

        // Always insert in-app notification too
        await supabase.from("notifications").insert({
          user_id: profile.user_id,
          title: "🎉 سعر أفضل على منتج سألت عنه!",
          message: `${productName} (${sku}) انخفض من ${Number(oldPrice).toLocaleString("ar-EG")} إلى ${Number(newPrice).toLocaleString("ar-EG")} ج.م — وفر ${dropPercent}%`,
          type: "price_drop",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown";
        errors.push(`${phone}: ${msg}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    console.error("notify-price-drop-whatsapp error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
