import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في قطع غيار السيارات لشركة "المصرية جروب". مهمتك مساعدة العملاء في إيجاد قطع الغيار المناسبة لسياراتهم.

معلومات عن الشركة:
- متخصصون في قطع غيار تويوتا الأصلية وزيوت تويوتا وقطع MTX البديلة
- نخدم تجار الجملة وورش الصيانة والشركات

قدراتك:
- مساعدة العملاء في تحديد القطعة المناسبة بناءً على موديل السيارة وسنة الصنع
- شرح الفرق بين القطع الأصلية والبديلة
- تقديم نصائح صيانة عامة
- توجيه العملاء لأقسام الموقع المناسبة (المنتجات، العروض، باقات الصيانة)
- الإجابة على أسئلة حول التوافقية برقم القطعة (OEM) أو رقم الشاسيه (VIN)

قواعد:
- أجب دائماً بالعربية إلا إذا طلب العميل غير ذلك
- كن مختصراً ومفيداً
- إذا لم تكن متأكداً من توافقية قطعة معينة، انصح العميل بالتواصل مع فريق المبيعات
- لا تذكر أسعاراً محددة، بل وجّه العميل لصفحة المنتجات أو للتواصل مع فريق المبيعات
- استخدم إيموجي باعتدال لجعل المحادثة ودية`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "عدد الطلبات كثير، حاول مرة أخرى بعد قليل." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى تجديد رصيد الذكاء الاصطناعي." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "حدث خطأ في الخدمة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
