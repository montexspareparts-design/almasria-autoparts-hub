// AI Summary for support requests from chatbot
// Returns: { summary, parts_mentioned, urgency, intent } using Lovable AI tool calling
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { request_id } = await req.json();
    if (!request_id || typeof request_id !== "string") {
      return new Response(JSON.stringify({ error: "request_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check (must be staff)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isStaffData } = await supabase.rpc("is_staff", { _user_id: user.id });
    if (!isStaffData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the support request
    const { data: reqRow, error: fetchErr } = await supabase
      .from("support_requests")
      .select("id, customer_name, customer_phone, message, context, is_dealer")
      .eq("id", request_id)
      .maybeSingle();

    if (fetchErr || !reqRow) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache check: if context already has ai_summary, return it
    const ctx = (reqRow.context as any) || {};
    if (ctx.ai_summary) {
      return new Response(JSON.stringify({ summary: ctx.ai_summary, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatHistory = Array.isArray(ctx.chat_history) ? ctx.chat_history : [];
    const conversationText = chatHistory.length > 0
      ? chatHistory.map((m: any) => `${m.role === "user" ? "العميل" : "البوت"}: ${m.text || ""}`).join("\n")
      : (reqRow.message || "لا توجد محادثة");

    const systemPrompt = `أنت محلل خدمة عملاء في "المصرية جروب" لقطع غيار تويوتا. حلل محادثة العميل مع الشات بوت وأرجع ملخصاً يساعد الموظف يفهم الموقف بسرعة قبل ما يرد.

نوع العميل: ${reqRow.is_dealer ? "تاجر جملة" : "عميل قطاعي"}
رقم تليفونه: ${reqRow.customer_phone || "غير متاح"}`;

    const userPrompt = `محادثة العميل:
${conversationText}

آخر رسالة مكتوبة في طلب التواصل: ${reqRow.message || "—"}

حلّل وأرجع ملخصاً منظماً.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "summarize_conversation",
            description: "Return a structured summary of the customer's request",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "ملخص في 2-3 أسطر بالعربية: إيه اللي عايزه العميل بالظبط" },
                parts_mentioned: {
                  type: "array",
                  items: { type: "string" },
                  description: "قائمة بأسماء/أكواد القطع أو الفئات اللي العميل ذكرها (لو مفيش، رجّع array فاضي)",
                },
                urgency: {
                  type: "string",
                  enum: ["urgent", "normal", "inquiry"],
                  description: "urgent=عاجل/مستعجل، normal=طلب عادي، inquiry=استفسار فقط",
                },
                intent: {
                  type: "string",
                  enum: ["price_quote", "availability", "complaint", "order_status", "technical_help", "general_inquiry", "other"],
                  description: "نية العميل الرئيسية",
                },
                suggested_action: {
                  type: "string",
                  description: "اقتراح في سطر واحد للموظف: إيه أحسن خطوة يبدأ بها",
                },
              },
              required: ["summary", "parts_mentioned", "urgency", "intent", "suggested_action"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "summarize_conversation" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد، حاول بعد دقيقة" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "تم استنفاد رصيد AI" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const summary = JSON.parse(toolCall.function.arguments);

    // Cache it
    await supabase
      .from("support_requests")
      .update({ context: { ...ctx, ai_summary: summary, ai_summary_at: new Date().toISOString() } })
      .eq("id", request_id);

    return new Response(JSON.stringify({ summary, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-support-conversation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
