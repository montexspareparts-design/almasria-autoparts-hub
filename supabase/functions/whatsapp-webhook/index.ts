import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Meta webhook verification (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") || "almasria_verify_2024";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("Webhook verified");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Incoming webhook:", JSON.stringify(body).slice(0, 500));

    // Extract messages from Meta webhook payload
    const entries = body?.entry || [];
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let processed = 0;

    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        if (change?.field !== "messages") continue;

        const messages = change?.value?.messages || [];
        const contacts = change?.value?.contacts || [];

        for (const msg of messages) {
          const from = msg.from; // sender phone e.g. "201027815696"
          const msgType = msg.type; // text, image, etc.
          const timestamp = msg.timestamp;
          const contactName = contacts?.[0]?.profile?.name || "عميل";

          // Extract message text
          let textBody = "";
          if (msgType === "text") {
            textBody = msg.text?.body || "";
          } else if (msgType === "image") {
            textBody = `[صورة] ${msg.image?.caption || ""}`;
          } else if (msgType === "audio") {
            textBody = "[رسالة صوتية]";
          } else if (msgType === "video") {
            textBody = "[فيديو]";
          } else if (msgType === "document") {
            textBody = `[مستند] ${msg.document?.filename || ""}`;
          } else if (msgType === "location") {
            textBody = `[موقع] ${msg.location?.latitude},${msg.location?.longitude}`;
          } else if (msgType === "sticker") {
            textBody = "[ملصق]";
          } else {
            textBody = `[${msgType || "رسالة"}]`;
          }

          // Normalize phone: try matching with different formats
          let normalizedPhone = from;
          // Remove country code prefix for Egypt (20)
          const phoneVariants = [
            from,                              // 201027815696
            "+" + from,                        // +201027815696
            from.replace(/^2/, "0"),           // 01027815696
            from.replace(/^20/, "0"),          // 01027815696
          ];

          // Find customer by phone in profiles
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, full_name, phone")
            .or(phoneVariants.map(p => `phone.eq.${p}`).join(","))
            .limit(1)
            .maybeSingle();

          if (!profile) {
            console.log(`No customer found for phone ${from} (${contactName}). Skipping.`);
            // Still log it — find or create a system note for admins
            // Insert into a general notification for admins
            const { data: admins } = await supabase
              .from("user_roles")
              .select("user_id")
              .eq("role", "admin");

            for (const admin of admins || []) {
              await supabase.from("notifications").insert({
                user_id: admin.user_id,
                title: "💬 رسالة واتساب من رقم غير مسجل",
                message: `من: ${contactName} (${from})\n${textBody}`,
                type: "whatsapp_reply",
              });
            }
            processed++;
            continue;
          }

          // Log in customer_communications as a WhatsApp reply
          // Use a system/bot user_id — we'll use the first admin as staff_user_id
          const { data: firstAdmin } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin")
            .limit(1)
            .maybeSingle();

          const staffId = firstAdmin?.user_id || profile.user_id;

          const noteText = `📩 رد واتساب من ${contactName}:\n${textBody}`;

          await supabase.from("customer_communications").insert({
            customer_user_id: profile.user_id,
            staff_user_id: staffId,
            comm_type: "whatsapp",
            note: noteText,
          });

          // Also notify admins
          const { data: admins } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          for (const admin of admins || []) {
            await supabase.from("notifications").insert({
              user_id: admin.user_id,
              title: `💬 رد واتساب من ${profile.full_name || contactName}`,
              message: textBody.slice(0, 200),
              type: "whatsapp_reply",
            });
          }

          processed++;
          console.log(`Logged WhatsApp reply from ${from} → customer ${profile.user_id}`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    // Always return 200 to Meta to avoid retries
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
