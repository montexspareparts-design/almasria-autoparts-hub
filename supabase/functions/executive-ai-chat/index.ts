import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `أنت مساعد تنفيذي ذكي لإدارة شركة "المصرية" لتوزيع قطع غيار وزيوت تويوتا في مصر.

قواعد إجبارية:
1. الرد دائماً بالعربية المصرية، عملي ومختصر، بدون مقدمات.
2. اعتمد فقط على البيانات المُمرّرة في CONTEXT (KPIs + التنبيهات + Churn). لا تخترع أرقاماً.
3. لو السؤال محتاج بيانات مش متوفرة في CONTEXT، قول صراحة: "البيانات غير كافية للإجابة بدقة" واقترح تقرير بديل.
4. لما تذكر أرقام، استخدم الأرقام من CONTEXT بالضبط.
5. لما تقترح إجراء، يكون محدد ومُرقّم (1، 2، 3) وفيه اسم العميل/الصنف لو متاح.
6. لو السؤال عام جداً، رد بنقاط قابلة للتنفيذ بكرة الصبح.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { messages = [] } = await req.json().catch(() => ({}));
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages مطلوبة" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull fresh context
    const [{ data: kpis }, { data: alerts }, { data: churn }] = await Promise.all([
      supabase.rpc("get_executive_kpis"),
      supabase.rpc("get_executive_alerts"),
      supabase.rpc("get_customer_churn"),
    ]);

    const context = {
      kpis,
      alerts: (alerts as any)?.alerts ?? [],
      churn: ((churn as any)?.customers ?? []).slice(0, 20),
    };

    const contextMsg = `CONTEXT (بيانات لحظية من قاعدة بيانات الشركة):\n${JSON.stringify(context, null, 2)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "system", content: contextMsg },
          ...messages,
        ],
      }),
    });

    if (aiResp.status === 429) return new Response(JSON.stringify({ error: "تم تجاوز حد الاستخدام، حاول بعد دقيقة" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiResp.status === 402) return new Response(JSON.stringify({ error: "الرصيد نفد — أضف رصيد من إعدادات Lovable AI" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "خطأ في خدمة الشات" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResp.json();
    const reply = aiData.choices?.[0]?.message?.content ?? "لم يتم استلام رد";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
