import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppPayload } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function formatPhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "2" + p;
  if (/^\d{10}$/.test(p)) p = "2" + p;
  return p;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify staff
    const { data: staffCheck } = await supabase.rpc("is_staff", { _user_id: user.id });
    if (!staffCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversationId, phone, body, mediaPath, mediaMime, caption } = await req.json();

    if (!conversationId || !phone) {
      return new Response(JSON.stringify({ error: "conversationId and phone required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Per-conversation permission: admins/moderators (e.g. Karam) reply to all;
    // other staff can reply ONLY to conversations assigned to them.
    const { data: canReply } = await supabase.rpc("can_reply_whatsapp_conversation", {
      _user_id: user.id,
      _conversation_id: conversationId,
    });
    if (!canReply) {
      return new Response(JSON.stringify({
        error: "هذه المحادثة غير مسندة إليك. تواصل مع المشرف (كرم).",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const to = formatPhone(phone);

    // Build Meta payload
    let metaPayload: any = { messaging_product: "whatsapp", to };
    let messageType = "text";
    let storedBody = body || "";
    let publicMediaUrl: string | null = null;

    if (mediaPath) {
      // Get a public/signed URL for the media in storage
      const { data: signed } = await supabase.storage
        .from("whatsapp-media")
        .createSignedUrl(mediaPath, 60 * 60 * 24);
      publicMediaUrl = signed?.signedUrl || null;

      if (!publicMediaUrl) throw new Error("Failed to sign media URL");

      const mt = (mediaMime || "").split("/")[0];
      if (mt === "image") {
        messageType = "image";
        metaPayload.type = "image";
        metaPayload.image = { link: publicMediaUrl, caption: caption || body || undefined };
        storedBody = caption || body || "[صورة]";
      } else if (mt === "video") {
        messageType = "video";
        metaPayload.type = "video";
        metaPayload.video = { link: publicMediaUrl, caption: caption || body || undefined };
        storedBody = caption || body || "[فيديو]";
      } else if (mt === "audio") {
        messageType = "audio";
        metaPayload.type = "audio";
        metaPayload.audio = { link: publicMediaUrl };
        storedBody = "[رسالة صوتية]";
      } else {
        messageType = "document";
        metaPayload.type = "document";
        metaPayload.document = { link: publicMediaUrl, caption: caption || body || undefined };
        storedBody = caption || body || "[مستند]";
      }
    } else {
      metaPayload.type = "text";
      metaPayload.text = { body: body || "" };
    }

    // Send to Meta
    const sendResult = await sendWhatsAppPayload(to, metaPayload);
    const respData = sendResult.data;
    const metaMessageId = sendResult.messageId;

    // Insert into messages table (use service key to bypass RLS for the moderator-on-unassigned case)
    const adminSb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: inserted, error: insertErr } = await adminSb
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversationId,
        phone: to,
        direction: "outbound",
        source: "manual",
        message_type: messageType,
        body: storedBody,
        media_url: mediaPath || null,
        media_mime: mediaMime || null,
        media_caption: caption || null,
        meta_message_id: metaMessageId,
        status: sendResult.ok ? "sent" : "failed",
        error_message: sendResult.ok ? null : String(sendResult.error || JSON.stringify(respData)).slice(0, 500),
        sent_by: user.id,
        raw_payload: respData,
      })
      .select()
      .single();

    if (insertErr) console.error("Insert error:", insertErr);

    if (!sendResult.ok) {
      return new Response(JSON.stringify({
        error: "Meta API failed",
        details: respData,
        requiresTemplate: sendResult.requiresTemplate ?? false,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Send error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
