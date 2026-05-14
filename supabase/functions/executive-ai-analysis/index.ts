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

    let kpis: any = null;
    let focus = "";

    if (mode === "recommendations") {
      // Pull financial intelligence + KPIs
      const [{ data: fin, error: e1 }, { data: kp, error: e2 }] = await Promise.all([
        supabase.rpc("get_financial_intelligence"),
        supabase.rpc("get_executive_kpis"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      kpis = { financial: fin, kpis: kp };
      focus = `أنت كبير المستشارين التنفيذيين. اقترح أهم 10 قرارات تنفيذية لهذا الأسبوع مرتبة حسب الأثر المالي المتوقع (بالجنيه).
لكل قرار اكتب: 
- العنوان (مختصر)
- السبب من البيانات (رقم محدد)
- الإجراء التنفيذي (خطوة عملية واحدة)
- الأثر المالي المتوقع (تقدير بالجنيه)
- الأولوية (🔴 عاجل / 🟡 مهم / 🟢 فرصة)
ممنوع النصائح العامة. كل توصية مبنية على رقم من الداتا.`;
    } else if (mode === "profit_advisor") {
      const { data: profit, error } = await supabase.rpc("get_real_profit_intelligence", { period_days: 90 });
      if (error) throw error;
      kpis = profit;
      focus = `أنت Chief Financial Advisor. حلل بيانات الربحية الصافية الحقيقية (Net Profit بعد COGS و الخصومات و الكوبونات و المرتجعات و الشحن) واخرج بـ:
🟢 أفضل 5 عملاء ربحية (بالاسم + صافي الربح + الهامش %)
🔴 أسوأ 5 عملاء ربحية (بالاسم + صافي الربح أو الخسارة)
📈 أصناف يجب رفع سعرها (هامش سلبي أو أقل من 5% — بالـ SKU والاسم)
🛑 أصناف يجب وقفها (خسارة مستمرة بدون قيمة استراتيجية)
💸 خصومات قاتلة (المنتجات اللي الخصم بياكل كل الربح)
🚀 فرص زيادة الربحية (أرقام محددة بالجنيه)
✅ 5 قرارات تنفيذية بالأولوية والأثر المالي المتوقع
ملاحظة: لو cost_coverage.coverage_pct < 50%، نوّه إن النتيجة مبدئية وفي حاجة لرفع فواتير شراء أكتر.
ممنوع التعميم. كل توصية مبنية على رقم من الداتا.`;
    } else if (mode === "funnel") {
      const { data: fn, error } = await supabase.rpc("get_funnel_analysis");
      if (error) throw error;
      kpis = fn;
      focus = `أنت محلل قمع مبيعات. حلل البيانات أدناه واخرج بـ:
🔴 أكبر تسريب في القمع (مع رقم)
🟡 ٣ عملاء/براندات/فروع تحتاج تدخل عاجل (بالاسم والرقم)
🟢 ٣ فرص فورية لإغلاق صفقات (عروض كبيرة معلقة بالاسم والقيمة)
✅ ٥ توصيات تنفيذية (لمن، الإجراء، الأثر بالجنيه)
ممنوع التعميم. لو الموظف غير متاح في الداتا قل صراحة "غير متاح".`;
    } else {
      const { data: kp, error } = await supabase.rpc("get_executive_kpis");
      if (error) throw error;
      kpis = kp;
      if (mode === "sales") focus = "ركّز فقط على المبيعات: الاتجاه، أعلى العملاء، أعلى الأصناف، البراندات، نسبة إلغاء الطلبات.";
      else if (mode === "inventory") focus = "ركّز فقط على المخزون: الراكد، الناقص، قيمة المخزون، اقتراحات إعادة الطلب.";
      else focus = "تحليل تنفيذي شامل لكل المؤشرات.";
    }

    const userPrompt = `${focus}\n\nالبيانات:\n${JSON.stringify(kpis, null, 2)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        temperature: 0.25,
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
