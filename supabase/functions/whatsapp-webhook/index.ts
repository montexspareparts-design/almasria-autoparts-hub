import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_TOKEN = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");

function normalizePhone(from: string): string[] {
  return [
    from,
    "+" + from,
    from.replace(/^2/, "0"),
    from.replace(/^20/, "0"),
  ];
}

// Download media from Meta and upload to Supabase Storage
async function downloadAndStoreMedia(
  supabase: any,
  mediaId: string,
  mimeType: string
): Promise<string | null> {
  if (!META_TOKEN) return null;
  try {
    // 1) Get media URL from Meta
    const metaRes = await fetch(`https://crm.whats-meta.com/api/meta/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${META_TOKEN}` },
    });
    const metaJson = await metaRes.json();
    const mediaUrl = metaJson?.url;
    if (!mediaUrl) return null;

    // 2) Download the bytes
    const fileRes = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${META_TOKEN}` },
    });
    if (!fileRes.ok) return null;
    const bytes = new Uint8Array(await fileRes.arrayBuffer());

    // 3) Upload to storage
    const ext = (mimeType || "application/octet-stream").split("/")[1]?.split(";")[0] || "bin";
    const path = `inbound/${new Date().toISOString().slice(0, 10)}/${mediaId}.${ext}`;
    const { error } = await supabase.storage
      .from("whatsapp-media")
      .upload(path, bytes, { contentType: mimeType, upsert: true });
    if (error) {
      console.error("Storage upload failed:", error);
      return null;
    }
    return path;
  } catch (err) {
    console.error("Media download failed:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  // Meta webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") || "almasria_verify_2024";
    if (mode === "subscribe" && token === verifyToken) {
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

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const entries = body?.entry || [];
    let processed = 0;

    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        if (change?.field !== "messages") continue;

        const value = change?.value || {};
        const messages = value?.messages || [];
        const statuses = value?.statuses || [];
        const contacts = value?.contacts || [];

        // Handle message status updates (delivered, read, etc.)
        for (const st of statuses) {
          const metaId = st.id;
          const newStatus = st.status; // sent, delivered, read, failed
          if (!metaId) continue;
          await supabase
            .from("whatsapp_messages")
            .update({ status: newStatus })
            .eq("meta_message_id", metaId);
        }

        // Handle incoming messages
        for (const msg of messages) {
          const from = msg.from;
          const msgType = msg.type;
          const contactName = contacts?.[0]?.profile?.name || "عميل";
          const metaMessageId = msg.id;

          let textBody = "";
          let mediaPath: string | null = null;
          let mediaMime: string | null = null;
          let caption: string | null = null;

          if (msgType === "text") {
            textBody = msg.text?.body || "";
          } else if (msgType === "image") {
            caption = msg.image?.caption || null;
            mediaMime = msg.image?.mime_type || "image/jpeg";
            if (msg.image?.id) {
              mediaPath = await downloadAndStoreMedia(supabase, msg.image.id, mediaMime);
            }
            textBody = caption || "[صورة]";
          } else if (msgType === "audio") {
            mediaMime = msg.audio?.mime_type || "audio/ogg";
            if (msg.audio?.id) {
              mediaPath = await downloadAndStoreMedia(supabase, msg.audio.id, mediaMime);
            }
            textBody = "[رسالة صوتية]";
          } else if (msgType === "video") {
            caption = msg.video?.caption || null;
            mediaMime = msg.video?.mime_type || "video/mp4";
            if (msg.video?.id) {
              mediaPath = await downloadAndStoreMedia(supabase, msg.video.id, mediaMime);
            }
            textBody = caption || "[فيديو]";
          } else if (msgType === "document") {
            caption = msg.document?.filename || null;
            mediaMime = msg.document?.mime_type || "application/octet-stream";
            if (msg.document?.id) {
              mediaPath = await downloadAndStoreMedia(supabase, msg.document.id, mediaMime);
            }
            textBody = `[مستند] ${caption || ""}`;
          } else if (msgType === "sticker") {
            mediaMime = msg.sticker?.mime_type || "image/webp";
            if (msg.sticker?.id) {
              mediaPath = await downloadAndStoreMedia(supabase, msg.sticker.id, mediaMime);
            }
            textBody = "[ملصق]";
          } else if (msgType === "location") {
            textBody = `[موقع] ${msg.location?.latitude},${msg.location?.longitude}`;
          } else {
            textBody = `[${msgType || "رسالة"}]`;
          }

          // Upsert conversation
          const { data: existingConv } = await supabase
            .from("whatsapp_conversations")
            .select("id, customer_user_id")
            .eq("phone", from)
            .maybeSingle();

          // Try to map to existing customer
          let customerUserId = existingConv?.customer_user_id || null;
          if (!customerUserId) {
            const variants = normalizePhone(from);
            const { data: profile } = await supabase
              .from("profiles")
              .select("user_id")
              .or(variants.map((p) => `phone.eq.${p}`).join(","))
              .limit(1)
              .maybeSingle();
            customerUserId = profile?.user_id || null;
          }

          let conversationId = existingConv?.id;
          if (!conversationId) {
            const { data: newConv, error: convErr } = await supabase
              .from("whatsapp_conversations")
              .insert({
                phone: from,
                contact_name: contactName,
                customer_user_id: customerUserId,
              })
              .select("id")
              .single();
            if (convErr) {
              console.error("Failed to create conversation:", convErr);
              continue;
            }
            conversationId = newConv.id;
          } else {
            // Update name + customer link if missing
            await supabase
              .from("whatsapp_conversations")
              .update({
                contact_name: contactName,
                customer_user_id: customerUserId,
              })
              .eq("id", conversationId);
          }

          // Insert message
          await supabase.from("whatsapp_messages").insert({
            conversation_id: conversationId,
            phone: from,
            direction: "inbound",
            source: "customer",
            message_type: msgType || "text",
            body: textBody,
            media_url: mediaPath,
            media_mime: mediaMime,
            media_caption: caption,
            meta_message_id: metaMessageId,
            status: "received",
            raw_payload: msg,
          });

          // Notify admins
          const { data: admins } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          for (const admin of admins || []) {
            await supabase.from("notifications").insert({
              user_id: admin.user_id,
              title: `💬 رسالة واتساب من ${contactName}`,
              message: textBody.slice(0, 200),
              type: "whatsapp_reply",
            });
          }

          processed++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
