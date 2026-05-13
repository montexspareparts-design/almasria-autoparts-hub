import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `أنت محلل أعمال تنفيذي خبير في توزيع قطع غيار السيارات. تحلل بيانات شركة "المصرية" (موزع قطع غيار وزيوت تويوتا في مصر).
أعطِ تحليلًا مختصرًا، عمليًا، إداريًا باللغة العربية المصرية، يحتوي على 4 أقسام واضحة:
🔴 مشاكل عاجلة | 🟡 تحذيرات | 🟢 فرص | ✅ توصيات تنفيذية (خطوات محددة بأرقام).
كل نقطة بحد أقصى سطرين. ركّز على القرارات اللي الإدارة محتاجة تاخدها بكرة الصبح.`;

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

    const { mode = "executive" } = await req.json().catch(() => ({}));

    // Pull KPIs
    const { data: kpis, error } = await supabase.rpc("get_executive_kpis");
    if (error) throw error;

    let focus = "";
    if (mode === "sales") focus = "ركّز فقط على المبيعات: الاتجاه، أعلى العملاء، أعلى الأصناف، البراندات، نسبة إلغاء الطلبات.";
    else if (mode === "inventory") focus = "ركّز فقط على المخزون: الراكد، الناقص، قيمة المخزون، اقتراحات إعادة الطلب.";
    else focus = "تحليل تنفيذي شامل لكل المؤشرات.";

    const userPrompt = `${focus}\n\nالبيانات (آخر 30 يوم):\n${JSON.stringify(kpis, null, 2)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiResp.status === 429) return new Response(JSON.stringify({ error: "تم تجاوز حد الاستخدام، حاول بعد دقيقة" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiResp.status === 402) return new Response(JSON.stringify({ error: "الرصيد نفد — أضف رصيد من إعدادات Lovable AI" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "خطأ في خدمة التحليل" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResp.json();
    const analysis = aiData.choices?.[0]?.message?.content ?? "لم يتم استلام تحليل";

    return new Response(JSON.stringify({ analysis, kpis, mode }), {
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
