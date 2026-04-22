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
    const failed: Array<{ phone: string; error: string; requiresTemplate: boolean }> = [];
    for (const profile of profiles || []) {
      if (!profile.phone) continue;

      const msg = `📋 كشف أسعار جديد!\n\nتم إضافة كشف أسعار جديد: "${priceListTitle}"\n\n🔗 اطلع عليه الآن من حسابك:\nhttps://almasria-autoparts-hub.lovable.app/dealer\n\nالمصرية جروب 🚗`;

      const result = await sendWhatsAppText(profile.phone, msg);

      if (result.ok) {
        console.log(`WhatsApp sent to ${result.formattedPhone}, id: ${result.messageId}`);
        sent++;
      } else {
        console.error(
          `WhatsApp failed to ${result.formattedPhone}: ${result.error} (template_required=${result.requiresTemplate ? "yes" : "no"})`,
        );
        failed.push({
          phone: result.formattedPhone,
          error: result.error || "unknown_error",
          requiresTemplate: Boolean(result.requiresTemplate),
        });
      }
    }

    console.log(`Price list WhatsApp sent to ${sent} dealers, failed for ${failed.length}`);

    return new Response(JSON.stringify({ success: failed.length === 0, sent, failed }), {
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
